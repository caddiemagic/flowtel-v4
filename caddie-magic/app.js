// Caddie Magic v0.1.0 — Moon Score Tracker Foundation

import { supabase } from "../shared/supabase.js";
import { getMoonMagic } from "../shared/moon.js";

const $ = (id) => document.getElementById(id);

const authCard = $("authCard");
const profileCard = $("profileCard");
const portalGrid = $("portalGrid");
const scoreMapCard = $("scoreMapCard");
const historyCard = $("historyCard");
const authMessage = $("authMessage");
const profileMessage = $("profileMessage");
const roundMessage = $("roundMessage");

let currentUser = null;
let playerProfile = null;
let roundLogs = [];
let playerNotes = [];

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
  if (value.includes("new") && !value.includes("half")) return "New Moon Phase";
  if (value.includes("half full") || value.includes("first")) return "Half Full Moon Phase";
  if (value.includes("full") && !value.includes("half")) return "Full Moon Phase";
  if (value.includes("half new") || value.includes("third")) return "Half New Moon Phase";
  return phase || "Moon Phase";
}

function displayName(profile = playerProfile) {
  const name = clean(`${profile?.first_name || ""} ${profile?.last_name || ""}`);
  return name || currentUser?.email || "Player";
}

function showState(state) {
  authCard?.classList.toggle("hidden", state !== "auth");
  profileCard?.classList.toggle("hidden", state !== "profile");
  portalGrid?.classList.toggle("hidden", state !== "portal");
  scoreMapCard?.classList.toggle("hidden", state !== "portal");
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
  showState("auth");
  setMessage(authMessage, "You have left the clubhouse.");
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
  setMessage(profileMessage, "Saving your locker plate...");
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
    setMessage(profileMessage, "Add at least a first name to set your locker plate.", true);
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
  setMessage(profileMessage, "Locker plate set.");
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

async function loadPortalData() {
  if (!playerProfile) return;
  const [logs, notes] = await Promise.all([fetchRoundLogs(), fetchPlayerNotes()]);
  roundLogs = logs;
  playerNotes = notes;
}

async function logRound(event) {
  event?.preventDefault();
  setMessage(roundMessage, "Logging your round with the moon...");
  if (!playerProfile) {
    setMessage(roundMessage, "Set your Player Locker before logging rounds.", true);
    return;
  }
  const roundDate = $("roundDate")?.value || todayISO();
  const coursePlayed = clean($("coursePlayed")?.value);
  const score = scoreNumber($("roundScore")?.value);
  const swingThoughts = clean($("swingThoughts")?.value);
  if (!roundDate || !coursePlayed || !score || !swingThoughts) {
    setMessage(roundMessage, "Date, course, score, and swing thoughts are required.", true);
    return;
  }
  const moon = getMoonMagic(roundDate);
  const payload = {
    player_profile_id: playerProfile.id,
    user_id: currentUser.id,
    round_date: roundDate,
    course_played: coursePlayed,
    score,
    swing_thoughts: swingThoughts,
    moon_day: moon.moonDay,
    moon_phase: normalizePhase(moon.phase),
    moon_inner_season: moon.innerSeason,
    moon_last_new_moon_date: moon.lastNewMoonDate,
    moon_next_new_moon_date: moon.nextNewMoonDate,
  };
  const { error } = await supabase.from("caddie_magic_round_logs").insert(payload);
  if (error) {
    setMessage(roundMessage, error.message || "This round could not be logged.", true);
    return;
  }
  $("coursePlayed").value = "";
  $("roundScore").value = "";
  $("swingThoughts").value = "";
  $("roundDate").value = todayISO();
  setMessage(roundMessage, "Round logged. Your locker has been updated.");
  await loadPortalData();
  renderPortal();
  document.getElementById("lockerCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function averageScore(logs = roundLogs) {
  if (!logs.length) return null;
  return Math.round((logs.reduce((sum, log) => sum + Number(log.score || 0), 0) / logs.length) * 10) / 10;
}

function bestScore(logs = roundLogs) {
  if (!logs.length) return null;
  return Math.min(...logs.map((log) => Number(log.score)).filter(Number.isFinite));
}

function renderStats() {
  const latest = roundLogs[0];
  const avg = averageScore();
  const best = bestScore();
  const statGrid = $("statGrid");
  if (!statGrid) return;
  statGrid.innerHTML = `
    <article class="cm-stat"><span>Latest Score</span><strong>${latest?.score ?? "—"}</strong><small>${latest ? `${escapeHtml(latest.course_played)} · ${formatDate(latest.round_date)}` : "Log your first round."}</small></article>
    <article class="cm-stat"><span>Total Rounds</span><strong>${roundLogs.length}</strong><small>Stored in your moon score archive.</small></article>
    <article class="cm-stat"><span>Best Score</span><strong>${best ?? "—"}</strong><small>${best ? "Lowest number in the locker." : "Waiting on the first card."}</small></article>
    <article class="cm-stat"><span>Average</span><strong>${avg ?? "—"}</strong><small>Updates as your pattern grows.</small></article>
  `;
}

function renderNotes() {
  const node = $("notesUnderDoor");
  if (!node) return;
  if (!playerNotes.length) {
    node.innerHTML = `<div class="cm-empty">No notes have been left under your door yet. Keep logging rounds; the pattern needs a little moonlight before it speaks.</div>`;
    return;
  }
  node.innerHTML = playerNotes.map((note) => `
    <article class="cm-note">
      <strong>${escapeHtml(note.note_title || "A note under your door")}</strong>
      <p>${escapeHtml(note.note_body || "")}</p>
      <small>${formatDate(note.created_at)}</small>
    </article>
  `).join("");
}

function phaseDefinitions() {
  return [
    { phase: "New Moon Phase", label: "New Moon", cue: "Reset. Rebuild. Choose the thought." },
    { phase: "Half Full Moon Phase", label: "Half Full Moon", cue: "Commit. Test. Trust the line." },
    { phase: "Full Moon Phase", label: "Full Moon", cue: "Perform. Be seen. Hold the pressure." },
    { phase: "Half New Moon Phase", label: "Half New Moon", cue: "Review. Release. Stop forcing the fix." },
  ];
}

function renderMoonScoreMap() {
  const node = $("moonScoreMap");
  if (!node) return;
  node.innerHTML = phaseDefinitions().map((item) => {
    const logs = roundLogs.filter((log) => normalizePhase(log.moon_phase) === item.phase);
    const avg = averageScore(logs);
    const best = bestScore(logs);
    const thoughts = logs.slice(0, 3).map((log) => `<div class="cm-thought">“${escapeHtml(log.swing_thoughts)}”<br><span class="cm-tag">${escapeHtml(log.course_played)} · ${log.score}</span></div>`).join("");
    return `
      <article class="cm-phase-card">
        <h3>${item.label}</h3>
        <p class="cm-muted">${item.cue}</p>
        <div class="cm-phase-stats">
          <span>Rounds: ${logs.length}</span>
          <span>Average: ${avg ?? "—"}</span>
          <span>Best: ${best ?? "—"}</span>
        </div>
        <div class="cm-thought-list">${thoughts || `<div class="cm-empty">No rounds logged here yet.</div>`}</div>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  const node = $("roundHistory");
  if (!node) return;
  if (!roundLogs.length) {
    node.innerHTML = `<div class="cm-empty">Your first scorecard is waiting. Log a round to begin collecting the pattern.</div>`;
    return;
  }
  node.innerHTML = `<div class="cm-history-list">${roundLogs.map((log) => `
    <article class="cm-round-row">
      <div><span class="cm-tag">${formatDate(log.round_date)}</span></div>
      <div>
        <h3>${escapeHtml(log.course_played)}</h3>
        <p>${escapeHtml(log.swing_thoughts)}</p>
      </div>
      <div>
        <strong>${log.score}</strong>
        <span class="cm-tag">Moon Day ${log.moon_day || "—"}</span>
        <span class="cm-tag">${escapeHtml(log.moon_phase || "Moon Phase")}</span>
      </div>
    </article>
  `).join("")}</div>`;
}

function renderPortal() {
  $("lockerTitle").textContent = `${displayName()}'s Locker`;
  renderStats();
  renderNotes();
  renderMoonScoreMap();
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
      setMessage(profileMessage, "Set your Player Locker once. Then every round has somewhere to land.");
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

function bindEvents() {
  $("signInButton")?.addEventListener("click", signIn);
  $("createAccountButton")?.addEventListener("click", createAccount);
  $("profileForm")?.addEventListener("submit", savePlayerProfile);
  $("roundForm")?.addEventListener("submit", logRound);
  $("signOutButton")?.addEventListener("click", signOut);
  $("heroLogButton")?.addEventListener("click", () => $("roundLogCard")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  $("heroLockerButton")?.addEventListener("click", () => $("lockerCard")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

bindEvents();
bootPortal();
