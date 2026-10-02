import {
  CADDIE_MAILBOX_MAX_SECONDS,
  chooseMailboxRecorderMime,
  formatMailboxDuration,
  getMyMailboxPlayerSnapshot,
  submitCaddieMailboxMessage,
} from "../../shared/caddie-magic-mailbox.js?v=0.10.92.1";

const $ = (id) => document.getElementById(id);

const form = $("mailboxForm");
const loading = $("recorderLoading");
const callerName = $("callerName");
const handicap = $("handicap");
const mediaConsent = $("mediaConsent");
const anonymityRequested = $("anonymityRequested");
const startButton = $("startRecordingButton");
const stopButton = $("stopRecordingButton");
const againButton = $("recordAgainButton");
const sendButton = $("sendMessageButton");
const previewPanel = $("previewPanel");
const previewAudio = $("previewAudio");
const statePill = $("recorderState");
const recorderPanel = $("recorderPanel");
const timerNode = $("recordTimer");
const promptNode = $("recordPrompt");
const subcopyNode = $("recordSubcopy");
const messageNode = $("mailboxMessage");
const successPanel = $("successPanel");
const leaveAnotherButton = $("leaveAnotherButton");

let mediaRecorder = null;
let mediaStream = null;
let recordingChunks = [];
let recordingBlob = null;
let recordingUrl = "";
let recordingStartedAt = 0;
let recordingDurationSeconds = 0;
let timerHandle = null;
let stopReason = "manual";

function setMessage(text = "", error = false) {
  messageNode.textContent = text;
  messageNode.classList.toggle("error", Boolean(error));
}

function setState(label) {
  statePill.textContent = label;
  statePill.dataset.state = String(label || "").toLowerCase().replaceAll(" ", "-");
}

function clearTimer() {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = null;
}

function updateTimer() {
  const elapsed = recordingStartedAt
    ? Math.min(CADDIE_MAILBOX_MAX_SECONDS, Math.floor((Date.now() - recordingStartedAt) / 1000))
    : recordingDurationSeconds;
  timerNode.innerHTML = `${formatMailboxDuration(elapsed)} <span>/ 05:00</span>`;
  if (mediaRecorder?.state === "recording" && elapsed >= CADDIE_MAILBOX_MAX_SECONDS) {
    stopReason = "limit";
    mediaRecorder.stop();
  }
}

function stopTracks() {
  mediaStream?.getTracks?.().forEach((track) => track.stop());
  mediaStream = null;
}

function clearRecording() {
  clearTimer();
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = "";
  recordingBlob = null;
  recordingChunks = [];
  recordingDurationSeconds = 0;
  previewAudio.removeAttribute("src");
  previewAudio.load();
  previewPanel.classList.add("hidden");
  startButton.classList.remove("hidden");
  stopButton.classList.add("hidden");
  timerNode.innerHTML = `00:00 <span>/ 05:00</span>`;
  promptNode.textContent = "Ready when you are.";
  subcopyNode.textContent = "Ask one golf question. You have up to five minutes.";
  setState("READY");
  recorderPanel.classList.remove("is-recording");
  stopTracks();
}

function validateBeforeRecording() {
  const name = String(callerName.value || "").trim();
  const hcp = String(handicap.value || "").trim();
  if (!name) throw new Error("Enter your first name before recording.");
  if (!hcp) throw new Error("Enter your current handicap before recording.");
  if (!mediaConsent.checked) throw new Error("Consent to recording and media use before you begin.");
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot record a voice note. Try the current version of Safari, Chrome, Edge, or Firefox.");
  }
}

async function startRecording() {
  try {
    validateBeforeRecording();
    setMessage("Opening your microphone…");
    clearRecording();
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeType = chooseMailboxRecorderMime();
    mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
    recordingChunks = [];
    stopReason = "manual";

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) recordingChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      clearTimer();
      recordingDurationSeconds = Math.max(1, Math.min(
        CADDIE_MAILBOX_MAX_SECONDS,
        Math.round((Date.now() - recordingStartedAt) / 1000),
      ));
      const type = mediaRecorder?.mimeType || recordingChunks[0]?.type || mimeType || "audio/webm";
      recordingBlob = new Blob(recordingChunks, { type });
      recordingUrl = URL.createObjectURL(recordingBlob);
      previewAudio.src = recordingUrl;
      previewPanel.classList.remove("hidden");
      startButton.classList.add("hidden");
      stopButton.classList.add("hidden");
      setState("RECORDED");
      recorderPanel.classList.remove("is-recording");
      timerNode.innerHTML = `${formatMailboxDuration(recordingDurationSeconds)} <span>/ 05:00</span>`;
      promptNode.textContent = stopReason === "limit" ? "Five minutes. Message complete." : "Voice note recorded.";
      subcopyNode.textContent = "Listen back, record again, or send it to your Caddie.";
      setMessage("");
      stopTracks();
    }, { once: true });

    mediaRecorder.start(1000);
    recordingStartedAt = Date.now();
    setState("RECORDING");
    recorderPanel.classList.add("is-recording");
    promptNode.textContent = "The Caddie is listening.";
    subcopyNode.textContent = "Tell me what is happening in your golf game.";
    startButton.classList.add("hidden");
    stopButton.classList.remove("hidden");
    timerHandle = window.setInterval(updateTimer, 250);
    updateTimer();
    setMessage("");
  } catch (error) {
    stopTracks();
    setState("READY");
    recorderPanel.classList.remove("is-recording");
    setMessage(error?.message || "Your microphone could not be opened.", true);
  }
}

function stopRecording() {
  if (mediaRecorder?.state !== "recording") return;
  stopReason = "manual";
  mediaRecorder.stop();
  stopButton.disabled = true;
  window.setTimeout(() => { stopButton.disabled = false; }, 500);
}

async function sendMessage(event) {
  event.preventDefault();
  if (!recordingBlob) {
    setMessage("Record a voice note before sending it.", true);
    return;
  }
  try {
    validateBeforeRecording();
    sendButton.disabled = true;
    againButton.disabled = true;
    setState("SENDING");
    setMessage("Sending your private voice note to the Caddie Mailbox…");
    const messageId = crypto.randomUUID();
    await submitCaddieMailboxMessage({
      messageId,
      callerName: callerName.value,
      handicap: handicap.value,
      audioBlob: recordingBlob,
      durationSeconds: recordingDurationSeconds,
      consentRecording: mediaConsent.checked,
      consentPublication: mediaConsent.checked,
      anonymityRequested: anonymityRequested.checked,
    });
    clearRecording();
    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    setState("SENT");
    setMessage("");
  } catch (error) {
    setState("RECORDED");
    setMessage(error?.message || "Your voice note could not be sent. The recording is still here so you can try again.", true);
  } finally {
    sendButton.disabled = false;
    againButton.disabled = false;
  }
}

function leaveAnother() {
  successPanel.classList.add("hidden");
  form.classList.remove("hidden");
  mediaConsent.checked = false;
  anonymityRequested.checked = false;
  clearRecording();
  setMessage("");
  document.querySelector("#leave-message")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function boot() {
  try {
    const { profile } = await getMyMailboxPlayerSnapshot();
    if (profile.first_name) callerName.value = profile.first_name;
    if (profile.handicap_or_score_range) handicap.value = profile.handicap_or_score_range;
    loading.classList.add("hidden");
    form.classList.remove("hidden");
    setState("READY");
  } catch (error) {
    loading.textContent = error?.message || "Call Your Caddie could not open your Player Profile.";
    loading.classList.add("error");
    setState("LOCKED");
  }
}

startButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
againButton.addEventListener("click", clearRecording);
form.addEventListener("submit", sendMessage);
leaveAnotherButton.addEventListener("click", leaveAnother);
window.addEventListener("pagehide", () => { clearTimer(); stopTracks(); });

boot();
