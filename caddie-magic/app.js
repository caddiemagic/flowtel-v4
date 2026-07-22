// Caddie Magic v0.5.1 — Network reintegration, Caddie Master services, and review credits

import { supabase } from "../shared/supabase.js";
import { getMoonMagic } from "../shared/moon.js";
import { getMyCaddieReviewRequests, requestCaddieReview } from "../shared/caddie-magic-reviews.js?v=0.5.1";
import { validatePlayerInvitation, claimPlayerInvitation, requireCaddieMagicAccess } from "../shared/caddie-magic-access.js?v=0.5.1";
import { getMyActiveCompass, getCompassAssignments, getCompassDispatches, updateMyCompassAssignment, sendCompassDispatch } from "../shared/caddie-magic-compass.js?v=0.5.1";
import { getMyUpcomingGolfEvents } from "../shared/caddie-magic-schedule.js?v=0.5.1";
import { moonLabelForDate, normalizeCaddieMoonPhase } from "../shared/caddie-magic-moon-calendar.js?v=0.5.1";
import { averageValidGolfScore, bestValidGolfScore } from "../shared/caddie-magic-score-calculations.js?v=0.5.1";
import { getMyCaddieProfile, listMyCaddieRequests, listMyConsultations, getMyCaddieMasterAccess } from "../shared/caddie-magic-network.js?v=0.5.1";

const $ = (id) => document.getElementById(id);

const authCard = $("authCard");
const profileCard = $("profileCard");
const moonDashboardCard = $("moonDashboardCard");
const portalGrid = $("portalGrid");
const historyCard = $("historyCard");
const caddieReviewCard = $("caddieReviewCard");
const assignmentsCard = $("assignmentsCard");
const authMessage = $("authMessage");
const profileMessage = $("profileMessage");
const roundMessage = $("roundMessage");

let currentUser = null;
let playerProfile = null;
let roundLogs = [];
let playerNotes = [];
let reviewRequests = [];
let activeCompass = null;
let compassAssignments = [];
let compassDispatches = [];
let upcomingGolfEvents = [];
let caddieProfile = null;
let caddieRequests = [];
let consultations = [];
let caddieMasterAccess = null;
let masterMessagesExpanded = false;
let selectedMoonDayToken = null;
let entryMode = "round";

function setMessage(node, message = "", isError = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("error", Boolean(isError));
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

function nextFullMoonISO(moon, today = todayISO()) {
  const currentCandidate = addDaysISO(moon.lastNewMoonDate, 15);
  return currentCandidate >= today ? currentCandidate : addDaysISO(moon.nextNewMoonDate, 15);
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
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clean(value) {
  return String(value || "").trim();
}

function scoreNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePhase(phase = "") {
  const value = String(phase || "").toLowerCase();
  if (value.includes("new") && !value.includes("half") && !value.includes("quarter")) return "New Moon Phase";
  if (value.includes("half full") || value.includes("first")) return "Half Full Moon Phase";
  if (value.includes("full") && !value.includes("half")) return "Full Moon Phase";
  if (value.includes("half new") || value.includes("third") || value.includes("last quarter")) return "Half New Moon Phase";
  return phase || "Moon Phase";
}

function shortPhase(phase = "") {
  const normalized = normalizePhase(phase);
  if (normalized === "New Moon Phase") return "New Moon Phase";
  if (normalized === "Half Full Moon Phase") return "First Quarter Phase";
  if (normalized === "Full Moon Phase") return "Full Moon Phase";
  if (normalized === "Half New Moon Phase") return "Last Quarter Phase";
  return normalized;
}

function caddieTheme(phase = "") {
  const normalized = normalizePhase(phase);
  if (normalized === "New Moon Phase") return "Reset the swing. Choose one clean thought.";
  if (normalized === "Half Full Moon Phase") return "Commit to the shot.";
  if (normalized === "Full Moon Phase") return "Trust what shows up under pressure.";
  if (normalized === "Half New Moon Phase") return "Review the miss. Keep the lesson.";
  return "Quiet focus. Let the round reveal the pattern.";
}

function phaseForMoonDay(day) {
  const value = Number(day);
  if (value >= 27 || value <= 5) return "New Moon Phase";
  if (value <= 11) return "Half Full Moon Phase";
  if (value <= 19) return "Full Moon Phase";
  return "Half New Moon Phase";
}

function displayName(profile = playerProfile) {
  const name = clean(`${profile?.first_name || ""} ${profile?.last_name || ""}`);
  return name || currentUser?.email || "Player";
}

function compassClubForPhase(phase = "") {
  if (!activeCompass) return null;
  const normalized = normalizePhase(phase);
  if (normalized === "New Moon Phase") return { direction: "West Club", club: activeCompass.west_club || "" };
  if (normalized === "Half Full Moon Phase") return { direction: "South Club", club: activeCompass.south_club || "" };
  if (normalized === "Full Moon Phase") return { direction: "East Club", club: activeCompass.east_club || "" };
  if (normalized === "Half New Moon Phase") return { direction: "North Club", club: activeCompass.north_club || "" };
  return null;
}

function compassClubCopy(phase = "") {
  const match = compassClubForPhase(phase);
  if (!match?.club) return "";
  return `${match.direction} · ${match.club}`;
}

function activeAssignmentsSummary() {
  const active = compassAssignments.filter((item) => item.status !== "completed");
  const completed = compassAssignments.filter((item) => item.status === "completed");
  return { active, completed };
}

function latestDispatchPreview() {
  if (!compassDispatches.length) return null;
  return compassDispatches[compassDispatches.length - 1];
}

function nextUpcomingGolfEvent() {
  return upcomingGolfEvents[0] || null;
}

async function loadCompassSnapshotData() {
  try {
    const [compass, assignments, dispatches] = await Promise.all([
      getMyActiveCompass().catch(() => null),
      playerProfile ? getCompassAssignments(playerProfile.id).catch(() => []) : Promise.resolve([]),
      playerProfile ? getCompassDispatches(playerProfile.id).catch(() => []) : Promise.resolve([]),
    ]);
    activeCompass = compass;
    compassAssignments = assignments;
    compassDispatches = dispatches;
  } catch (error) {
    console.warn("Compass snapshot data could not be loaded.", error);
    activeCompass = null;
    compassAssignments = [];
    compassDispatches = [];
  }
}

async function loadUpcomingGolfSnapshotData() {
  try {
    upcomingGolfEvents = await getMyUpcomingGolfEvents();
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("caddie_magic_upcoming_golf_events") || message.includes("schema cache")) {
      upcomingGolfEvents = [];
      return;
    }
    console.warn("Upcoming Golf snapshot data could not be loaded.", error);
    upcomingGolfEvents = [];
  }
}

async function loadNetworkSnapshotData() {
  try {
    const [profile, requests, booked, access] = await Promise.all([
      getMyCaddieProfile().catch(() => null),
      listMyCaddieRequests().catch(() => []),
      listMyConsultations().catch(() => []),
      getMyCaddieMasterAccess().catch(() => null),
    ]);
    caddieProfile = profile;
    caddieRequests = requests || [];
    consultations = booked || [];
    caddieMasterAccess = access;
  } catch (error) {
    console.warn("Caddie Network snapshot data could not be loaded.", error);
    caddieProfile = null;
    caddieRequests = [];
    consultations = [];
    caddieMasterAccess = null;
  }
}

function activeCaddieRequest() {
  return caddieRequests.find((request) => ["requested", "accepted"].includes(request.status)) || null;
}

function nextConsultation() {
  return consultations
    .filter((item) => item.status === "scheduled" && new Date(item.starts_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null;
}

function showState(state) {
  const isPortal = state === "portal";
  authCard?.classList.toggle("hidden", state !== "auth");
  profileCard?.classList.toggle("hidden", state !== "profile");
  moonDashboardCard?.classList.toggle("hidden", !isPortal);
  portalGrid?.classList.toggle("hidden", !isPortal);
  historyCard?.classList.toggle("hidden", !isPortal);
  caddieReviewCard?.classList.toggle("hidden", !isPortal);
  assignmentsCard?.classList.toggle("hidden", !isPortal);
}

async function signIn() {
  setMessage(authMessage, "Opening the clubhouse...");
  const email = clean($("authEmail")?.value).toLowerCase();
  const password = $("authPassword")?.value || "";
  if (!email || !password) {
    setMessage(authMessage, "Enter your email and password to open the clubhouse.", true);
    return;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setMessage(authMessage, error.message || "That key did not open the clubhouse.", true);
    return;
  }
  currentUser = data.user;
  try {
    const inviteCode = clean($("authInviteCode")?.value || new URLSearchParams(window.location.search).get("invite"));
    if (inviteCode) await claimPlayerInvitation(inviteCode);
    await requireCaddieMagicAccess();
    await bootPortal();
  } catch (accessError) {
    await supabase.auth.signOut();
    currentUser = null;
    setMessage(authMessage, accessError?.message || "This account has not been invited into Caddie Magic.", true);
  }
}

async function createAccount() {
  setMessage(authMessage, "Creating your player profile...");
  const email = clean($("authEmail")?.value).toLowerCase();
  const password = $("authPassword")?.value || "";
  const firstName = clean($("authFirstName")?.value);
  const lastName = clean($("authLastName")?.value);
  const inviteCode = clean($("authInviteCode")?.value || new URLSearchParams(window.location.search).get("invite"));
  if (!email || !password) {
    setMessage(authMessage, "Enter an email and password first.", true);
    return;
  }
  if (!inviteCode) {
    setMessage(authMessage, "Caddie Magic is invitation only. Open your personal invitation link or enter its code.", true);
    return;
  }
  try {
    const validInvite = await validatePlayerInvitation(email, inviteCode);
    if (!validInvite) {
      setMessage(authMessage, "That invitation does not match this email or is no longer active.", true);
      return;
    }
  } catch (inviteError) {
    setMessage(authMessage, inviteError?.message || "The invitation could not be verified.", true);
    return;
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName, source: "caddie_magic", caddie_invite_code: inviteCode } },
  });
  if (error) {
    setMessage(authMessage, error.message || "This player profile could not be created.", true);
    return;
  }
  currentUser = data.user;
  if (!data.session) {
    setMessage(authMessage, "Profile started. Check your email to confirm your account, then return to enter the clubhouse.");
    return;
  }
  await bootPortal({ firstName, lastName });
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  playerProfile = null;
  roundLogs = [];
  playerNotes = [];
  reviewRequests = [];
  selectedMoonDayToken = null;
  showState("auth");
  setMessage(authMessage, "You have left the clubhouse.");
  authCard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function fetchPlayerProfile() {
  const { data, error } = await supabase
    .from("caddie_magic_player_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function hydrateProfileForm(seed = {}) {
  $("profileFirstName").value = playerProfile?.first_name || seed.firstName || currentUser?.user_metadata?.first_name || "";
  $("profileLastName").value = playerProfile?.last_name || seed.lastName || currentUser?.user_metadata?.last_name || "";
  $("profileHomeCourse").value = playerProfile?.home_course || "";
  $("profileScoreRange").value = playerProfile?.handicap_or_score_range || "";
  $("profileMainGoal").value = playerProfile?.main_goal || "";
  $("profileFrustration").value = playerProfile?.biggest_frustration || "";
}

async function savePlayerProfile(event) {
  event?.preventDefault();
  setMessage(profileMessage, "Saving your player profile...");
  if (!currentUser) {
    setMessage(profileMessage, "Sign in before saving your player profile.", true);
    return;
  }
  const payload = {
    user_id: currentUser.id,
    email: currentUser.email,
    first_name: clean($("profileFirstName")?.value),
    last_name: clean($("profileLastName")?.value),
    home_course: clean($("profileHomeCourse")?.value) || null,
    handicap_or_score_range: clean($("profileScoreRange")?.value) || null,
    main_goal: clean($("profileMainGoal")?.value) || null,
    biggest_frustration: clean($("profileFrustration")?.value) || null,
  };
  if (!payload.first_name) {
    setMessage(profileMessage, "Add at least a first name to create your player profile.", true);
    return;
  }
  const { data, error } = await supabase
    .from("caddie_magic_player_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();
  if (error) {
    setMessage(profileMessage, error.message || "Your player profile could not be saved.", true);
    return;
  }
  playerProfile = data;
  setMessage(profileMessage, "Player profile saved.");
  await loadPortalData();
  renderPortal();
  showState("portal");
}

async function fetchRoundLogs() {
  const { data, error } = await supabase
    .from("caddie_magic_round_logs")
    .select("*")
    .eq("player_profile_id", playerProfile.id)
    .order("round_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchPlayerNotes() {
  const { data, error } = await supabase
    .from("caddie_magic_player_notes")
    .select("*")
    .eq("player_profile_id", playerProfile.id)
    .eq("is_visible_to_player", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchReviewRequests() {
  try {
    return await getMyCaddieReviewRequests();
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("caddie_magic_review_requests") || message.includes("schema cache")) {
      console.warn("Scorecard Review Service is waiting for migration 041.", error);
      return [];
    }
    throw error;
  }
}

async function loadPortalData() {
  if (!playerProfile) return;
  const [logs, notes, reviews] = await Promise.all([
    fetchRoundLogs(),
    fetchPlayerNotes(),
    fetchReviewRequests(),
  ]);
  roundLogs = logs;
  playerNotes = notes;
  reviewRequests = reviews;
  await Promise.all([
    loadCompassSnapshotData(),
    loadUpcomingGolfSnapshotData(),
    loadNetworkSnapshotData(),
  ]);
}

async function logRound(event) {
  event?.preventDefault();
  const isReflection = entryMode === "reflection";
  setMessage(roundMessage, isReflection ? "Saving your swing thought..." : "Logging your round with the moon...");
  if (!playerProfile) {
    setMessage(roundMessage, "Set your Player Profile before adding an entry.", true);
    return;
  }

  const roundDate = isReflection ? todayISO() : ($("roundDate")?.value || "");
  const coursePlayed = clean($("coursePlayed")?.value);
  const score = scoreNumber($("roundScore")?.value);
  const swingThoughts = clean($("swingThoughts")?.value);

  if (!isReflection && !roundDate) {
    setMessage(roundMessage, "Choose a date for this entry.", true);
    return;
  }
  if (!isReflection && roundDate > todayISO()) {
    setMessage(roundMessage, "You can't log a round from the future. Choose today or a past date.", true);
    return;
  }
  if (isReflection && !swingThoughts) {
    setMessage(roundMessage, "Add the swing thought you want to remember.", true);
    return;
  }
  if (!isReflection && !score) {
    setMessage(roundMessage, "Score is required for a round. Course and swing thoughts are optional.", true);
    return;
  }

  const moon = getMoonMagic(roundDate);
  const payload = {
    player_profile_id: playerProfile.id,
    user_id: currentUser.id,
    entry_type: isReflection ? "reflection" : "round",
    round_date: roundDate,
    course_played: isReflection ? null : (coursePlayed || null),
    score: isReflection ? null : score,
    swing_thoughts: swingThoughts || null,
    share_anonymously: playerProfile?.share_anonymously !== false,
    moon_day: moon.moonDay,
    moon_phase: normalizePhase(moon.phase),
    moon_inner_season: moon.innerSeason,
    moon_last_new_moon_date: moon.lastNewMoonDate,
    moon_next_new_moon_date: moon.nextNewMoonDate,
  };
  const { error } = await supabase.from("caddie_magic_round_logs").insert(payload);
  if (error) {
    setMessage(roundMessage, error.message || "This entry could not be saved.", true);
    return;
  }

  $("coursePlayed").value = "";
  $("roundScore").value = "";
  $("swingThoughts").value = "";
  $("roundDate").value = todayISO();
  setMessage(roundMessage, isReflection
    ? "Swing thought saved. It now appears in your maps and anonymous Locker Room."
    : "Round logged. Your Scorecard and maps have been updated.");
  await loadPortalData();
  const loggedToken = moon.moonDay >= 28 ? "28plus" : String(moon.moonDay);
  selectedMoonDayToken = loggedToken;
  renderPortal();
  moonDashboardCard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function averageScore(logs = roundLogs) {
  return averageValidGolfScore(logs);
}

function bestScore(logs = roundLogs) {
  return bestValidGolfScore(logs);
}

function dayTokenForValue(day) {
  return Number(day) >= 28 ? "28plus" : String(Number(day));
}

function dayLabelForToken(token) {
  return token === "28plus" ? "28+" : String(token || "—");
}

function logsForDayToken(token) {
  return roundLogs.filter((log) => dayTokenForValue(log.moon_day) === token);
}

function latestSwingThought() {
  const latest = roundLogs.find((entry) => clean(entry.swing_thoughts));
  return latest?.swing_thoughts || "No swing thought logged yet.";
}

function renderMoonDayDetail(token) {
  const display = dayLabelForToken(token);
  const dayForPhase = token === "28plus" ? 28 : Number(token);
  const phase = phaseForMoonDay(dayForPhase);
  const matching = logsForDayToken(token).slice(0, 6);
  $("selectedDayTitle").textContent = `Moon Day ${display} · ${shortPhase(phase)}`;
  const node = $("selectedDayContent");
  if (!node) return;
  if (!matching.length) {
    node.innerHTML = `<div class="cm-empty">Nothing has been logged on Moon Day ${escapeHtml(display)} yet.<br>${escapeHtml(caddieTheme(phase))}</div>`;
    return;
  }
  node.innerHTML = matching.map((entry) => {
    const isReflection = entry.entry_type === "reflection" || entry.score === null;
    const heading = isReflection
      ? `${formatDate(entry.round_date)} · Swing Thought`
      : `${formatDate(entry.round_date)} · ${entry.course_played || "Round"}`;
    const scoreMarkup = isReflection ? "" : `<strong>${escapeHtml(entry.score)}</strong>`;
    const thought = clean(entry.swing_thoughts)
      ? `<p>${escapeHtml(entry.swing_thoughts)}</p>`
      : `<p class="cm-no-thought">No swing thought recorded.</p>`;
    return `
      <article class="cm-day-round">
        <div class="cm-day-round-score">
          <span>${escapeHtml(heading)}</span>
          ${scoreMarkup}
        </div>
        ${thought}
      </article>
    `;
  }).join("");
}

function positionMoonDayButtons() {
  const buttons = document.querySelectorAll(".cm-day-button");
  const radius = window.innerWidth <= 430 ? 44.5 : 45;
  buttons.forEach((button, index) => {
    const angle = 170 - (index * (360 / 28));
    const radians = angle * Math.PI / 180;
    button.style.left = `${50 + (Math.cos(radians) * radius)}%`;
    button.style.top = `${50 + (Math.sin(radians) * radius)}%`;
  });
}

function renderMoonWheel(currentMoonDay) {
  const ring = $("moonDayRing");
  if (!ring) return;
  const currentToken = dayTokenForValue(currentMoonDay);
  if (!selectedMoonDayToken) selectedMoonDayToken = currentToken;
  const tokens = [...Array.from({ length: 27 }, (_, index) => String(index + 1)), "28plus"];
  ring.innerHTML = tokens.map((token) => {
    const classes = ["cm-day-button"];
    if (token === currentToken) classes.push("is-today");
    if (token === selectedMoonDayToken) classes.push("is-selected");
    if (logsForDayToken(token).length) classes.push("has-round");
    const label = dayLabelForToken(token);
    return `<button class="${classes.join(" ")}" type="button" data-moon-day="${token}" aria-label="Open Moon Day ${label}">${label}</button>`;
  }).join("");
  positionMoonDayButtons();
  ring.querySelectorAll(".cm-day-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMoonDayToken = button.dataset.moonDay;
      renderMoonWheel(currentMoonDay);
      renderMoonDayDetail(selectedMoonDayToken);
    });
  });
  renderMoonDayDetail(selectedMoonDayToken);
}

function renderMoonDashboard() {
  const today = todayISO();
  const moon = getMoonMagic(today);
  $("moonSnapshotEyebrow").textContent = `MOON SCORE DATA · ${formatDate(today).toUpperCase()}`;
  $("moonDashboardTitle").textContent = `The moon is on day ${moon.moonDay}.`;
  $("moonDashboardCopy").textContent = "Click on any day on the moon wheel to view your stored data. Over time, your patterns will be revealed.";
  $("moonDayValue").textContent = `Day ${moon.moonDay}`;
  $("moonPhaseValue").textContent = moonLabelForDate(today, moon.phase);
  $("moonPhaseClubValue").textContent = compassClubCopy(moon.phase);
  $("moonThemeValue").textContent = caddieTheme(moon.phase);
  const nextNewMoonDate = moon.nextNewMoonDate;
  const nextFullMoonDate = nextFullMoonISO(moon, today);
  const nextMoonIsFull = String(nextFullMoonDate || "") <= String(nextNewMoonDate || "");
  const nextMoonLabel = $("nextRelevantMoonLabel");
  const nextMoonValue = $("nextRelevantMoonValue");
  if(nextMoonLabel) nextMoonLabel.textContent = nextMoonIsFull ? "Next Full Moon" : "Next New Moon";
  if(nextMoonValue) nextMoonValue.textContent = formatDate(nextMoonIsFull ? nextFullMoonDate : nextNewMoonDate);
  renderMoonWheel(moon.moonDay);
}

function caddieProfileLifecycle() {
  return String(caddieProfile?.status || "").toLowerCase();
}

function renderCaddieDeskDoor() {
  const node = $("caddieDeskDoor");
  if (!node) return;
  if (!caddieProfile) {
    node.classList.add("hidden");
    node.innerHTML = "";
    return;
  }
  const status = caddieProfileLifecycle();
  node.classList.remove("hidden");
  if (["invited", "draft", "submitted"].includes(status)) {
    node.innerHTML = `
      <a class="cm-caddie-desk-link" href="/caddie-magic/caddie-desk/">
        <span>Caddie Network Invitation</span>
        <strong>Complete Your Caddie Profile</strong>
        <small>${status === "submitted" ? "Your profile is submitted for Caddie Master review." : "Build and submit the professional profile connected to your Player account."}</small>
      </a>`;
    return;
  }
  if (["approved", "active"].includes(status)) {
    node.innerHTML = `
      <a class="cm-caddie-desk-link" href="/caddie-magic/caddie-desk/">
        <span>Caddie Concierge Team</span>
        <strong>Enter the Caddie Desk</strong>
        <small>Manage your Caddie profile, Player requests, availability, and consultations.</small>
      </a>`;
    return;
  }
  node.innerHTML = `
    <div class="cm-caddie-desk-status">
      <span>Caddie Desk · ${escapeHtml(titleCase(status || "Status"))}</span>
      <strong>${status === "paused" ? "Your Caddie service access is paused." : "Your Caddie pathway is not active."}</strong>
      <small>Your Player Profile and history remain available.</small>
    </div>`;
}

function assignmentClub(assignment) {
  if (assignment.assigned_club) return assignment.assigned_club;
  if (assignment.direction === "center") return "Putter";
  if (assignment.direction === "general") return "Whole Compass";
  return titleCase(assignment.direction);
}

function assignmentMarkup(assignment, completed = false) {
  const due = assignment.due_date ? `Due ${formatDate(assignment.due_date)}` : "No fixed due date";
  const direction = assignment.direction === "general" ? "Compass Assignment" : `${titleCase(assignment.direction)} · ${assignmentClub(assignment)}`;
  const response = assignment.player_response || "";
  return `
    <article class="cm-assignment ${completed ? "is-completed" : ""}" data-assignment-card="${escapeHtml(assignment.id)}">
      <div class="cm-assignment-topline">
        <div>
          <div class="cm-assignment-meta">
            ${assignment.moon_phase ? `<span>${escapeHtml(assignment.moon_phase)}</span>` : ""}
            <span>${escapeHtml(direction)}</span>
            <span>${escapeHtml(due)}</span>
          </div>
          <h3>${escapeHtml(assignment.title)}</h3>
        </div>
        <span class="cm-status-pill">${escapeHtml(titleCase(assignment.status))}</span>
      </div>
      <p>${escapeHtml(assignment.instructions || "")}</p>
      ${completed
        ? `<div class="cm-assignment-completion"><strong>Your completion note</strong><p>${response ? escapeHtml(response) : "Completed without a written reflection."}</p></div>`
        : `<div class="cm-assignment-response">
            <textarea rows="3" data-assignment-response="${escapeHtml(assignment.id)}" placeholder="What did you notice? What changed?">${escapeHtml(response)}</textarea>
            <div class="cm-assignment-actions">
              ${assignment.status === "assigned" ? `<button class="cm-button secondary" type="button" data-assignment-start="${escapeHtml(assignment.id)}">Begin Assignment</button>` : ""}
              <button class="cm-button" type="button" data-assignment-complete="${escapeHtml(assignment.id)}">Complete Assignment</button>
            </div>
          </div>`}
    </article>`;
}

function renderAssignments() {
  const node = $("assignmentList");
  if (!node) return;
  const { active, completed } = activeAssignmentsSummary();
  $("assignmentCount").textContent = `${active.length} active`;
  node.innerHTML = `
    <div class="cm-assignment-group">
      <h3>Current Assignments</h3>
      ${active.length ? active.map((item) => assignmentMarkup(item)).join("") : `<div class="cm-empty">No active assignments from The Caddie Master.</div>`}
    </div>
    <details class="cm-completed-assignments">
      <summary>Completed Assignments · ${completed.length}</summary>
      <div class="cm-assignment-group">${completed.length ? completed.map((item) => assignmentMarkup(item, true)).join("") : `<div class="cm-empty">Completed assignments will be preserved here.</div>`}</div>
    </details>`;
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

async function updateAssignment(id, status, response = "") {
  const card = document.querySelector(`[data-assignment-card="${CSS.escape(id)}"]`);
  card?.classList.add("is-busy");
  setMessage($("assignmentMessage"), "Saving your assignment...");
  try {
    await updateMyCompassAssignment(id, status, response);
    compassAssignments = await getCompassAssignments(playerProfile.id);
    renderAssignments();
    renderStats();
    setMessage($("assignmentMessage"), status === "completed" ? "Assignment completed." : "Assignment started.");
  } catch (error) {
    setMessage($("assignmentMessage"), error?.message || "The assignment could not be updated.", true);
  } finally {
    card?.classList.remove("is-busy");
  }
}

function renderMasterMessages() {
  const lock = $("masterMessagesLock");
  const thread = $("masterMessagesThread");
  const form = $("masterMessageForm");
  const button = $("toggleMasterMessagesButton");
  if (!lock || !thread || !form || !button) return;
  const enabled = Boolean(caddieMasterAccess?.vip_messaging_enabled);
  button.disabled = !enabled;
  button.textContent = enabled ? (masterMessagesExpanded ? "Close Messages" : "Messages") : "VIP Access Locked";
  lock.innerHTML = enabled
    ? `<p>Your private luxury-concierge channel with The Caddie Master is open until access is revoked.</p>`
    : `<p>VIP messaging is reserved for Players granted personalized Caddie Master access.</p>`;
  thread.classList.toggle("hidden", !enabled || !masterMessagesExpanded);
  form.classList.toggle("hidden", !enabled || !masterMessagesExpanded);
  if (!enabled || !masterMessagesExpanded) return;
  thread.innerHTML = compassDispatches.length
    ? compassDispatches.map((dispatch) => {
        const isPlayer = dispatch.sender_role === "player";
        return `<article class="cm-thread-message ${isPlayer ? "is-player" : "is-master"}">
          <span>${isPlayer ? "You" : "The Caddie Master"} · ${escapeHtml(formatDateTime(dispatch.created_at))}</span>
          <p>${escapeHtml(dispatch.message_body || "")}</p>
        </article>`;
      }).join("")
    : `<div class="cm-empty">Your private conversation is ready.</div>`;
  thread.scrollTop = thread.scrollHeight;
}

function toggleMasterMessages() {
  if (!caddieMasterAccess?.vip_messaging_enabled) return;
  masterMessagesExpanded = !masterMessagesExpanded;
  renderMasterMessages();
}

async function sendMasterMessage(event) {
  event?.preventDefault();
  const input = $("masterMessageInput");
  const message = clean(input?.value);
  if (!message || !playerProfile) return;
  setMessage($("masterMessageStatus"), "Sending your message...");
  try {
    await sendCompassDispatch(playerProfile.id, message);
    compassDispatches = await getCompassDispatches(playerProfile.id);
    if (input) input.value = "";
    renderMasterMessages();
    setMessage($("masterMessageStatus"), "Message sent to The Caddie Master.");
  } catch (error) {
    setMessage($("masterMessageStatus"), error?.message || "Your message could not be sent.", true);
  }
}

function renderStats() {
  const statGrid = $("statGrid");
  if (!statGrid) return;

  const assignmentsSummary = activeAssignmentsSummary();
  const nextEvent = nextUpcomingGolfEvent();
  const nextForecast = Array.isArray(nextEvent?.moon_forecast) ? nextEvent.moon_forecast[0] : null;
  const nextEventTitle = nextEvent?.title || nextEvent?.event_title || "Upcoming Golf";
  const caddieRequest = activeCaddieRequest();
  const consultation = nextConsultation();
  const requestTitle = caddieRequest
    ? (caddieRequest.status === "accepted" ? (caddieRequest.caddie_name || "Caddie Accepted") : "Request Pending")
    : "Find a Caddie";
  const requestCopy = consultation
    ? `Consultation ${escapeHtml(formatDateTime(consultation.starts_at))}`
    : caddieRequest?.status === "accepted"
      ? "Accepted · Open private consultation availability."
      : caddieRequest?.status === "requested"
        ? `Request sent to ${escapeHtml(caddieRequest.caddie_name || "your Caddie")}.`
        : "Browse approved Caddies and prepare for your golf experience.";

  statGrid.innerHTML = `
    <a class="cm-stat cm-stat-link" href="#assignmentsCard">
      <span>Assignments</span>
      <strong>${assignmentsSummary.active.length} active</strong>
      <small>${assignmentsSummary.completed.length} completed · Work from The Caddie Master.</small>
    </a>
    <a class="cm-stat cm-stat-link" href="/caddie-magic/compass/">
      <span>Caddie Compass</span>
      <strong>${activeCompass ? "Four Clubs Open" : "Set Your Compass"}</strong>
      <small>${activeCompass ? "Enter North, East, South, or West to study that phase." : "Name your four Cardinal Clubs to open the Club Rooms."}</small>
    </a>
    <a class="cm-stat cm-stat-link" href="/caddie-magic/caddies/">
      <span>Caddie Network</span>
      <strong>${escapeHtml(requestTitle)}</strong>
      <small>${requestCopy}</small>
    </a>
    <a class="cm-stat cm-stat-link" href="/caddie-magic/compass/#calendar">
      <span>Calendar</span>
      <strong>${nextEvent ? escapeHtml(nextEventTitle) : "No Upcoming Golf"}</strong>
      <small>${nextEvent ? `${escapeHtml(formatDate(nextEvent.date_start))}${nextEvent.course ? ` · ${escapeHtml(nextEvent.course)}` : ""}${nextForecast ? ` · Day ${escapeHtml(nextForecast.moon_day || "—")} · ${escapeHtml(moonLabelForDate(nextForecast.date, nextForecast.moon_phase))}` : ""}` : "Add your next round, tournament, or trip."}</small>
    </a>
  `;
  renderCaddieDeskDoor();
}

function renderNotes() {
  const node = $("notesUnderDoor");
  if (!node) return;
  if (!playerNotes.length) {
    node.innerHTML = `<div class="cm-empty">No Scorecard Review notes from The Caddie Master yet. Keep logging entries toward your next review credit.</div>`;
    return;
  }
  node.innerHTML = playerNotes.map((note) => `
    <article class="cm-note">
      <strong>${escapeHtml(note.note_title || "A Caddie Master Note")}</strong>
      <p>${escapeHtml(note.note_body || "")}</p>
      <small>${formatDate(note.created_at)}</small>
    </article>
  `).join("");
}

function activeReviewRequest() {
  return reviewRequests.find((request) => request.status === "requested") || null;
}

function latestCompletedReview() {
  return reviewRequests.find((request) => request.status === "completed") || null;
}

function renderReviewService() {
  const button = $("requestReviewButton");
  const copy = $("reviewRequestCopy");
  const progress = $("reviewProgressBar");
  const label = $("reviewProgressLabel");
  if (!button || !copy) return;

  const pending = activeReviewRequest();
  const completed = latestCompletedReview();
  const total = Number(caddieMasterAccess?.total_entries ?? roundLogs.length);
  const towardNext = Number(caddieMasterAccess?.entries_toward_next_credit ?? (total % 28));
  const available = Number(caddieMasterAccess?.available_review_credits ?? Math.max(0, Math.floor(total / 28) - reviewRequests.filter((item) => item.status === "completed").length));
  const progressValue = available > 0 ? 28 : towardNext;
  if (progress) progress.style.width = `${Math.min(100, (progressValue / 28) * 100)}%`;
  if (label) label.textContent = available > 0
    ? `${available} review credit${available === 1 ? "" : "s"} ready`
    : `${towardNext} of 28 entries toward your next review`;

  if (pending) {
    button.disabled = true;
    button.textContent = "Review Requested";
    copy.textContent = "Your request is waiting with The Caddie Master. One request may be pending at a time.";
    return;
  }

  button.disabled = available < 1;
  button.textContent = available > 0 ? "Use One Review Credit" : "Request a Scorecard Review";
  copy.textContent = available > 0
    ? `You have ${available} Scorecard Review credit${available === 1 ? "" : "s"}. One credit is used when you submit this request.`
    : completed
      ? "Your last review is complete. Every 28 new entries earns another review credit."
      : "Log any combination of scores and swing thoughts. Every 28 entries earns one Scorecard Review credit.";
}

async function requestScoreReview() {
  const button = $("requestReviewButton");
  const message = $("reviewRequestMessage");
  if (!button || button.disabled) return;

  button.disabled = true;
  button.textContent = "Using Review Credit...";
  setMessage(message, "Sending your Scorecard to The Caddie Master...");

  try {
    await requestCaddieReview();
    const [reviews, access] = await Promise.all([
      fetchReviewRequests(),
      getMyCaddieMasterAccess(),
    ]);
    reviewRequests = reviews;
    caddieMasterAccess = access;
    renderReviewService();
    setMessage(message, "Your Scorecard Review request is waiting with The Caddie Master.");
  } catch (error) {
    console.error("Scorecard Review request failed.", error);
    renderReviewService();
    setMessage(message, error?.message || "Your Scorecard Review request could not be sent.", true);
  }
}

function renderHistory() {
  const node = $("roundHistory");
  if (!node) return;
  if (!roundLogs.length) {
    node.innerHTML = `<div class="cm-empty">Your first score or swing thought is waiting.</div>`;
    return;
  }
  node.innerHTML = `<div class="cm-history-list">${roundLogs.map((entry) => {
    const isReflection = entry.entry_type === "reflection" || entry.score === null;
    const title = isReflection ? "Swing Thought" : (entry.course_played || "Round");
    const thought = clean(entry.swing_thoughts)
      ? `${escapeHtml(entry.swing_thoughts)}`
      : "No swing thought recorded.";
    return `
      <article class="cm-round-row">
        <div><span class="cm-tag">${escapeHtml(formatDate(entry.round_date))}</span></div>
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${thought}</p>
        </div>
        <div>
          ${isReflection ? "" : `<strong>${escapeHtml(entry.score)}</strong>`}
          <div class="cm-round-meta">
            <span class="cm-tag">Moon Day ${escapeHtml(entry.moon_day || "—")}</span>
            <span class="cm-tag">${escapeHtml(shortPhase(entry.moon_phase))}</span>
          </div>
        </div>
      </article>
    `;
  }).join("")}</div>`;
}

function renderSharingSetting() {
  const toggle = $("lockerRoomSharingToggle");
  if (!toggle) return;
  toggle.checked = playerProfile?.share_anonymously !== false;
}

async function updateLockerRoomSharing() {
  const toggle = $("lockerRoomSharingToggle");
  const message = $("lockerRoomSharingMessage");
  if (!toggle || !playerProfile) return;
  toggle.disabled = true;
  setMessage(message, "Updating Locker Room sharing...");
  try {
    const { data, error } = await supabase.rpc("caddie_magic_set_locker_room_sharing", {
      p_enabled: toggle.checked,
    });
    if (error) throw error;
    playerProfile = Array.isArray(data) ? (data[0] || playerProfile) : (data || playerProfile);
    roundLogs = roundLogs.map((entry) => ({ ...entry, share_anonymously: toggle.checked }));
    setMessage(message, toggle.checked
      ? "Your scores and swing thoughts may appear anonymously in the Locker Room."
      : "Your scores and swing thoughts are hidden from the Locker Room.");
  } catch (error) {
    console.error(error);
    toggle.checked = !toggle.checked;
    const missingMigration = String(error?.message || "").toLowerCase().includes("caddie_magic_set_locker_room_sharing");
    setMessage(message, missingMigration
      ? "Locker Room sharing controls require migration 043."
      : (error?.message || "Locker Room sharing could not be updated."), true);
  } finally {
    toggle.disabled = false;
  }
}

function renderPortal() {
  $("lockerTitle").textContent = displayName();
  renderMoonDashboard();
  renderStats();
  renderAssignments();
  renderNotes();
  renderReviewService();
  renderMasterMessages();
  renderSharingSetting();
  renderHistory();
}

async function bootPortal(seed = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    currentUser = currentUser || data.session?.user || null;
    if (!currentUser) {
      showState("auth");
      return;
    }
    await requireCaddieMagicAccess();
    $("roundDate").value = todayISO();
    $("roundDate").max = todayISO();
    playerProfile = await fetchPlayerProfile();
    if (!playerProfile) {
      hydrateProfileForm(seed);
      showState("profile");
      setMessage(profileMessage, "Set your Player Profile once. Then every score and reflection has somewhere to land.");
      return;
    }
    hydrateProfileForm();
    await loadPortalData();
    renderPortal();
    showState("portal");
  } catch (error) {
    console.error(error);
    showState("auth");
    setMessage(authMessage, error?.message || "Caddie Magic could not open. Confirm the v0.1.0 Supabase migration has been run.", true);
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scrollToPortalTarget(targetId) {
  const target = currentUser && playerProfile ? $(targetId) : (currentUser ? profileCard : authCard);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setEntryMode(mode) {
  entryMode = mode === "reflection" ? "reflection" : "round";
  const isReflection = entryMode === "reflection";
  document.querySelectorAll(".cm-round-only-field").forEach((field) => field.classList.toggle("hidden", isReflection));
  document.querySelectorAll(".cm-date-field").forEach((field) => field.classList.toggle("hidden", isReflection));
  $("coursePlayed").required = false;
  $("roundScore").required = !isReflection;
  $("roundDate").required = !isReflection;
  $("roundDate").value = todayISO();
  $("swingThoughts").required = isReflection;
  $("roundModeButton")?.classList.toggle("is-active", !isReflection);
  $("reflectionModeButton")?.classList.toggle("is-active", isReflection);
  $("entryFormTitle").textContent = isReflection ? "Log Your Thoughts" : "Log Your Round";
  $("entrySubmitButton").textContent = isReflection ? "Log Your Thoughts" : "Log Round";
  $("entryModeCopy").textContent = isReflection
    ? "No round required. Leave the swing thought you want to remember."
    : "Only the essentials: date and score, with course and swing thought optional.";
  $("swingThoughtOptionalLabel").textContent = isReflection ? "Required" : "Optional";
  setMessage(roundMessage, "");
}

function bindEvents() {
  $("signInButton")?.addEventListener("click", signIn);
  $("createAccountButton")?.addEventListener("click", createAccount);
  $("profileForm")?.addEventListener("submit", savePlayerProfile);
  $("roundForm")?.addEventListener("submit", logRound);
  $("signOutButton")?.addEventListener("click", signOut);
  $("heroLogButton")?.addEventListener("click", () => scrollToPortalTarget("roundLogCard"));
  $("roundModeButton")?.addEventListener("click", () => setEntryMode("round"));
  $("reflectionModeButton")?.addEventListener("click", () => setEntryMode("reflection"));
  $("requestReviewButton")?.addEventListener("click", requestScoreReview);
  $("lockerRoomSharingToggle")?.addEventListener("change", updateLockerRoomSharing);
  $("toggleMasterMessagesButton")?.addEventListener("click", toggleMasterMessages);
  $("masterMessageForm")?.addEventListener("submit", sendMasterMessage);
  setEntryMode("round");
}

const invitationParams = new URLSearchParams(window.location.search);
const invitationCode = invitationParams.get("invite");
const invitationEmail = invitationParams.get("email");
if (invitationCode && $("authInviteCode")) $("authInviteCode").value = invitationCode;
if (invitationEmail && $("authEmail")) $("authEmail").value = invitationEmail;
if (invitationParams.get("access") === "player-only") {
  setMessage(authMessage, "Your player key opens Caddie Magic. Flowtel remains separate from this account.");
}

bindEvents();
bootPortal();
