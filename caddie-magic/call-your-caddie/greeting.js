// User-initiated answering-machine greeting. Independent of auth/recorder boot.
const audio = document.getElementById("greetingAudio");
const button = document.getElementById("callCaddieButton");
const machine = document.getElementById("caddie-line");
const status = document.getElementById("greetingStatus");
const playback = document.getElementById("greetingPlayback");
const recorder = document.getElementById("leave-message");
const skip = document.getElementById("skipGreeting");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let opening = false;

function revealRecorder() {
  audio.pause();
  recorder.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
  recorder.focus({ preventScroll: true });
}

function audioFailed() {
  opening = false;
  button.disabled = false;
  machine.classList.remove("is-playing");
  button.textContent = "Try Calling Again";
  status.textContent = "The greeting could not play. Try again, or leave your message below.";
}

button.addEventListener("click", async () => {
  if (opening) return;
  // Prevent the greeting from playing into a live recording or caller preview.
  if (document.getElementById("recorderPanel")?.classList.contains("is-recording")) {
    status.textContent = "Finish recording your message before calling again.";
    return;
  }
  if (!audio.paused && !audio.ended) { audio.pause(); return; }
  document.getElementById("previewAudio")?.pause();
  if (audio.ended) audio.currentTime = 0;
  playback.classList.remove("hidden");
  opening = true;
  button.disabled = true;
  status.textContent = "CONNECTING TO YOUR CADDIE…";
  try {
    // Playback starts directly from the click, including on mobile Safari.
    await audio.play();
  } catch (_) { audioFailed(); }
  finally { opening = false; button.disabled = false; }
});

audio.addEventListener("play", () => {
  if (document.getElementById("recorderPanel")?.classList.contains("is-recording")) audio.pause();
});
audio.addEventListener("playing", () => {
  machine.classList.add("is-playing");
  button.textContent = "Pause the Call";
  status.textContent = "YOUR CADDIE IS ON THE LINE";
});
audio.addEventListener("pause", () => {
  machine.classList.remove("is-playing");
  if (!audio.ended) {
    button.textContent = "Resume the Call";
    status.textContent = "YOUR CALL IS PAUSED";
  }
});
audio.addEventListener("ended", () => {
  machine.classList.remove("is-playing");
  button.textContent = "Call Again";
  status.textContent = "YOUR TURN. LEAVE ME A MESSAGE.";
  skip.textContent = "Leave your message";
  revealRecorder();
});
audio.addEventListener("error", audioFailed);
skip.addEventListener("click", (event) => { event.preventDefault(); revealRecorder(); });
// Pause the greeting if the caller chooses to listen to their own voice note.
document.getElementById("previewAudio")?.addEventListener("play", () => audio.pause());
window.addEventListener("pagehide", () => audio.pause());
