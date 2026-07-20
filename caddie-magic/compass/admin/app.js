// Caddie Magic v0.4.4 — Owner Compass + Direct Message Reply

import { supabase } from "../../../shared/supabase.js";
import { requireCaddieMagicAccess } from "../../../shared/caddie-magic-access.js?v=0.4.4";
import {
  listCompassPlayers,
  getCompassForPlayer,
  getCompassAssignments,
  getCompassDispatches,
  createCompassAssignment,
  sendCompassDispatch,
  adminUpdateCompassAssignment,
} from "../../../shared/caddie-magic-compass.js?v=0.4.4";
import { listUpcomingGolfEvents } from "../../../shared/caddie-magic-schedule.js?v=0.4.4";
import { moonLabelForDate, normalizeCaddieMoonPhase } from "../../../shared/caddie-magic-moon-calendar.js?v=0.4.4";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const playerProfileId = params.get("player");

let playerSummary = null;
let compass = null;
let assignments = [];
let dispatches = [];
let upcomingGolf = [];

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

function addDaysISO(iso, days) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function titleCase(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortMoonPhase(value = "") {
  return normalizeCaddieMoonPhase(value);
}

function clubForDirection(direction) {
  if (!compass) return "Compass Not Set";
  return {
    north: compass.north_club,
    east: compass.east_club,
    west: compass.west_club,
    south: compass.south_club,
    center: compass.staff_club || "Putter",
    general: "Whole Compass",
  }[direction] || "Whole Compass";
}

function renderCompass() {
  $("adminPlayerName").textContent = playerSummary.player_name;
  $("adminCompassTitle").textContent = `${playerSummary.player_name}'s Five-Club Map`;
  $("adminCompassStatus").textContent = `${titleCase(compass.status)} · V${compass.version}`;
  $("adminNorthClub").textContent = compass.north_club;
  $("adminEastClub").textContent = compass.east_club;
  $("adminWestClub").textContent = compass.west_club;
  $("adminSouthClub").textContent = compass.south_club;
  $("adminStaffClub").textContent = compass.staff_club || "Putter";
  updateClubPreview();
}

function assignmentMarkup(assignment) {
  const directionLabel = assignment.direction === "general"
    ? "Whole Compass"
    : `${titleCase(assignment.direction)} · ${assignment.assigned_club || clubForDirection(assignment.direction)}`;
  const due = assignment.due_date ? `Due ${formatDate(assignment.due_date)}` : "No fixed due date";
  return `
    <article class="admin-assignment-card ${assignment.status === "completed" ? "is-completed" : ""}">
      <div class="admin-assignment-top">
        <div>
          <div class="admin-assignment-meta">
            ${assignment.moon_phase ? `<span>${escapeHtml(assignment.moon_phase)}</span>` : ""}
            <span>${escapeHtml(directionLabel)}</span>
            <span>${escapeHtml(due)}</span>
          </div>
          <h3>${escapeHtml(assignment.title)}</h3>
        </div>
        <span class="admin-assignment-status">${escapeHtml(titleCase(assignment.status))}</span>
      </div>
      <p>${escapeHtml(assignment.instructions)}</p>
      ${assignment.player_response ? `
        <div class="admin-player-response">
          <strong>Player Reflection</strong>
          <p>${escapeHtml(assignment.player_response)}</p>
        </div>
      ` : ""}
      ${assignment.status !== "completed" ? `
        <div class="admin-assignment-actions">
          <button class="cm-button secondary" type="button" data-admin-complete="${escapeHtml(assignment.id)}">Mark Complete</button>
          <button class="cm-button secondary" type="button" data-admin-message-title="${escapeHtml(assignment.title)}">Message Player</button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderAssignments() {
  $("adminAssignments").innerHTML = assignments.length
    ? assignments.map(assignmentMarkup).join("")
    : `<div class="cm-empty">No assignments have been created for this compass yet.</div>`;

  document.querySelectorAll("[data-admin-complete]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await adminUpdateCompassAssignment(button.dataset.adminComplete, { status: "completed" });
        assignments = await getCompassAssignments(playerProfileId);
        renderAssignments();
      } catch (error) {
        console.error(error);
        setMessage($("adminPageMessage"), error?.message || "The assignment could not be completed.", true);
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-admin-message-title]").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.dataset.adminMessageTitle || "Assignment";
      $("adminDispatchMessage").value = `${title}: `;
      $("adminDispatchMessage").focus();
      $("adminDispatchForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function assignmentTitle(id) {
  return assignments.find((item) => String(item.id) === String(id))?.title || "Compass Assignment";
}

function renderDispatches() {
  const thread = $("adminDispatchThread");
  const latestPlayer = [...dispatches].reverse().find((item) => item.sender_role === "player");
  const latestCaddie = [...dispatches].reverse().find((item) => item.sender_role === "caddie");
  const waiting = Boolean(latestPlayer) && (!latestCaddie || new Date(latestPlayer.created_at) > new Date(latestCaddie.created_at));
  $("adminMessageAlert")?.classList.toggle("hidden", !waiting);
  thread.innerHTML = dispatches.length
    ? dispatches.map((dispatch) => `
      <article class="dispatch-bubble ${dispatch.sender_role === "caddie" ? "is-player" : "is-caddie"}">
        <span>${dispatch.sender_role === "caddie" ? "You · Caddie" : playerSummary.player_name}${dispatch.assignment_id ? ` · ${escapeHtml(assignmentTitle(dispatch.assignment_id))}` : ""}</span>
        <p>${escapeHtml(dispatch.message_body)}</p>
        <small>${escapeHtml(formatDateTime(dispatch.created_at))}</small>
      </article>
    `).join("")
    : `<div class="cm-empty">No private messages in The Caddie Shack yet.</div>`;
  thread.scrollTop = thread.scrollHeight;
}

function eventTypeLabel(value) {
  return { round: "Round", tournament: "Tournament", golf_trip: "Golf Trip" }[value] || titleCase(value);
}

function eventDates(event) {
  return event.date_start === event.date_end
    ? formatDate(event.date_start)
    : `${formatDate(event.date_start)} – ${formatDate(event.date_end)}`;
}

function renderUpcomingGolf() {
  $("adminUpcomingGolfCount").textContent = `${upcomingGolf.length} upcoming`;
  const list = $("adminUpcomingGolfList");
  if (!upcomingGolf.length) {
    list.innerHTML = `<div class="cm-empty">This player has no upcoming golf on the calendar.</div>`;
    return;
  }
  list.innerHTML = upcomingGolf.map((event) => {
    const place = [event.course, event.location].filter(Boolean).join(" · ");
    const forecast = Array.isArray(event.moon_forecast) ? event.moon_forecast : [];
    return `
      <article class="admin-golf-event">
        <div class="golf-event-meta">
          <span>${escapeHtml(eventTypeLabel(event.event_type))}</span>
          <span>${escapeHtml(eventDates(event))}</span>
        </div>
        <h3>${escapeHtml(event.event_title || event.title)}</h3>
        ${place ? `<p>${escapeHtml(place)}</p>` : ""}
        ${event.notes ? `<p>${escapeHtml(event.notes)}</p>` : ""}
        <div class="admin-golf-forecast">
          ${forecast.map((day) => `<span>${escapeHtml(formatDate(day.date))} · Day ${escapeHtml(day.moon_day || "—")} · ${escapeHtml(moonLabelForDate(day.date, day.moon_phase))}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function updateClubPreview() {
  $("assignedClubPreview").textContent = clubForDirection($("assignmentDirection").value);
}

async function handleAssignmentSubmit(event) {
  event.preventDefault();
  setMessage($("assignmentFormMessage"), "Sending the assignment...");
  try {
    await createCompassAssignment({
      playerProfileId,
      title: $("assignmentTitle").value,
      instructions: $("assignmentInstructions").value,
      moonPhase: $("assignmentMoonPhase").value,
      direction: $("assignmentDirection").value,
      dueDate: $("assignmentDueDate").value || null,
    });
    $("assignmentForm").reset();
    $("assignmentDirection").value = "general";
    updateClubPreview();
    [compass, assignments] = await Promise.all([
      getCompassForPlayer(playerProfileId),
      getCompassAssignments(playerProfileId),
    ]);
    renderCompass();
    renderAssignments();
    setMessage($("assignmentFormMessage"), "Assignment sent. The player’s compass is now sealed.");
  } catch (error) {
    console.error(error);
    setMessage($("assignmentFormMessage"), error?.message || "The assignment could not be sent.", true);
  }
}

async function handleDispatchSubmit(event) {
  event.preventDefault();
  setMessage($("adminDispatchStatus"), "Sending your message...");
  try {
    await sendCompassDispatch(playerProfileId, $("adminDispatchMessage").value, null);
    $("adminDispatchMessage").value = "";
    dispatches = await getCompassDispatches(playerProfileId);
    renderDispatches();
    setMessage($("adminDispatchStatus"), "Message sent.");
  } catch (error) {
    console.error(error);
    setMessage($("adminDispatchStatus"), error?.message || "The message could not be sent.", true);
  }
}

function openRequestedAdminSection() {
  if (window.location.hash !== "#messages") return;
  window.setTimeout(() => {
    $("messages")?.scrollIntoView({ behavior: "smooth", block: "start" });
    $("adminDispatchMessage")?.focus();
  }, 120);
}

async function init() {
  await requireCaddieMagicAccess();
  try {
    if (!playerProfileId) throw new Error("Choose a Caddie Compass player from the Concierge Desk.");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw new Error("Enter through the Concierge Desk before opening Caddie Compass administration.");

    const players = await listCompassPlayers();
    playerSummary = players.find((item) => String(item.player_profile_id) === String(playerProfileId));
    if (!playerSummary) throw new Error("This player’s active Caddie Compass could not be found.");

    const [loadedCompass, loadedAssignments, loadedDispatches, allUpcoming] = await Promise.all([
      getCompassForPlayer(playerProfileId),
      getCompassAssignments(playerProfileId),
      getCompassDispatches(playerProfileId),
      listUpcomingGolfEvents(todayISO(), addDaysISO(todayISO(), 365)).catch((error) => {
        console.warn("Upcoming Golf is waiting for migration 043.", error);
        return [];
      }),
    ]);
    compass = loadedCompass;
    assignments = loadedAssignments;
    dispatches = loadedDispatches;
    upcomingGolf = allUpcoming.filter((event) => String(event.player_profile_id) === String(playerProfileId));
    if (!compass) throw new Error("This player has not saved a Caddie Compass yet.");

    $("adminLoadingCard").classList.add("hidden");
    $("adminPage").classList.remove("hidden");
    renderCompass();
    renderUpcomingGolf();
    renderAssignments();
    renderDispatches();
    openRequestedAdminSection();
  } catch (error) {
    console.error(error);
    setMessage($("adminPageMessage"), error?.message || "Caddie Compass administration could not open.", true);
  }
}

$("assignmentDirection")?.addEventListener("change", updateClubPreview);
$("assignmentForm")?.addEventListener("submit", handleAssignmentSubmit);
$("adminDispatchForm")?.addEventListener("submit", handleDispatchSubmit);
init();
