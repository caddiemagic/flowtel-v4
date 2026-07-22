// Caddie Magic v0.5.2 — simplified Caddie Profile, controlled courses, and shared scheduling.

import { requireCaddieMagicAccess } from "../../shared/caddie-magic-access.js?v=0.5.2";
import {
  getMyCaddieProfile,
  saveMyCaddieProfile,
  setAcceptingPlayerRequests,
  listMyPlayerRequests,
  respondToPlayerRequest,
  listMyConsultations,
  cancelConsultation,
  completeConsultation,
  getPlayerConsultationSnapshot,
  listCourseCatalog,
  getMyCourseSettings,
  saveMyCourses,
  requestCourse,
  getMyCaddieSchedule,
  saveMyCaddieSchedule,
  addMyCaddieScheduleException,
  removeMyCaddieScheduleException,
  getMyCaddieTeamMessages,
  sendMyCaddieTeamMessage,
} from "../../shared/caddie-magic-network.js?v=0.5.2";

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYPARTS = [
  { key: "morning", label: "Morning", times: "9:00 · 10:00 · 11:00" },
  { key: "afternoon", label: "Afternoon", times: "1:00 · 2:00 · 3:00" },
  { key: "evening", label: "Evening", times: "5:00 · 6:00 · 7:00" },
];

let profile = null;
let requests = [];
let consultations = [];
let courseCatalog = [];
let courseSettings = { selected: [], pending: [] };
let schedule = { weekly: [], exceptions: [], service: { duration_minutes: 45 } };
let teamMessages = [];

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
  node.classList.toggle("error", error);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function statusLabel(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isActive() {
  return profile?.status === "active";
}

function hydrateProfile() {
  $("caddieDisplayName").value = profile?.display_name || "";
  $("caddieProfessionalTitle").value = profile?.professional_title || "";
  $("caddieCity").value = profile?.city || "";
  $("caddieTimezone").value = profile?.timezone || "America/Los_Angeles";
  $("caddieProfileStatus").textContent = statusLabel(profile?.status || "invited");

  const submitted = profile?.status === "submitted";
  const active = isActive();
  const approved = profile?.status === "approved";
  const pausedOrDeclined = ["paused", "declined"].includes(profile?.status);
  $("saveCaddieDraftButton").disabled = submitted || pausedOrDeclined;
  $("submitCaddieProfileButton").disabled = submitted || approved || active || pausedOrDeclined;
  $("submitCaddieProfileButton").textContent = submitted
    ? "Awaiting Approval"
    : active
      ? "Profile Active"
      : approved
        ? "Approved · Awaiting Activation"
        : pausedOrDeclined
        ? statusLabel(profile.status)
        : "Submit for Approval";

  ["activeDeskControls", "playerRequestsCard", "availabilityDeskCard", "consultationsDeskCard", "caddieTeamMessagesCard"].forEach((id) => {
    $(id)?.classList.toggle("hidden", !active);
  });
  $("acceptingRequestsToggle").checked = Boolean(profile?.accepting_requests);
  renderAcceptingLabel();
}

function profilePayload() {
  return {
    displayName: $("caddieDisplayName").value,
    professionalTitle: $("caddieProfessionalTitle").value,
    city: $("caddieCity").value,
    timezone: $("caddieTimezone").value,
  };
}

function selectedCourseIds() {
  return [...document.querySelectorAll("[data-course-choice]:checked")].map((input) => input.value);
}

async function saveProfile(submit = false) {
  const button = submit ? $("submitCaddieProfileButton") : $("saveCaddieDraftButton");
  button.disabled = true;
  setMessage($("profileMessage"), submit ? "Submitting your Caddie Profile..." : "Saving your Caddie Profile...");
  try {
    profile = await saveMyCaddieProfile(profilePayload(), { submit });
    courseSettings = await saveMyCourses(selectedCourseIds());
    renderCourseCatalog();
    setMessage($("profileMessage"), submit ? "Profile submitted for Caddie Master approval." : "Caddie Profile saved.");
  } catch (error) {
    setMessage($("profileMessage"), error?.message || "The Caddie Profile could not be saved.", true);
  } finally {
    button.disabled = false;
    if (profile) hydrateProfile();
  }
}

function renderCourseCatalog() {
  const selected = new Set((courseSettings.selected || []).map((item) => String(item.course_id)));
  $("courseCatalog").innerHTML = courseCatalog.length
    ? courseCatalog.map((course) => `
      <label class="course-choice">
        <input type="checkbox" data-course-choice value="${escapeHtml(course.course_id)}" ${selected.has(String(course.course_id)) ? "checked" : ""} />
        <span><strong>${escapeHtml(course.course_name)}</strong><small>${escapeHtml([course.city, course.region].filter(Boolean).join(", "))}</small></span>
      </label>`).join("")
    : `<div class="desk-empty">The approved course catalog will appear after migration 053 is installed.</div>`;

  const pending = courseSettings.pending || [];
  $("pendingCourseList").innerHTML = pending.length
    ? `<p class="course-pending-title">Pending Verification</p>${pending.map((item) => `<span class="pending-course">${escapeHtml(item.requested_name)} · Pending Verification</span>`).join("")}`
    : "";
}

async function requestAnotherCourse() {
  const input = $("courseRequestName");
  const button = $("requestCourseButton");
  const value = String(input.value || "").trim();
  if (!value) {
    setMessage($("profileMessage"), "Enter the course you want The Caddie Master to verify.", true);
    return;
  }
  button.disabled = true;
  try {
    await requestCourse(value);
    courseSettings = await getMyCourseSettings();
    input.value = "";
    renderCourseCatalog();
    setMessage($("profileMessage"), "Course requested. It appears privately as Pending Verification until approved.");
  } catch (error) {
    setMessage($("profileMessage"), error?.message || "The course request could not be sent.", true);
  } finally {
    button.disabled = false;
  }
}

function renderAcceptingLabel() {
  $("acceptingRequestsLabel").textContent = $("acceptingRequestsToggle").checked
    ? "Accepting Player requests"
    : "Not accepting requests";
}

function weeklyValue(weekday, daypart) {
  return (schedule.weekly || []).find((item) => Number(item.weekday) === weekday && item.daypart === daypart) || {
    calls: false,
    caddying: false,
  };
}

function renderWeeklySchedule() {
  $("weeklyScheduleGrid").innerHTML = WEEKDAYS.map((day, weekday) => `
    <article class="schedule-day">
      <div class="schedule-day-heading"><h3>${day}</h3><small>Same every week</small></div>
      ${DAYPARTS.map((part) => {
        const value = weeklyValue(weekday, part.key);
        return `<div class="schedule-daypart">
          <div><strong>${part.label}</strong><small>${part.times}</small></div>
          <label><input type="checkbox" data-schedule-calls data-weekday="${weekday}" data-daypart="${part.key}" ${value.calls ? "checked" : ""} /> Calls</label>
          <label><input type="checkbox" data-schedule-caddying data-weekday="${weekday}" data-daypart="${part.key}" ${value.caddying ? "checked" : ""} /> Caddying</label>
        </div>`;
      }).join("")}
    </article>`).join("");
}

function collectWeeklySchedule() {
  const rows = [];
  WEEKDAYS.forEach((_, weekday) => {
    DAYPARTS.forEach((part) => {
      const calls = document.querySelector(`[data-schedule-calls][data-weekday="${weekday}"][data-daypart="${part.key}"]`)?.checked || false;
      const caddying = document.querySelector(`[data-schedule-caddying][data-weekday="${weekday}"][data-daypart="${part.key}"]`)?.checked || false;
      rows.push({ weekday, daypart: part.key, calls, caddying });
    });
  });
  return rows;
}

async function saveWeeklySchedule() {
  const button = $("saveWeeklyScheduleButton");
  button.disabled = true;
  setMessage($("scheduleStatus"), "Saving your recurring weekly availability...");
  try {
    schedule = await saveMyCaddieSchedule(collectWeeklySchedule());
    renderWeeklySchedule();
    renderScheduleExceptions();
    setMessage($("scheduleStatus"), "Weekly availability saved. Call slots were refreshed eight weeks ahead.");
  } catch (error) {
    setMessage($("scheduleStatus"), error?.message || "Your weekly availability could not be saved.", true);
  } finally {
    button.disabled = false;
  }
}

function renderScheduleExceptions() {
  const rows = schedule.exceptions || [];
  $("scheduleExceptionList").innerHTML = rows.length
    ? rows.map((item) => `
      <article class="exception-row">
        <div>
          <h3>${escapeHtml(formatDate(item.starts_on))}${item.ends_on !== item.starts_on ? ` – ${escapeHtml(formatDate(item.ends_on))}` : ""}</h3>
          <p>${item.block_calls ? "Calls" : ""}${item.block_calls && item.block_caddying ? " + " : ""}${item.block_caddying ? "Caddying" : ""}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</p>
        </div>
        <button class="cm-button secondary" type="button" data-remove-exception="${escapeHtml(item.id)}">Remove</button>
      </article>`).join("")
    : `<div class="desk-empty">No calendar blocks are active.</div>`;
  document.querySelectorAll("[data-remove-exception]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        schedule = await removeMyCaddieScheduleException(button.dataset.removeException);
        renderScheduleExceptions();
        setMessage($("scheduleStatus"), "Calendar block removed.");
      } catch (error) {
        setMessage($("scheduleStatus"), error?.message || "The calendar block could not be removed.", true);
        button.disabled = false;
      }
    });
  });
}

async function addScheduleException(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const startsOn = $("exceptionStartDate").value;
  const endsOn = $("exceptionEndDate").value || startsOn;
  const blockCalls = $("exceptionBlockCalls").checked;
  const blockCaddying = $("exceptionBlockCaddying").checked;
  button.disabled = true;
  try {
    schedule = await addMyCaddieScheduleException({
      startsOn,
      endsOn,
      blockCalls,
      blockCaddying,
      note: $("exceptionNote").value,
    });
    event.currentTarget.reset();
    $("exceptionBlockCalls").checked = true;
    $("exceptionBlockCaddying").checked = true;
    renderScheduleExceptions();
    setMessage($("scheduleStatus"), "Calendar block added.");
  } catch (error) {
    setMessage($("scheduleStatus"), error?.message || "The calendar block could not be added.", true);
  } finally {
    button.disabled = false;
  }
}

function consentMarkup(row) {
  return [
    row.share_scorecard && "Scorecard",
    row.share_score_map && "Score Map",
    row.share_compass && "Compass",
    row.share_upcoming_golf && "Calendar",
  ].filter(Boolean).map((value) => `<span>${escapeHtml(value)}</span>`).join("") || "<span>Profile only</span>";
}

function renderRequests() {
  const waiting = requests.filter((row) => row.status === "requested").length;
  $("requestCount").textContent = `${waiting} waiting`;
  $("requestList").innerHTML = requests.length
    ? requests.map((row) => `
      <article class="desk-request-row">
        <div>
          <h3>${escapeHtml(row.player_name || "Player")}</h3>
          <p>${row.anticipated_trip_date ? `Trip date ${escapeHtml(formatDate(row.anticipated_trip_date))} · ` : ""}${escapeHtml(row.consultation_goal || "Consultation request")}</p>
          ${row.course_itinerary ? `<p>${escapeHtml(row.course_itinerary)}</p>` : ""}
          <div class="request-consent">${consentMarkup(row)}</div>
        </div>
        <div class="desk-row-actions">
          ${row.status === "requested"
            ? `<button class="cm-button" data-respond-request="${escapeHtml(row.request_id)}" data-response="accepted">Accept</button><button class="cm-button secondary" data-respond-request="${escapeHtml(row.request_id)}" data-response="declined">Decline</button>`
            : row.status === "accepted"
              ? `<button class="cm-button" data-open-snapshot="${escapeHtml(row.request_id)}">Open Read-Only Preparation</button>`
              : `<span class="desk-status">${escapeHtml(statusLabel(row.status))}</span>`}
        </div>
      </article>`).join("")
    : `<div class="desk-empty">No Player requests have arrived yet.</div>`;

  document.querySelectorAll("[data-respond-request]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await respondToPlayerRequest(button.dataset.respondRequest, button.dataset.response);
        await reloadOperationalData();
      } catch (error) {
        setMessage($("deskMessage"), error?.message || "The request could not be updated.", true);
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll("[data-open-snapshot]").forEach((button) => {
    button.addEventListener("click", () => openSnapshot(button.dataset.openSnapshot));
  });
}

function renderConsultations() {
  const rows = consultations.filter((item) => item.viewer_role === "caddie");
  $("deskConsultationList").innerHTML = rows.length
    ? rows.map((item) => {
        const mayComplete = item.status === "scheduled" && new Date(item.starts_at).getTime() <= Date.now();
        return `<article class="desk-consultation-row">
          <div>
            <h3>${escapeHtml(item.player_name || "Player Consultation")}</h3>
            <p>${escapeHtml(formatDateTime(item.starts_at))} · 45-minute Caddie Consultation</p>
            <p>Status: ${escapeHtml(statusLabel(item.status))}</p>
          </div>
          <div class="desk-row-actions">
            ${mayComplete ? `<button class="cm-button" data-complete-consultation="${escapeHtml(item.consultation_id)}">Mark Complete</button>` : ""}
            ${item.status === "scheduled" ? `<button class="cm-button secondary" data-cancel-consultation="${escapeHtml(item.consultation_id)}">Cancel</button>` : ""}
          </div>
        </article>`;
      }).join("")
    : `<div class="desk-empty">No consultations are scheduled.</div>`;

  document.querySelectorAll("[data-complete-consultation]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Mark this consultation complete?")) return;
      button.disabled = true;
      try {
        await completeConsultation(button.dataset.completeConsultation);
        await reloadOperationalData();
      } catch (error) {
        setMessage($("deskMessage"), error?.message || "The consultation could not be completed.", true);
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll("[data-cancel-consultation]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Cancel this consultation?")) return;
      button.disabled = true;
      try {
        await cancelConsultation(button.dataset.cancelConsultation);
        await reloadOperationalData();
      } catch (error) {
        setMessage($("deskMessage"), error?.message || "The consultation could not be cancelled.", true);
        button.disabled = false;
      }
    });
  });
}

function snapshotEntries(entries = []) {
  return entries.length
    ? `<div class="snapshot-entry-list">${entries.slice(0, 20).map((entry) => `
      <article class="snapshot-entry">
        <time>${escapeHtml(formatDate(entry.round_date))}${entry.moon_day ? ` · Day ${escapeHtml(entry.moon_day)}` : ""}</time>
        <p>${escapeHtml(entry.swing_thoughts || entry.course_played || "Score logged")}</p>
        ${entry.score != null ? `<strong>${escapeHtml(entry.score)}</strong>` : ""}
      </article>`).join("")}</div>`
    : `<div class="desk-empty">No shared entries are available.</div>`;
}

async function openSnapshot(requestId) {
  $("snapshotContent").innerHTML = `<div class="snapshot-wrap"><p class="cm-eyebrow">CONSULTATION PREPARATION</p><h2>Opening read-only Player data...</h2></div>`;
  $("snapshotDialog").showModal();
  try {
    const snapshot = await getPlayerConsultationSnapshot(requestId);
    const player = snapshot?.player || {};
    const request = snapshot?.request || {};
    const compass = snapshot?.compass || null;
    const upcoming = Array.isArray(snapshot?.upcoming_golf) ? snapshot.upcoming_golf : [];
    $("snapshotContent").innerHTML = `
      <div class="snapshot-wrap">
        <p class="cm-eyebrow">READ-ONLY CONSULTATION PREPARATION</p>
        <h2>${escapeHtml(player.name || "Player")}</h2>
        <p class="cm-muted">Study only what this Player consented to share. Caddies cannot edit Player records, create Assignments, enter VIP Player ↔ Caddie Master conversations, or leave Caddie Master Notes.</p>
        <section class="snapshot-section"><div class="snapshot-grid">
          <article class="snapshot-data-card"><span>Trip Date</span><strong>${escapeHtml(formatDate(request.anticipated_trip_date))}</strong></article>
          <article class="snapshot-data-card"><span>Score Range</span><strong>${escapeHtml(player.handicap_or_score_range || "Not provided")}</strong></article>
          <article class="snapshot-data-card"><span>Home Course</span><strong>${escapeHtml(player.home_course || "Not provided")}</strong></article>
          <article class="snapshot-data-card"><span>Consultation Goal</span><p>${escapeHtml(request.consultation_goal || "Not provided")}</p></article>
        </div></section>
        ${compass ? `<section class="snapshot-section"><p class="cm-eyebrow">CADDIE COMPASS</p><div class="snapshot-grid">
          <article class="snapshot-data-card"><span>North Club</span><strong>${escapeHtml(compass.north_club)}</strong></article>
          <article class="snapshot-data-card"><span>East Club</span><strong>${escapeHtml(compass.east_club)}</strong></article>
          <article class="snapshot-data-card"><span>West Club</span><strong>${escapeHtml(compass.west_club)}</strong></article>
          <article class="snapshot-data-card"><span>South Club</span><strong>${escapeHtml(compass.south_club)}</strong></article>
        </div></section>` : ""}
        ${Array.isArray(snapshot?.scorecard) && snapshot.scorecard.length ? `<section class="snapshot-section"><p class="cm-eyebrow">SCORECARD</p>${snapshotEntries(snapshot.scorecard)}</section>` : ""}
        ${Array.isArray(snapshot?.score_map) && snapshot.score_map.length ? `<section class="snapshot-section"><p class="cm-eyebrow">SCORE MAP</p>${snapshotEntries(snapshot.score_map)}</section>` : ""}
        ${upcoming.length ? `<section class="snapshot-section"><p class="cm-eyebrow">UPCOMING GOLF</p>${upcoming.map((event) => `<article class="snapshot-entry"><time>${escapeHtml(formatDate(event.date_start))}</time><p>${escapeHtml(event.title || event.course || "Upcoming Golf")}</p><strong>${escapeHtml(event.event_type || "")}</strong></article>`).join("")}</section>` : ""}
      </div>`;
  } catch (error) {
    $("snapshotContent").innerHTML = `<div class="snapshot-wrap"><p class="cm-message error">${escapeHtml(error?.message || "The preparation view could not be opened.")}</p></div>`;
  }
}

function renderTeamMessages() {
  const thread = $("caddieTeamMessageThread");
  if (!thread) return;
  thread.innerHTML = teamMessages.length
    ? teamMessages.map((message) => {
        const mine = message.sender_role === "caddie";
        return `<article class="team-message ${mine ? "is-caddie" : "is-master"}">
          <span>${mine ? "You" : "The Caddie Master"}</span>
          <p>${escapeHtml(message.message_body || "")}</p>
          <time>${escapeHtml(formatDateTime(message.created_at))}</time>
        </article>`;
      }).join("")
    : `<div class="desk-empty">No Caddie Team messages yet.</div>`;
  thread.scrollTop = thread.scrollHeight;
}

async function refreshTeamMessages() {
  if (!isActive()) return;
  teamMessages = await getMyCaddieTeamMessages();
  renderTeamMessages();
}

async function reloadOperationalData() {
  if (!isActive()) return;
  [requests, consultations, schedule, teamMessages] = await Promise.all([
    listMyPlayerRequests(),
    listMyConsultations(),
    getMyCaddieSchedule(),
    getMyCaddieTeamMessages().catch(() => []),
  ]);
  renderRequests();
  renderConsultations();
  renderWeeklySchedule();
  renderScheduleExceptions();
  renderTeamMessages();
}

async function boot() {
  try {
    await requireCaddieMagicAccess();
    profile = await getMyCaddieProfile();
    $("deskLoadingCard").classList.add("hidden");
    if (!profile) {
      $("notInvitedCard").classList.remove("hidden");
      return;
    }
    $("deskPage").classList.remove("hidden");
    [courseCatalog, courseSettings] = await Promise.all([
      listCourseCatalog().catch(() => []),
      getMyCourseSettings().catch(() => ({ selected: [], pending: [] })),
    ]);
    hydrateProfile();
    renderCourseCatalog();
    await reloadOperationalData();
  } catch (error) {
    setMessage($("deskMessage"), error?.message || "The Caddie Desk could not be opened.", true);
  }
}

$("saveCaddieDraftButton")?.addEventListener("click", () => saveProfile(false));
$("submitCaddieProfileButton")?.addEventListener("click", () => saveProfile(true));
$("requestCourseButton")?.addEventListener("click", requestAnotherCourse);
$("courseRequestName")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    requestAnotherCourse();
  }
});
$("acceptingRequestsToggle")?.addEventListener("change", async () => {
  renderAcceptingLabel();
  try {
    profile = await setAcceptingPlayerRequests($("acceptingRequestsToggle").checked);
  } catch (error) {
    $("acceptingRequestsToggle").checked = !$("acceptingRequestsToggle").checked;
    renderAcceptingLabel();
    setMessage($("deskMessage"), error?.message || "The request setting could not be changed.", true);
  }
});
$("caddieTeamMessageForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("caddieTeamMessageInput");
  const button = event.currentTarget.querySelector("button[type=submit]");
  const message = String(input?.value || "").trim();
  if (!message) return setMessage($("caddieTeamMessageStatus"), "Write a message before sending.", true);
  button.disabled = true;
  setMessage($("caddieTeamMessageStatus"), "Sending your private message...");
  try {
    await sendMyCaddieTeamMessage(message);
    input.value = "";
    await refreshTeamMessages();
    setMessage($("caddieTeamMessageStatus"), "Message sent to The Caddie Master.");
  } catch (error) {
    setMessage($("caddieTeamMessageStatus"), error?.message || "The private message could not be sent.", true);
  } finally {
    button.disabled = false;
  }
});
$("saveWeeklyScheduleButton")?.addEventListener("click", saveWeeklySchedule);
$("scheduleExceptionForm")?.addEventListener("submit", addScheduleException);
$("snapshotDialogClose")?.addEventListener("click", () => $("snapshotDialog").close());
$("snapshotDialog")?.addEventListener("click", (event) => {
  if (event.target === $("snapshotDialog")) $("snapshotDialog").close();
});

boot();
