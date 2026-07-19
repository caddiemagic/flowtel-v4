// Caddie Magic v0.3.0 — Caddie Compass + Moon Assignments

import { supabase } from "../../shared/supabase.js";
import {
  getMyCaddieMagicProfile,
  getMyActiveCompass,
  saveMyCompass,
  getCompassAssignments,
  updateMyCompassAssignment,
  getCompassDispatches,
  sendCompassDispatch,
} from "../../shared/caddie-magic-compass.js?v=0.3.0";

const $ = (id) => document.getElementById(id);

let playerProfile = null;
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
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    ? "This compass is sealed because your initiation has begun. Message your Caddie to request a future compass version."
    : "Your compass remains editable until your first assignment is sent.";
  $("saveCompassButton").disabled = sealed;
  $("saveCompassButton").textContent = sealed ? "Compass Sealed" : "Update My Caddie Compass";
  setup?.classList.toggle("hidden", sealed);
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
    : `<div class="cm-empty">No active assignments yet. Your Caddie will place the next initiation here.</div>`;
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

  const options = [`<option value="">General Compass Dispatch</option>`]
    .concat(assignments.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`));
  $("dispatchAssignment").innerHTML = options.join("");
}

function assignmentTitle(id) {
  return assignments.find((item) => String(item.id) === String(id))?.title || "Compass Assignment";
}

function renderDispatches() {
  const thread = $("dispatchThread");
  if (!dispatches.length) {
    thread.innerHTML = `<div class="cm-empty">No Caddie Dispatches yet. Send the first message whenever something in the compass needs witnessing.</div>`;
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
  const message = $("dispatchMessage").value;
  const assignmentId = $("dispatchAssignment").value || null;
  setMessage($("dispatchMessageStatus"), "Sending your dispatch...");
  try {
    await sendCompassDispatch(playerProfile.id, message, assignmentId);
    $("dispatchMessage").value = "";
    dispatches = await getCompassDispatches(playerProfile.id);
    renderDispatches();
    setMessage($("dispatchMessageStatus"), "Dispatch sent.");
  } catch (error) {
    console.error(error);
    setMessage($("dispatchMessageStatus"), error?.message || "The dispatch could not be sent.", true);
  }
}

async function loadCompassPage() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw new Error("Sign in through Caddie Magic before opening your Caddie Compass.");

    playerProfile = await getMyCaddieMagicProfile();
    if (!playerProfile) throw new Error("Create your Player Profile before setting your Caddie Compass.");

    [compass, assignments, dispatches] = await Promise.all([
      getMyActiveCompass(),
      getCompassAssignments(playerProfile.id),
      getCompassDispatches(playerProfile.id),
    ]);

    $("compassLoadingCard").classList.add("hidden");
    $("compassPage").classList.remove("hidden");
    renderCompass();
    renderAssignments();
    renderDispatches();
  } catch (error) {
    console.error(error);
    setMessage($("compassPageMessage"), error?.message || "The Caddie Compass could not open.", true);
  }
}

$("compassForm")?.addEventListener("submit", handleCompassSave);
$("dispatchForm")?.addEventListener("submit", handleDispatch);
loadCompassPage();
