// Caddie Magic v0.4.4 — Verified Compass Messages + Exact Moon Labels

import { supabase } from "../../shared/supabase.js";
import { requireCaddieMagicAccess } from "../../shared/caddie-magic-access.js?v=0.4.4";
import {
  getMyCaddieMagicProfile,
  getMyActiveCompass,
  saveMyCompass,
  getCompassAssignments,
  updateMyCompassAssignment,
  getCompassDispatches,
  sendCompassDispatch,
} from "../../shared/caddie-magic-compass.js?v=0.4.4";
import {
  getMyUpcomingGolfEvents,
  saveUpcomingGolfEvent,
  deleteUpcomingGolfEvent,
} from "../../shared/caddie-magic-schedule.js?v=0.4.4";
import { moonLabelForDate, normalizeCaddieMoonPhase } from "../../shared/caddie-magic-moon-calendar.js?v=0.4.4";

const $ = (id) => document.getElementById(id);

let playerProfile = null;
let compass = null;
let assignments = [];
let dispatches = [];
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
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortMoonPhase(value = "") {
  return normalizeCaddieMoonPhase(value);
}

function playerName() {
  const name = `${playerProfile?.first_name || ""} ${playerProfile?.last_name || ""}`.trim();
  return name || playerProfile?.email || "Player";
}

function assignmentClub(assignment) {
  if (assignment.assigned_club) return assignment.assigned_club;
  if (assignment.direction === "center") return "Putter";
  if (assignment.direction === "general") return "Whole Compass";
  return titleCase(assignment.direction);
}

function renderCompass() {
  const setup = $("compassSetupCard");
  const map = $("compassMapCard");
  if (!compass) {
    setup?.classList.remove("hidden");
    map?.classList.add("hidden");
    $("compassStatus").textContent = "Not Set";
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

  const sealed = Boolean(compass.sealed_at) || compass.status === "sealed";
  const status = sealed ? `Sealed · V${compass.version}` : `Draft · V${compass.version}`;
  $("compassStatus").textContent = status;
  $("compassMapStatus").textContent = status;
  $("compassSealNote").textContent = sealed
    ? "This compass is sealed because your assignments have begun. Message your Caddie to request a future compass version."
    : "Your compass remains editable until your first assignment is sent.";
  $("saveCompassButton").disabled = sealed;
  $("saveCompassButton").textContent = sealed ? "Compass Sealed" : "Update My Caddie Compass";
  setup?.classList.toggle("hidden", sealed);
  renderDispatchComposer();
}

function assignmentMarkup(assignment, completed = false) {
  const due = assignment.due_date ? `Due ${formatDate(assignment.due_date)}` : "No fixed due date";
  const direction = assignment.direction === "general" ? "Compass Assignment" : `${titleCase(assignment.direction)} · ${assignmentClub(assignment)}`;
  const response = assignment.player_response || "";
  return `
    <article class="assignment-card ${completed ? "is-completed" : ""}" data-assignment-card="${escapeHtml(assignment.id)}">
      <div class="assignment-topline">
        <div>
          <div class="assignment-meta">
            ${assignment.moon_phase ? `<span>${escapeHtml(assignment.moon_phase)}</span>` : ""}
            <span>${escapeHtml(direction)}</span>
            <span>${escapeHtml(due)}</span>
          </div>
          <h3>${escapeHtml(assignment.title)}</h3>
        </div>
        <span class="assignment-status">${escapeHtml(titleCase(assignment.status))}</span>
      </div>
      <p class="assignment-instructions">${escapeHtml(assignment.instructions)}</p>
      ${completed
        ? response
          ? `<p class="assignment-completion"><strong>Your completion note</strong><br>${escapeHtml(response)}</p>`
          : `<p class="assignment-due">Completed without a written reflection.</p>`
        : `
          <div class="assignment-response">
            <textarea rows="4" data-assignment-response="${escapeHtml(assignment.id)}" placeholder="What did you notice? What changed? What did the club reveal?">${escapeHtml(response)}</textarea>
            <div class="assignment-actions">
              ${assignment.status === "assigned" ? `<button class="cm-button secondary" type="button" data-assignment-start="${escapeHtml(assignment.id)}">Begin Assignment</button>` : ""}
              <button class="cm-button" type="button" data-assignment-complete="${escapeHtml(assignment.id)}">Complete Assignment</button>
            </div>
          </div>
        `}
    </article>
  `;
}

function renderAssignments() {
  const active = assignments.filter((item) => item.status !== "completed");
  const completed = assignments.filter((item) => item.status === "completed");
  $("activeAssignmentCount").textContent = `${active.length} active`;
  $("activeAssignments").innerHTML = active.length
    ? active.map((item) => assignmentMarkup(item)).join("")
    : `<div class="cm-empty">No active assignments yet. Your Caddie will place the next homework here.</div>`;
  $("completedAssignments").innerHTML = completed.length
    ? completed.map((item) => assignmentMarkup(item, true)).join("")
    : `<div class="cm-empty">Completed assignments will be preserved here.</div>`;

  document.querySelectorAll("[data-assignment-start]").forEach((button) => {
    button.addEventListener("click", () => updateAssignment(button.dataset.assignmentStart, "in_progress"));
  });
  document.querySelectorAll("[data-assignment-complete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.assignmentComplete;
      const response = document.querySelector(`[data-assignment-response="${CSS.escape(id)}"]`)?.value || "";
      updateAssignment(id, "completed", response);
    });
  });
}

function assignmentTitle(id) {
  return assignments.find((item) => String(item.id) === String(id))?.title || "Compass Assignment";
}

function renderDispatchComposer() {
  const textarea = $("dispatchMessage");
  const button = $("dispatchForm")?.querySelector('button[type="submit"]');
  const intro = $("dispatchIntro");
  const canMessage = Boolean(compass);
  if (textarea) textarea.disabled = !canMessage;
  if (button) button.disabled = !canMessage;
  if (textarea && !canMessage) textarea.value = "";
  if (intro) {
    intro.textContent = canMessage
      ? "Your Compass is in. Use Messages anytime you want to ask a question, share an update, or respond to an assignment."
      : "First submit your Caddie Compass. Then you can send private messages here.";
  }
}

function renderDispatches() {
  const thread = $("dispatchThread");
  if (!dispatches.length) {
    thread.innerHTML = `<div class="cm-empty">${compass ? "No Messages yet. Send the first one whenever something needs witnessing." : "Submit your Compass first. Messages will open here afterward."}</div>`;
    renderDispatchComposer();
    return;
  }
  thread.innerHTML = dispatches.map((dispatch) => `
    <article class="dispatch-bubble ${dispatch.sender_role === "player" ? "is-player" : "is-caddie"}">
      <span>${dispatch.sender_role === "player" ? "You" : "Your Caddie"}${dispatch.assignment_id ? ` · ${escapeHtml(assignmentTitle(dispatch.assignment_id))}` : ""}</span>
      <p>${escapeHtml(dispatch.message_body)}</p>
      <small>${escapeHtml(formatDateTime(dispatch.created_at))}</small>
    </article>
  `).join("");
  thread.scrollTop = thread.scrollHeight;
  renderDispatchComposer();
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
      const eventId = button.dataset.deleteGolfEvent;
      button.disabled = true;
      setMessage($("golfScheduleMessage"), "Removing upcoming golf...");
      try {
        await deleteUpcomingGolfEvent(eventId);
        upcomingGolf = await getMyUpcomingGolfEvents();
        renderUpcomingGolf();
        setMessage($("golfScheduleMessage"), "Upcoming golf removed.");
      } catch (error) {
        console.error(error);
        button.disabled = false;
        setMessage($("golfScheduleMessage"), error?.message || "The event could not be removed.", true);
      }
    });
  });
}

async function updateAssignment(id, status, response = "") {
  const card = document.querySelector(`[data-assignment-card="${CSS.escape(id)}"]`);
  card?.classList.add("is-loading");
  try {
    await updateMyCompassAssignment(id, status, response);
    assignments = await getCompassAssignments(playerProfile.id);
    renderAssignments();
  } catch (error) {
    console.error(error);
    setMessage($("compassPageMessage"), error?.message || "The assignment could not be updated.", true);
  } finally {
    card?.classList.remove("is-loading");
  }
}

async function handleCompassSave(event) {
  event.preventDefault();
  setMessage($("compassFormMessage"), "Saving your five-club map...");
  $("saveCompassButton").disabled = true;
  try {
    compass = await saveMyCompass({
      northClub: $("northClub").value,
      eastClub: $("eastClub").value,
      westClub: $("westClub").value,
      southClub: $("southClub").value,
    });
    setMessage($("compassFormMessage"), "Your Caddie Compass has been recorded.");
    renderCompass();
  } catch (error) {
    console.error(error);
    setMessage($("compassFormMessage"), error?.message || "Your compass could not be saved.", true);
  } finally {
    if (!compass?.sealed_at) $("saveCompassButton").disabled = false;
  }
}

async function handleDispatch(event) {
  event.preventDefault();
  if (!compass) {
    setMessage($("dispatchMessageStatus"), "Submit your Caddie Compass first. Then Messages will open.", true);
    return;
  }
  const message = $("dispatchMessage").value;
  setMessage($("dispatchMessageStatus"), "Sending your message...");
  try {
    await sendCompassDispatch(playerProfile.id, message, null);
    $("dispatchMessage").value = "";
    dispatches = await getCompassDispatches(playerProfile.id);
    renderDispatches();
    setMessage($("dispatchMessageStatus"), "Message sent.");
  } catch (error) {
    console.error(error);
    setMessage($("dispatchMessageStatus"), error?.message || "The message could not be sent.", true);
  }
}

async function handleGolfScheduleSubmit(event) {
  event.preventDefault();
  const startDate = $("golfEventStart").value;
  const endDate = $("golfEventEnd").value || startDate;
  setMessage($("golfScheduleMessage"), "Mapping the moon across your upcoming golf...");
  try {
    await saveUpcomingGolfEvent({
      eventType: $("golfEventType").value,
      title: $("golfEventTitle").value,
      dateStart: startDate,
      dateEnd: endDate,
      course: $("golfEventCourse").value,
      location: $("golfEventLocation").value,
      notes: $("golfEventNotes").value,
    });
    $("golfScheduleForm").reset();
    $("golfEventType").value = "round";
    $("golfEventStart").value = todayISO();
    $("golfEventStart").min = todayISO();
    $("golfEventEnd").min = todayISO();
    upcomingGolf = await getMyUpcomingGolfEvents();
    renderUpcomingGolf();
    setMessage($("golfScheduleMessage"), "Upcoming golf added with a moon forecast for every day.");
  } catch (error) {
    console.error(error);
    const missingMigration = String(error?.message || "").toLowerCase().includes("caddie_magic_save_upcoming_golf_event");
    setMessage($("golfScheduleMessage"), missingMigration
      ? "Upcoming Golf requires migration 043."
      : (error?.message || "The upcoming golf event could not be saved."), true);
  }
}

function syncScheduleEndMinimum() {
  const start = $("golfEventStart").value || todayISO();
  $("golfEventEnd").min = start;
  if ($("golfEventEnd").value && $("golfEventEnd").value < start) {
    $("golfEventEnd").value = start;
  }
}

async function loadUpcomingGolf() {
  try {
    upcomingGolf = await getMyUpcomingGolfEvents();
    scheduleAvailable = true;
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("caddie_magic_upcoming_golf_events") || message.includes("schema cache")) {
      console.warn("Upcoming Golf is waiting for migration 043.", error);
      upcomingGolf = [];
      scheduleAvailable = false;
      return;
    }
    throw error;
  }
}

function scrollToRequestedCompassSection() {
  const targetId = String(window.location.hash || "").replace("#", "");
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (!target) return;
  window.setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (targetId === "messages" && compass) $("dispatchMessage")?.focus();
  }, 120);
}

async function loadCompassPage() {
  await requireCaddieMagicAccess();
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw new Error("Sign in through Caddie Magic before opening your Caddie Compass.");

    playerProfile = await getMyCaddieMagicProfile();
    if (!playerProfile) throw new Error("Create your Player Profile before setting your Caddie Compass.");

    await Promise.all([
      (async () => { compass = await getMyActiveCompass(); })(),
      (async () => { assignments = await getCompassAssignments(playerProfile.id); })(),
      (async () => { dispatches = await getCompassDispatches(playerProfile.id); })(),
      loadUpcomingGolf(),
    ]);

    $("golfEventStart").value = todayISO();
    $("golfEventStart").min = todayISO();
    $("golfEventEnd").min = todayISO();
    $("compassLoadingCard").classList.add("hidden");
    $("compassPage").classList.remove("hidden");
    renderCompass();
    renderAssignments();
    renderDispatches();
    renderUpcomingGolf();
    scrollToRequestedCompassSection();
  } catch (error) {
    console.error(error);
    setMessage($("compassPageMessage"), error?.message || "The Caddie Compass could not open.", true);
  }
}

$("compassForm")?.addEventListener("submit", handleCompassSave);
$("dispatchForm")?.addEventListener("submit", handleDispatch);
$("golfScheduleForm")?.addEventListener("submit", handleGolfScheduleSubmit);
$("golfEventStart")?.addEventListener("change", syncScheduleEndMinimum);
loadCompassPage();
