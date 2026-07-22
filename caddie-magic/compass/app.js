// Caddie Magic v0.5.1 — player-owned Compass with four Cardinal Club rooms.

import { supabase } from "../../shared/supabase.js";
import { requireCaddieMagicAccess } from "../../shared/caddie-magic-access.js?v=0.5.1";
import { getMyCaddieMagicProfile, getMyActiveCompass, saveMyCompass } from "../../shared/caddie-magic-compass.js?v=0.5.1";
import { getMyUpcomingGolfEvents, saveUpcomingGolfEvent, deleteUpcomingGolfEvent } from "../../shared/caddie-magic-schedule.js?v=0.5.1";
import { moonLabelForDate } from "../../shared/caddie-magic-moon-calendar.js?v=0.5.1";

const $ = (id) => document.getElementById(id);
let playerProfile = null;
let compass = null;
let upcomingGolf = [];
let scheduleAvailable = true;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(node, text = "", error = false) {
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("error", Boolean(error));
}

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function titleCase(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function playerName() {
  const name = `${playerProfile?.first_name || ""} ${playerProfile?.last_name || ""}`.trim();
  return name || playerProfile?.email || "Player";
}

function renderCompass() {
  const setup = $("compassSetupCard");
  const map = $("compassMapCard");
  setup?.classList.remove("hidden");
  if (!compass) {
    map?.classList.add("hidden");
    $("compassStatus").textContent = "Not Set";
    $("saveCompassButton").textContent = "Save My Caddie Compass";
    return;
  }

  map?.classList.remove("hidden");
  $("compassOwnerName").textContent = `${playerName()}'s Compass`;
  $("northClubDisplay").textContent = compass.north_club;
  $("eastClubDisplay").textContent = compass.east_club;
  $("westClubDisplay").textContent = compass.west_club;
  $("southClubDisplay").textContent = compass.south_club;
  $("staffClubDisplay").textContent = compass.staff_club || "Putter";
  $("northClub").value = compass.north_club || "";
  $("eastClub").value = compass.east_club || "";
  $("westClub").value = compass.west_club || "";
  $("southClub").value = compass.south_club || "";
  $("compassStatus").textContent = `Active · V${compass.version || 1}`;
  $("compassMapStatus").textContent = "Four Rooms Open";
  $("saveCompassButton").disabled = false;
  $("saveCompassButton").textContent = "Update My Caddie Compass";
  $("compassSealNote").textContent = "Your Compass remains editable. Each personalized club opens a private Cardinal Club Room with Only Mine and Everyone’s views.";
}

function eventTypeLabel(value) {
  return { round: "Round", tournament: "Tournament", golf_trip: "Golf Trip" }[value] || titleCase(value);
}

function eventDates(event) {
  return event.date_start === event.date_end
    ? formatDate(event.date_start)
    : `${formatDate(event.date_start)} – ${formatDate(event.date_end)}`;
}

function forecastMarkup(forecast) {
  const rows = Array.isArray(forecast) ? forecast : [];
  return rows.map((day) => `
    <li>
      <span>${escapeHtml(formatDate(day.date))}</span>
      <strong>${escapeHtml(day.moon_emoji || "◐")} Day ${escapeHtml(day.moon_day || "—")} · ${escapeHtml(moonLabelForDate(day.date, day.moon_phase))}</strong>
    </li>
  `).join("");
}

function golfEventMarkup(event) {
  const place = [event.course, event.location].filter(Boolean).join(" · ");
  return `
    <article class="golf-event-card" data-golf-event="${escapeHtml(event.id)}">
      <div class="golf-event-heading">
        <div>
          <div class="golf-event-meta">
            <span>${escapeHtml(eventTypeLabel(event.event_type))}</span>
            <span>${escapeHtml(eventDates(event))}</span>
          </div>
          <h3>${escapeHtml(event.title)}</h3>
          ${place ? `<p class="golf-event-place">${escapeHtml(place)}</p>` : ""}
        </div>
        <button class="golf-event-remove" type="button" data-delete-golf-event="${escapeHtml(event.id)}">Remove</button>
      </div>
      ${event.notes ? `<p class="golf-event-notes">${escapeHtml(event.notes)}</p>` : ""}
      <ol class="golf-moon-forecast">${forecastMarkup(event.moon_forecast)}</ol>
    </article>
  `;
}

function renderUpcomingGolf() {
  const list = $("golfScheduleList");
  $("upcomingGolfCount").textContent = `${upcomingGolf.length} upcoming`;
  if (!scheduleAvailable) {
    list.innerHTML = `<div class="cm-empty">Upcoming Golf requires migration 043.</div>`;
    return;
  }
  list.innerHTML = upcomingGolf.length
    ? upcomingGolf.map(golfEventMarkup).join("")
    : `<div class="cm-empty">No upcoming golf has been added yet.</div>`;

  document.querySelectorAll("[data-delete-golf-event]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Remove this upcoming golf event?")) return;
      button.disabled = true;
      setMessage($("golfScheduleMessage"), "Removing upcoming golf...");
      try {
        await deleteUpcomingGolfEvent(button.dataset.deleteGolfEvent);
        upcomingGolf = await getMyUpcomingGolfEvents();
        renderUpcomingGolf();
        setMessage($("golfScheduleMessage"), "Upcoming golf removed.");
      } catch (error) {
        button.disabled = false;
        setMessage($("golfScheduleMessage"), error?.message || "The event could not be removed.", true);
      }
    });
  });
}

async function loadUpcomingGolf() {
  try {
    upcomingGolf = await getMyUpcomingGolfEvents();
    scheduleAvailable = true;
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("caddie_magic_upcoming_golf_events") || message.includes("schema cache")) {
      upcomingGolf = [];
      scheduleAvailable = false;
      return;
    }
    throw error;
  }
}

async function handleCompassSave(event) {
  event.preventDefault();
  const button = $("saveCompassButton");
  button.disabled = true;
  setMessage($("compassFormMessage"), "Saving your four Cardinal Clubs...");
  try {
    compass = await saveMyCompass({
      northClub: $("northClub").value,
      eastClub: $("eastClub").value,
      westClub: $("westClub").value,
      southClub: $("southClub").value,
    });
    renderCompass();
    setMessage($("compassFormMessage"), "Your Caddie Compass has been recorded. Open any Cardinal Club to study its phase.");
  } catch (error) {
    setMessage($("compassFormMessage"), error?.message || "Your Compass could not be saved.", true);
  } finally {
    button.disabled = false;
  }
}

async function handleGolfScheduleSubmit(event) {
  event.preventDefault();
  const start = $("golfEventStart").value;
  const end = $("golfEventEnd").value || start;
  setMessage($("golfScheduleMessage"), "Mapping the moon across your upcoming golf...");
  try {
    await saveUpcomingGolfEvent({
      eventType: $("golfEventType").value,
      title: $("golfEventTitle").value,
      dateStart: start,
      dateEnd: end,
      course: $("golfEventCourse").value,
      location: $("golfEventLocation").value,
      notes: $("golfEventNotes").value,
    });
    event.currentTarget.reset();
    $("golfEventType").value = "round";
    $("golfEventStart").value = todayISO();
    $("golfEventStart").min = todayISO();
    $("golfEventEnd").min = todayISO();
    upcomingGolf = await getMyUpcomingGolfEvents();
    renderUpcomingGolf();
    setMessage($("golfScheduleMessage"), "Upcoming golf added with a moon forecast for every day.");
  } catch (error) {
    setMessage($("golfScheduleMessage"), error?.message || "The upcoming golf event could not be saved.", true);
  }
}

function syncScheduleEndMinimum() {
  const start = $("golfEventStart").value || todayISO();
  $("golfEventEnd").min = start;
  if ($("golfEventEnd").value && $("golfEventEnd").value < start) $("golfEventEnd").value = start;
}

async function loadPage() {
  try {
    await requireCaddieMagicAccess();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw new Error("Sign in through Caddie Magic before opening your Caddie Compass.");
    playerProfile = await getMyCaddieMagicProfile();
    if (!playerProfile) throw new Error("Create your Player Profile before setting your Caddie Compass.");
    await Promise.all([
      (async () => { compass = await getMyActiveCompass(); })(),
      loadUpcomingGolf(),
    ]);
    $("golfEventStart").value = todayISO();
    $("golfEventStart").min = todayISO();
    $("golfEventEnd").min = todayISO();
    $("compassLoadingCard").classList.add("hidden");
    $("compassPage").classList.remove("hidden");
    renderCompass();
    renderUpcomingGolf();
  } catch (error) {
    setMessage($("compassPageMessage"), error?.message || "The Caddie Compass could not open.", true);
  }
}

$("compassForm")?.addEventListener("submit", handleCompassSave);
$("golfScheduleForm")?.addEventListener("submit", handleGolfScheduleSubmit);
$("golfEventStart")?.addEventListener("change", syncScheduleEndMinimum);
loadPage();
