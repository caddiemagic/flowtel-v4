import { signInWithEmail } from "../shared/auth.js";
import { getCurrentProfile } from "../shared/profiles.js";
import { getFrontDeskStays, witnessStay } from "../shared/flowtel.js";

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const queue = document.getElementById("arrivalQueue");
const managerMessage = document.getElementById("managerMessage");

function guestName(stay) {
  if (!stay.profiles) return "Guest";

  return (
    [stay.profiles.first_name, stay.profiles.last_name]
      .filter(Boolean)
      .join(" ") ||
    stay.profiles.email ||
    "Guest"
  );
}

function updateStats(stays) {
  document.getElementById("guestsInHouse").textContent = stays.length;

  document.getElementById("awaitingWelcome").textContent = stays.filter(
    (stay) => !stay.witnessed_at && stay.stay_status !== "checked_out"
  ).length;

  document.getElementById("witnessedToday").textContent = stays.filter(
    (stay) => stay.witnessed_at
  ).length;

  document.getElementById("checkedOut").textContent = stays.filter(
    (stay) => stay.stay_status === "checked_out"
  ).length;
}

function renderQueue(stays) {
  const awaiting = stays.filter(
    (stay) => !stay.witnessed_at && stay.stay_status !== "checked_out"
  );

  if (!awaiting.length) {
    queue.innerHTML = "<p>✨ No guests are currently awaiting welcome.</p>";
    return;
  }

  queue.innerHTML = awaiting
    .map(
      (stay) => `
        <article class="card">
          <h3>${guestName(stay)}</h3>
          <p><strong>Room ${stay.cycle_day_claimed}</strong></p>
          <p>${stay.inner_season || "Inner season not recorded"}</p>
          <p>Feels like: ${stay.feels_like_inner_season || "Not recorded"}</p>
          <p>Moon: ${stay.moon_phase || "Not recorded"}</p>
          <button data-id="${stay.id}">Open Door</button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const note = prompt("Leave a Concierge Card");

      await witnessStay(button.dataset.id, note || "");

      await loadDesk();
    });
  });
}

async function loadDesk() {
  const stays = await getFrontDeskStays();

  updateStats(stays);
  renderQueue(stays);
}

async function openDesk() {
  try {
    managerMessage.textContent = "Opening the Concierge Desk...";

    const email = document.getElementById("managerEmail").value.trim();
    const password = document.getElementById("managerPassword").value;

    if (!email || !password) {
      managerMessage.textContent = "Add email and password.";
      return;
    }

    await signInWithEmail(email, password);

    const profile = await getCurrentProfile();

    if (!profile || !["owner", "admin", "practitioner"].includes(profile.role)) {
      managerMessage.textContent = "This key does not open the Concierge Desk yet.";
      return;
    }

    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");

    await loadDesk();
  } catch (error) {
    managerMessage.textContent = error.message;
  }
}

document.getElementById("managerSignInButton").addEventListener("click", openDesk);
