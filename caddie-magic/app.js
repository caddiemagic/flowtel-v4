// Caddie Magic v0.3.0 — Scorecard + Caddie Compass Doorway

import { supabase } from "../shared/supabase.js";
import { getMoonMagic } from "../shared/moon.js";
import { getMyCaddieReviewRequests, requestCaddieReview } from "../shared/caddie-magic-reviews.js?v=0.3.0";

const $ = (id) => document.getElementById(id);

const authCard = $("authCard");
const profileCard = $("profileCard");
const moonDashboardCard = $("moonDashboardCard");
const portalGrid = $("portalGrid");
const historyCard = $("historyCard");
const authMessage = $("authMessage");
const profileMessage = $("profileMessage");
const roundMessage = $("roundMessage");

let currentUser = null;
let playerProfile = null;
let roundLogs = [];
let playerNotes = [];
let reviewRequests = [];
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
  if (normalized === "New Moon Phase") return "New Moon";
  if (normalized === "Half Full Moon Phase") return "First Quarter";
  if (normalized === "Full Moon Phase") return "Full Moon";
  if (normalized === "Half New Moon Phase") return "Last Quarter";
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

function showState(state) {
  authCard?.classList.toggle("hidden", state !== "auth");
  profileCard?.classList.toggle("hidden", state !== "profile");
  moonDashboardCard?.classList.toggle("hidden", state !== "portal");
  portalGrid?.classList.toggle("hidden", state !== "portal");
  historyCard?.classList.toggle("hidden", state !== "portal");
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
  await bootPortal();
}

async function createAccount() {
  setMessage(authMessage, "Creating your player profile...");
  const email = clean($("authEmail")?.value).toLowerCase();
  const password = $("authPassword")?.value || "";
  const firstName = clean($("authFirstName")?.value);
  const lastName = clean($("authLastName")?.value);
  if (!email || !password) {
    setMessage(authMessage, "Enter an email and password first.", true);
    return;
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName, source: "caddie_magic" } },
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
      console.warn("Caddie Review Service is waiting for migration 041.", error);
      return [];
    }
    throw error;
  }
}

async function loadPortalData() {
  if (!playerProfile) return;
  const [logs, notes, reviews] = await Promise.all([fetchRoundLogs(), fetchPlayerNotes(), fetchReviewRequests()]);
  roundLogs = logs;
  playerNotes = notes;
  reviewRequests = reviews;
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
    share_anonymously: true,
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
  const scores = logs.filter((log) => log.score !== null && log.score !== "").map((log) => Number(log.score)).filter(Number.isFinite);
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

function bestScore(logs = roundLogs) {
  const scores = logs.filter((log) => log.score !== null && log.score !== "").map((log) => Number(log.score)).filter(Number.isFinite);
  return scores.length ? Math.min(...scores) : null;
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
  buttons.forEach((button, index) => {
    const angle = 170 - (index * (360 / 28));
    const radians = angle * Math.PI / 180;
    const radius = 44;
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
  $("moonDashboardTitle").textContent = `You’re on Moon Day ${moon.moonDay}`;
  $("moonDashboardCopy").textContent = roundLogs.length
    ? "Open a moon day to review the score and swing thought stored there. Over time, the pattern becomes the caddie."
    : "Log your scores and swing thoughts with the moon. After a few rounds, the pattern will begin to speak back.";
  $("lastNewMoonValue").textContent = formatDate(moon.lastNewMoonDate);
  $("moonDayValue").textContent = `Day ${moon.moonDay}`;
  $("moonPhaseValue").textContent = shortPhase(moon.phase);
  $("moonThemeValue").textContent = caddieTheme(moon.phase);
  $("swingThoughtValue").textContent = latestSwingThought();
  renderMoonWheel(moon.moonDay);
}

function renderStats() {
  const scoredRounds = roundLogs.filter((entry) => entry.score !== null && entry.score !== "" && Number.isFinite(Number(entry.score)));
  const latestRound = scoredRounds[0] || null;
  const latestThoughtEntry = roundLogs.find((entry) => clean(entry.swing_thoughts)) || null;
  const latestEntry = roundLogs[0] || null;
  const statGrid = $("statGrid");
  if (!statGrid) return;
  if (!latestEntry) {
    statGrid.innerHTML = `<div class="cm-empty">Your first score or swing thought is waiting.</div>`;
    return;
  }
  statGrid.innerHTML = `
    <article class="cm-stat">
      <span>Latest Score</span>
      <strong>${latestRound ? escapeHtml(latestRound.score) : "—"}</strong>
      <small>${latestRound ? `${escapeHtml(latestRound.course_played || "Round")} · ${escapeHtml(formatDate(latestRound.round_date))}` : "No scored round yet"}</small>
    </article>
    <article class="cm-stat">
      <span>Moon Data</span>
      <strong>Day ${escapeHtml(latestEntry.moon_day || "—")}</strong>
      <small>${escapeHtml(shortPhase(latestEntry.moon_phase))}</small>
    </article>
    <article class="cm-stat is-wide">
      <span>Latest Swing Thought</span>
      <strong class="cm-stat-thought">${latestThoughtEntry ? escapeHtml(latestThoughtEntry.swing_thoughts) : "No swing thought logged yet."}</strong>
      <small>${scoredRounds.length} round${scoredRounds.length === 1 ? "" : "s"} logged · Best ${bestScore(scoredRounds) ?? "—"} · Average ${averageScore(scoredRounds) ?? "—"}</small>
    </article>
  `;
}

function renderNotes() {
  const node = $("notesUnderDoor");
  if (!node) return;
  if (!playerNotes.length) {
    node.innerHTML = `<div class="cm-empty">No notes have been left from your Caddie yet, keep logging rounds.</div>`;
    return;
  }
  node.innerHTML = playerNotes.map((note) => `
    <article class="cm-note">
      <strong>${escapeHtml(note.note_title || "A Caddie Note")}</strong>
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
  if (!button || !copy) return;

  const pending = activeReviewRequest();
  const completed = latestCompletedReview();
  const hasEntries = roundLogs.length > 0;

  if (pending) {
    button.disabled = true;
    button.textContent = "Review Requested";
    copy.textContent = "Your request is waiting at the Concierge Desk. Your Caddie will review your scores and swing thoughts for patterns.";
    return;
  }

  button.disabled = !hasEntries;
  button.textContent = completed ? "Request Another Review" : "Request Caddie Review";
  copy.textContent = hasEntries
    ? (completed
      ? "Your last review is complete. Read your newest Caddie Note above, or request another pattern review when you are ready."
      : "Ping your Caddie to review your scores and swing thoughts for patterns you may not see yet.")
    : "Log at least one score or swing thought before requesting a Caddie Review.";
}

async function requestScoreReview() {
  const button = $("requestReviewButton");
  const message = $("reviewRequestMessage");
  if (!button || button.disabled) return;

  button.disabled = true;
  button.textContent = "Sending Request...";
  setMessage(message, "Sending your Scorecard to the Concierge Desk...");

  try {
    await requestCaddieReview();
    reviewRequests = await fetchReviewRequests();
    renderReviewService();
    setMessage(message, "Your Caddie Review request is waiting at the Concierge Desk.");
  } catch (error) {
    console.error("Caddie Review request failed.", error);
    button.disabled = false;
    button.textContent = "Request Caddie Review";
    const missingMigration = String(error?.message || "").toLowerCase().includes("caddie_magic_request_score_review");
    setMessage(message, missingMigration
      ? "Caddie Review Service is not installed yet. Run migration 041 and refresh."
      : (error?.message || "Your Caddie Review request could not be sent."), true);
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

function renderPortal() {
  $("lockerTitle").textContent = displayName();
  renderMoonDashboard();
  renderStats();
  renderNotes();
  renderReviewService();
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
    $("roundDate").value = todayISO();
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
  setEntryMode("round");
}

bindEvents();
bootPortal();
