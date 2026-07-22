// Caddie Magic v0.4.6 — 28-Day Pattern Window + Mobile Controls

import { supabase } from "../../shared/supabase.js";
import { requireCaddieMagicAccess } from "../../shared/caddie-magic-access.js?v=0.4.6";
import { getMoonMagic } from "../../shared/moon.js";
import { averageValidGolfScore, validGolfScore } from "../../shared/caddie-magic-score-calculations.js?v=0.4.6";

const $ = (id) => document.getElementById(id);

let currentUser = null;
let playerProfile = null;
let allLogs = [];
let activeRange = "current";
let activeDisplayMode = "full";

const scoreMapParams = new URLSearchParams(window.location.search);
const requestedPlayerProfileId = scoreMapParams.get("player");
const openedFromConcierge = scoreMapParams.get("from") === "manager";

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function daysBetweenISO(start, end) {
  const startDate = new Date(`${String(start).slice(0, 10)}T12:00:00Z`);
  const endDate = new Date(`${String(end).slice(0, 10)}T12:00:00Z`);
  return Math.floor((endDate - startDate) / 86400000);
}

function firstEntryDate() {
  const dates = allLogs
    .map((entry) => String(entry.round_date || entry.created_at || "").slice(0, 10))
    .filter(Boolean)
    .sort();
  return dates[0] || "";
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

function displayName() {
  const name = `${playerProfile?.first_name || ""} ${playerProfile?.last_name || ""}`.trim();
  return name || currentUser?.email || "Player";
}

async function fetchProfile() {
  let query = supabase
    .from("caddie_magic_player_profiles")
    .select("*");

  query = requestedPlayerProfileId
    ? query.eq("id", requestedPlayerProfileId)
    : query.eq("user_id", currentUser.id);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchLogs() {
  const { data, error } = await supabase
    .from("caddie_magic_round_logs")
    .select("*")
    .eq("player_profile_id", playerProfile.id)
    .order("round_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function moonCycleStarts() {
  return [...new Set(allLogs.map((log) => log.moon_last_new_moon_date).filter(Boolean))].sort().reverse();
}

function previousMoonStart(currentStart) {
  return moonCycleStarts().find((start) => start < currentStart) || null;
}

function selectedLogs() {
  if (activeRange === "all") return allLogs;
  const currentStart = getMoonMagic(todayISO()).lastNewMoonDate;
  const targetStart = activeRange === "last" ? previousMoonStart(currentStart) : currentStart;
  if (!targetStart) return [];
  return allLogs.filter((log) => log.moon_last_new_moon_date === targetStart);
}

function rangeLabel() {
  const currentStart = getMoonMagic(todayISO()).lastNewMoonDate;
  if (activeRange === "all") return "All logged moon cycles";
  if (activeRange === "last") {
    const lastStart = previousMoonStart(currentStart);
    return lastStart ? `Moon cycle beginning ${formatDate(lastStart)}` : "No previous moon cycle logged yet";
  }
  return `Moon cycle beginning ${formatDate(currentStart)}`;
}

function averageScore(logs) {
  return averageValidGolfScore(logs);
}

function phaseDefinitions() {
  return [
    { phase: "New Moon Phase", node: "notesWest", club: "West Club" },
    { phase: "Half New Moon Phase", node: "notesNorth", club: "North Club" },
    { phase: "Half Full Moon Phase", node: "notesSouth", club: "South Club" },
    { phase: "Full Moon Phase", node: "notesEast", club: "East Club" },
  ];
}

function noteMarkup(entry) {
  const isReflection = entry.entry_type === "reflection" || entry.score === null;

  if (activeDisplayMode === "scores") {
    return `
      <button class="cm-map-note cm-score-only-note" type="button" data-entry-id="${escapeHtml(entry.id)}" aria-label="Open score ${escapeHtml(entry.score)} details">
        <span class="cm-map-note-score">${escapeHtml(entry.score)}</span>
      </button>
    `;
  }

  const thought = String(entry.swing_thoughts || "").trim() || "No swing thought recorded.";
  return `
    <button class="cm-map-note ${isReflection ? "is-reflection" : ""}" type="button" data-entry-id="${escapeHtml(entry.id)}" aria-label="Open scorecard detail">
      <span class="cm-map-note-copy">
        <p class="cm-map-note-thought">${escapeHtml(thought)}</p>
        <time class="cm-map-note-date" datetime="${escapeHtml(entry.round_date || "")}">${escapeHtml(formatDate(entry.round_date))}</time>
      </span>
      ${isReflection ? "" : `<span class="cm-map-note-score">${escapeHtml(entry.score)}</span>`}
    </button>
  `;
}

function renderQuadrants(logs) {
  const visibleLogs = activeDisplayMode === "scores"
    ? logs.filter((entry) => validGolfScore(entry.score) !== null)
    : logs;

  phaseDefinitions().forEach((definition) => {
    const node = $(definition.node);
    if (!node) return;
    const phaseLogs = visibleLogs.filter((log) => normalizePhase(log.moon_phase) === definition.phase);
    node.classList.toggle("is-scores-only", activeDisplayMode === "scores");
    node.innerHTML = phaseLogs.length
      ? phaseLogs.map(noteMarkup).join("")
      : `<div class="cm-map-empty">${activeDisplayMode === "scores" ? "No scores" : "No entries"} have landed in ${escapeHtml(definition.club)} for this view.</div>`;
  });
  bindScoreCards();
  return visibleLogs;
}

function renderSnapshot() {
  const moon = getMoonMagic(todayISO());
  $("mapMoonDay").textContent = moon.moonDay;
  $("mapMoonPhase").textContent = shortPhase(moon.phase);
  $("mapMoonTheme").textContent = caddieTheme(moon.phase);
}

function renderInsights(logs) {
  const node = $("roundInsights");
  if (!node) return;
  const firstDate = firstEntryDate();

  if (!firstDate) {
    node.innerHTML = `
      <article class="cm-insight is-wide">
        <span class="cm-insight-icon">◐</span>
        <span><strong>Insights begin 28 days after your first entry.</strong><br>Track daily to give your Caddie a clear view of one complete moon cycle.</span>
      </article>
    `;
    return;
  }

  const unlockDate = addDaysISO(firstDate, 28);
  const remaining = Math.max(0, daysBetweenISO(todayISO(), unlockDate));
  const trackedDays = Math.min(28, Math.max(1, daysBetweenISO(firstDate, todayISO()) + 1));

  if (remaining > 0) {
    node.innerHTML = `
      <article class="cm-insight is-wide">
        <span class="cm-insight-icon">${trackedDays}</span>
        <span><strong>${remaining} day${remaining === 1 ? "" : "s"} until your first pattern window opens.</strong><br>Insights begin ${escapeHtml(formatDate(unlockDate))}. Keep tracking daily so the full swing cycle can reveal itself.</span>
      </article>
    `;
    return;
  }

  const groups = phaseDefinitions().map((definition) => {
    const phaseLogs = logs.filter((log) => normalizePhase(log.moon_phase) === definition.phase);
    return { ...definition, logs: phaseLogs, scored: phaseLogs.filter((entry) => validGolfScore(entry.score) !== null), average: averageScore(phaseLogs) };
  });
  const scoredGroups = groups.filter((group) => group.average !== null);
  const lowest = [...scoredGroups].sort((a, b) => a.average - b.average)[0];
  const busiest = [...groups].sort((a, b) => b.logs.length - a.logs.length)[0];
  const tempoCount = logs.filter((log) => /tempo|rhythm|smooth|patient|trust/i.test(log.swing_thoughts || "")).length;
  const lowestCopy = lowest
    ? `<strong>${escapeHtml(lowest.club)} holds the lowest average.</strong><br>${escapeHtml(lowest.average)} across ${lowest.scored.length} round${lowest.scored.length === 1 ? "" : "s"}.`
    : `<strong>The lowest-score pattern is still forming.</strong><br>Keep logging scores and thoughts across the moon.`;
  const busiestCopy = busiest?.logs.length
    ? `<strong>${escapeHtml(busiest.club)} holds the most entries.</strong><br>${busiest.logs.length} entr${busiest.logs.length === 1 ? "y" : "ies"} in this view.`
    : `<strong>The club quadrants are still open.</strong><br>Your next score or thought gives the map more shape.`;
  const tempoCopy = `<strong>${tempoCount} of ${logs.length} swing thought${logs.length === 1 ? "" : "s"} name tempo, rhythm, patience, or trust.</strong><br>Your first 28-day pattern window is open. Keep tracking daily.`;

  node.innerHTML = `
    <article class="cm-insight"><span class="cm-insight-icon">▥</span><span>${lowestCopy}</span></article>
    <article class="cm-insight"><span class="cm-insight-icon">◐</span><span>${busiestCopy}</span></article>
    <article class="cm-insight"><span class="cm-insight-icon">✦</span><span>${tempoCopy}</span></article>
  `;
}

function detailMarkup(entry) {
  const isReflection = entry.entry_type === "reflection" || entry.score === null;
  const details = [
    ["Entry", isReflection ? "Swing Thought" : "Scored Round"],
    ["Date", formatDate(entry.round_date)],
    ["Moon Day", entry.moon_day ? `Day ${entry.moon_day}` : "—"],
    ["Moon Phase", shortPhase(entry.moon_phase)],
  ];
  if (!isReflection) {
    details.splice(2, 0, ["Course", entry.course_played || "—"], ["Score", entry.score ?? "—"]);
  }
  const thought = String(entry.swing_thoughts || "").trim();
  return `${details.map(([label, value]) => `
    <div class="cm-modal-detail">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("")}
  <div class="cm-modal-detail cm-modal-detail-wide">
    <span>Swing Thought</span>
    <strong>${thought ? escapeHtml(thought) : "No swing thought recorded."}</strong>
  </div>`;
}

function openScoreDetail(entryId) {
  const entry = allLogs.find((item) => String(item.id) === String(entryId));
  if (!entry) return;
  $("scoreDetailTitle").textContent = entry.entry_type === "reflection" || entry.score === null ? "Swing Thought" : "Round Details";
  $("scoreDetailContent").innerHTML = detailMarkup(entry);
  $("scoreDetailModal").classList.remove("hidden");
  document.body.classList.add("cm-modal-open");
}

function closeScoreDetail() {
  $("scoreDetailModal")?.classList.add("hidden");
  document.body.classList.remove("cm-modal-open");
}

function bindScoreCards() {
  document.querySelectorAll(".cm-map-note[data-entry-id]").forEach((card) => {
    card.addEventListener("click", () => openScoreDetail(card.dataset.entryId));
  });
}

function render() {
  const logs = selectedLogs();
  const visibleLogs = renderQuadrants(logs);
  renderSnapshot();
  renderInsights(logs);
  $("playerViewLabel").textContent = `${displayName()} · ${activeDisplayMode === "scores" ? "Scores Only" : "Player View"}`;
  $("mapRangeCopy").textContent = `${rangeLabel()} · ${visibleLogs.length} ${activeDisplayMode === "scores" ? `score${visibleLogs.length === 1 ? "" : "s"}` : `entr${visibleLogs.length === 1 ? "y" : "ies"}`}`;
  document.querySelectorAll(".cm-filter-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.range === activeRange);
  });
  document.querySelectorAll(".cm-display-button").forEach((button) => {
    const isActive = button.dataset.display === activeDisplayMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function bindFilters() {
  $("mapFilters")?.querySelectorAll(".cm-filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeRange = button.dataset.range || "current";
      render();
    });
  });

  $("mapDisplayModes")?.querySelectorAll(".cm-display-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeDisplayMode = button.dataset.display === "scores" ? "scores" : "full";
      render();
    });
  });
}

async function init() {
  await requireCaddieMagicAccess();
  try {
    const { data } = await supabase.auth.getSession();
    currentUser = data.session?.user || null;
    if (!currentUser) {
      throw new Error("Sign in through Caddie Magic to open your Score Map.");
    }
    playerProfile = await fetchProfile();
    if (!playerProfile) {
      throw new Error(requestedPlayerProfileId
        ? "This player Scorecard could not be opened. Confirm owner access and the Player Profile id."
        : "Set your Player Profile before opening the Score Map.");
    }

    const backButton = $("scoreMapBackButton");
    if (backButton && (requestedPlayerProfileId || openedFromConcierge)) {
      backButton.href = "/manager/";
      backButton.textContent = "← Back to Concierge Desk";
    }

    allLogs = await fetchLogs();
    bindFilters();
    $("scoreDetailClose")?.addEventListener("click", closeScoreDetail);
    $("scoreDetailBackdrop")?.addEventListener("click", closeScoreDetail);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeScoreDetail();
    });
    render();
  } catch (error) {
    console.error(error);
    $("scoreMapMessage").textContent = error?.message || "The Score Map could not open.";
    renderQuadrants([]);
    renderSnapshot();
    renderInsights([]);
    $("mapRangeCopy").textContent = "Return to the Player Profile to sign in.";
  }
}

init();
