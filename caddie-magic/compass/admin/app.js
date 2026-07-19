// Caddie Magic v0.3.0 — Owner Caddie Compass Administration

import { supabase } from "../../../shared/supabase.js";
import {
  listCompassPlayers,
  getCompassForPlayer,
  getCompassAssignments,
  getCompassDispatches,
  createCompassAssignment,
  sendCompassDispatch,
  adminUpdateCompassAssignment,
} from "../../../shared/caddie-magic-compass.js?v=0.3.0";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const playerProfileId = params.get("player");

let playerSummary = null;
let compass = null;
let assignments = [];
let dispatches = [];

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
          <button class="cm-button secondary" type="button" data-admin-message="${escapeHtml(assignment.id)}">Send Dispatch About This</button>
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

  document.querySelectorAll("[data-admin-message]").forEach((button) => {
    button.addEventListener("click", () => {
      $("adminDispatchAssignment").value = button.dataset.adminMessage;
      $("adminDispatchMessage").focus();
      $("adminDispatchForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  $("adminDispatchAssignment").innerHTML = [
    `<option value="">General Compass Dispatch</option>`,
    ...assignments.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`),
  ].join("");
}

function assignmentTitle(id) {
  return assignments.find((item) => String(item.id) === String(id))?.title || "Compass Assignment";
}

function renderDispatches() {
  const thread = $("adminDispatchThread");
  thread.innerHTML = dispatches.length
    ? dispatches.map((dispatch) => `
      <article class="dispatch-bubble ${dispatch.sender_role === "caddie" ? "is-player" : "is-caddie"}">
        <span>${dispatch.sender_role === "caddie" ? "You · Caddie" : playerSummary.player_name}${dispatch.assignment_id ? ` · ${escapeHtml(assignmentTitle(dispatch.assignment_id))}` : ""}</span>
        <p>${escapeHtml(dispatch.message_body)}</p>
        <small>${escapeHtml(formatDateTime(dispatch.created_at))}</small>
      </article>
    `).join("")
    : `<div class="cm-empty">No private Caddie Dispatches yet.</div>`;
  thread.scrollTop = thread.scrollHeight;
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
  setMessage($("adminDispatchStatus"), "Sending your dispatch...");
  try {
    await sendCompassDispatch(
      playerProfileId,
      $("adminDispatchMessage").value,
      $("adminDispatchAssignment").value || null,
    );
    $("adminDispatchMessage").value = "";
    dispatches = await getCompassDispatches(playerProfileId);
    renderDispatches();
    setMessage($("adminDispatchStatus"), "Dispatch sent.");
  } catch (error) {
    console.error(error);
    setMessage($("adminDispatchStatus"), error?.message || "The dispatch could not be sent.", true);
  }
}

async function init() {
  try {
    if (!playerProfileId) throw new Error("Choose a Caddie Compass player from the Concierge Desk.");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw new Error("Enter through the Concierge Desk before opening Caddie Compass administration.");

    const players = await listCompassPlayers();
    playerSummary = players.find((item) => String(item.player_profile_id) === String(playerProfileId));
    if (!playerSummary) throw new Error("This player’s active Caddie Compass could not be found.");

    [compass, assignments, dispatches] = await Promise.all([
      getCompassForPlayer(playerProfileId),
      getCompassAssignments(playerProfileId),
      getCompassDispatches(playerProfileId),
    ]);
    if (!compass) throw new Error("This player has not saved a Caddie Compass yet.");

    $("adminLoadingCard").classList.add("hidden");
    $("adminPage").classList.remove("hidden");
    renderCompass();
    renderAssignments();
    renderDispatches();
  } catch (error) {
    console.error(error);
    setMessage($("adminPageMessage"), error?.message || "Caddie Compass administration could not open.", true);
  }
}

$("assignmentDirection")?.addEventListener("change", updateClubPreview);
$("assignmentForm")?.addEventListener("submit", handleAssignmentSubmit);
$("adminDispatchForm")?.addEventListener("submit", handleDispatchSubmit);
init();
