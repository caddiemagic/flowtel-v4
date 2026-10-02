import {
  downloadCaddieMailboxAudio,
  formatMailboxDuration,
  listCaddieMailboxMessages,
  markCaddieMailboxListened,
  requireCaddieMailboxOwner,
  updateCaddieMailboxMessage,
} from "../../../shared/caddie-magic-mailbox.js?v=0.10.92.1";

const $ = (id) => document.getElementById(id);
const targetId = new URLSearchParams(location.search).get("message") || "";
let queue = [];
let current = null;
let currentUrl = "";
let firstListenMarked = false;

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function publicCallerName(message) {
  return message?.anonymity_requested ? "ANONYMOUS" : String(message?.caller_name || "Caller");
}
function setMessage(text = "", error = false) {
  $("stageMessage").textContent = text;
  $("stageMessage").classList.toggle("error", Boolean(error));
}
function setTime() {
  const audio = $("studioAudio");
  const currentSeconds = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const total = Number.isFinite(audio.duration) ? audio.duration : Number(current?.recording_duration_seconds) || 0;
  $("currentTime").textContent = formatMailboxDuration(currentSeconds);
  $("totalTime").textContent = formatMailboxDuration(total);
  $("progressFill").style.width = total ? `${Math.min(100, (currentSeconds / total) * 100)}%` : "0%";
}

function renderQueue() {
  $("queueCount").textContent = `${queue.length} MESSAGE${queue.length === 1 ? "" : "S"}`;
  $("queueList").innerHTML = queue.length ? queue.map((message) => `
    <button type="button" data-load-message="${message.message_id}">
      <span>${message.first_listened_at ? "LISTENED" : "UNHEARD"}</span>
      <strong>${escapeHtml(publicCallerName(message))}</strong>
      <small>HCP ${escapeHtml(message.handicap)} · ${formatMailboxDuration(message.recording_duration_seconds)}</small>
    </button>`).join("") : `<div class="queue-empty">The Show Queue is empty. Add a message with <strong>USE ON SHOW</strong> in the Caddie Mailbox.</div>`;
  document.querySelectorAll("[data-load-message]").forEach((button) => button.addEventListener("click", () => loadStage(button.dataset.loadMessage)));
}

function showQueue() {
  const audio = $("studioAudio");
  if (audio && !audio.paused) audio.pause();
  $("studioGate").classList.add("hidden");
  $("studioStage").classList.add("hidden");
  $("queuePanel").classList.remove("hidden");
  renderQueue();
}

async function loadStage(messageId) {
  const activeAudio = $("studioAudio");
  if (activeAudio && !activeAudio.paused) activeAudio.pause();
  const message = queue.find((row) => row.message_id === messageId);
  if (!message) return;
  $("queuePanel").classList.add("hidden");
  $("studioGate").classList.remove("hidden");
  $("studioStatus").textContent = "Loading the private voicemail without playing it…";
  try {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = "";
    current = message;
    firstListenMarked = Boolean(message.first_listened_at);
    const blob = await downloadCaddieMailboxAudio(message);
    currentUrl = URL.createObjectURL(blob);
    const audio = $("studioAudio");
    audio.src = currentUrl;
    audio.load();

    $("callerDisplay").textContent = publicCallerName(message).toUpperCase();
    $("handicapDisplay").textContent = `HCP ${message.handicap}`;
    $("durationDisplay").textContent = formatMailboxDuration(message.recording_duration_seconds);
    $("responseIdentity").textContent = `${publicCallerName(message).toUpperCase()} · HCP ${message.handicap}`;
    $("stageKicker").textContent = message.first_listened_at ? "MESSAGE FOR THE CADDIE" : "NEW · UNHEARD";
    $("playerPanel").classList.remove("hidden");
    $("responsePanel").classList.add("hidden");
    $("playButton").textContent = "▶ PLAY VOICEMAIL";
    $("playButton").disabled = false;
    $("markUsedButton").disabled = false;
    setTime();
    setMessage("");
    $("studioGate").classList.add("hidden");
    $("studioStage").classList.remove("hidden");
  } catch (error) {
    $("studioStatus").textContent = error?.message || "The private voicemail could not be loaded.";
  }
}

async function markFirstListen() {
  if (firstListenMarked || !current) return;
  firstListenMarked = true;
  try {
    await markCaddieMailboxListened(current.message_id);
    current.first_listened_at = new Date().toISOString();
    $("stageKicker").textContent = "MESSAGE FOR THE CADDIE";
  } catch (error) {
    firstListenMarked = false;
    setMessage(error?.message || "The first-listen state could not be saved.", true);
  }
}

async function togglePlay() {
  const audio = $("studioAudio");
  if (!current || !audio.src) return;
  if (audio.paused) {
    try {
      await audio.play();
      $("playButton").textContent = "Ⅱ PAUSE VOICEMAIL";
    } catch (error) {
      setMessage("Your browser blocked audio playback. Press Play again.", true);
    }
  } else {
    audio.pause();
    $("playButton").textContent = "▶ RESUME VOICEMAIL";
  }
}

function responseState() {
  $("playerPanel").classList.add("hidden");
  $("responsePanel").classList.remove("hidden");
  $("stageKicker").textContent = "CALL YOUR CADDIE";
  setMessage("");
}

async function markUsed() {
  if (!current) return;
  $("markUsedButton").disabled = true;
  try {
    await updateCaddieMailboxMessage(current.message_id, {
      status: "used",
      callerName: current.caller_name,
      adminNotes: current.admin_notes || "",
    });
    queue = queue.filter((row) => row.message_id !== current.message_id);
    setMessage("Marked USED.");
    $("markUsedButton").textContent = "✓ USED";
  } catch (error) {
    setMessage(error?.message || "The voicemail could not be marked used.", true);
    $("markUsedButton").disabled = false;
  }
}

async function nextMessage() {
  if (!queue.length) { showQueue(); return; }
  const currentIndex = current ? queue.findIndex((row) => row.message_id === current.message_id) : -1;
  const next = queue[currentIndex >= 0 && currentIndex + 1 < queue.length ? currentIndex + 1 : 0];
  if (next) await loadStage(next.message_id); else showQueue();
}

async function boot() {
  try {
    await requireCaddieMailboxOwner();
    queue = await listCaddieMailboxMessages("selected");
    if (targetId && queue.some((row) => row.message_id === targetId)) await loadStage(targetId);
    else showQueue();
  } catch (error) {
    $("studioStatus").textContent = error?.message || "Studio Mode could not be opened.";
  }
}

const audio = $("studioAudio");
audio.addEventListener("play", markFirstListen);
audio.addEventListener("timeupdate", setTime);
audio.addEventListener("loadedmetadata", setTime);
audio.addEventListener("pause", () => {
  if (!audio.ended && current) $("playButton").textContent = "▶ RESUME VOICEMAIL";
});
audio.addEventListener("ended", responseState);
$("playButton").addEventListener("click", togglePlay);
$("markUsedButton").addEventListener("click", markUsed);
$("nextButton").addEventListener("click", nextMessage);
$("backToQueueButton").addEventListener("click", showQueue);
window.addEventListener("pagehide", () => { if (currentUrl) URL.revokeObjectURL(currentUrl); });
boot();
