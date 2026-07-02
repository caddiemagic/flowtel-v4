import { signInWithEmail, signUpWithEmail } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js";
import { createStay } from "../shared/flowtel.js";

const lobbyScene = document.getElementById("lobbyScene");
const preparingScene = document.getElementById("preparingScene");
const suiteScene = document.getElementById("suiteScene");
const authPanel = document.getElementById("authPanel");
const checkinForm = document.getElementById("checkinForm");
const message = document.getElementById("message");

let currentProfile = null;

function setMessage(text) {
  message.textContent = text || "";
}

function setProgress(step) {
  document.querySelectorAll(".progress-ribbon span").forEach((item, index) => {
    item.classList.toggle("active", index < step);
  });
}

function showScene(name) {
  [lobbyScene, preparingScene, suiteScene].forEach((scene) => {
    scene.classList.remove("active");
  });

  if (name === "lobby") {
    lobbyScene.classList.add("active");
    setProgress(1);
  }

  if (name === "preparing") {
    preparingScene.classList.add("active");
    setProgress(2);
  }

  if (name === "suite") {
    suiteScene.classList.add("active");
    setProgress(3);
  }
}

function showCheckIn() {
  authPanel.classList.add("hidden");
  checkinForm.classList.remove("hidden");

  const name = currentProfile?.first_name || "guest";
  document.getElementById("welcomeLine").textContent = `Welcome back, ${name}.`;
}

function renderSuite(stay) {
  const name = currentProfile?.first_name || "guest";

  document.getElementById("suiteWelcome").textContent =
    `Welcome back, ${name}. Room ${stay.cycle_day_claimed} is ready for you.`;

  const connector =
    stay.inner_season === stay.feels_like_inner_season ? "and" : "but";

  document.getElementById("suiteSubline").textContent =
    `You're on Day ${stay.cycle_day_claimed} ${connector} today feels like ${stay.feels_like_inner_season}.`;

  document.getElementById("suiteCycleDay").textContent =
    `Day ${stay.cycle_day_claimed}`;

  document.getElementById("suiteSeason").textContent =
    stay.inner_season || "Not recorded";

  document.getElementById("suiteFeelsLike").textContent =
    stay.feels_like_inner_season || "Not recorded";

  document.getElementById("suiteMoon").textContent =
    `${stay.moon_phase || "Moon phase"} · ${stay.moon_inner_season || ""}`;

  if (stay.witness_note) {
    document.getElementById("witnessNote").classList.remove("hidden");
    document.getElementById("witnessText").textContent = stay.witness_note;
  } else {
    document.getElementById("witnessNote").classList.add("hidden");
    document.getElementById("witnessText").textContent = "";
  }
}

async function handleCreateGuest() {
  try {
    setMessage("Creating your guest key...");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const firstName = document.getElementById("firstName").value.trim();

    if (!email || !password || !firstName) {
      setMessage("Add email, password, and first name.");
      return;
    }

    await signUpWithEmail(email, password);
    currentProfile = await ensureProfile({ firstName });

    setMessage("");
    showCheckIn();
  } catch (error) {
    setMessage(error.message);
  }
}

async function handleSignIn() {
  try {
    setMessage("Opening your guest key...");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      setMessage("Add your email and password.");
      return;
    }

    await signInWithEmail(email, password);

    currentProfile = await getCurrentProfile();

    if (!currentProfile) {
      currentProfile = await ensureProfile({});
    }

    setMessage("");
    showCheckIn();
  } catch (error) {
    setMessage(error.message);
  }
}

async function handleCheckIn() {
  try {
    const cycleDay = Number(document.getElementById("cycleDay").value);
    const feelsLike = document.getElementById("feelsLike").value;

    if (!(cycleDay >= 1 && cycleDay <= 40)) {
      setMessage("Enter a cycle day between 1 and 40.");
      return;
    }

    if (!feelsLike) {
      setMessage("Choose what today feels like.");
      return;
    }

    setMessage("");
    showScene("preparing");

    const stay = await createStay({ cycleDay, feelsLike });

    setTimeout(() => {
      renderSuite(stay);
      showScene("suite");
    }, 850);
  } catch (error) {
    showScene("lobby");
    setMessage(error.message);
  }
}

document.getElementById("createGuestButton").addEventListener("click", handleCreateGuest);
document.getElementById("signInButton").addEventListener("click", handleSignIn);
document.getElementById("checkInButton").addEventListener("click", handleCheckIn);
document.getElementById("returnLobbyButton").addEventListener("click", () => showScene("lobby"));
