// Caddie Magic v0.1.7 — Font & Styling Elevation + Full Wheel Center Asset

import { supabase } from "../../shared/supabase.js";
import { getMoonMagic } from "../../shared/moon.js";

const $ = (id) => document.getElementById(id);

let currentUser = null;
let playerProfile = null;
let allLogs = [];
let activeRange = "current";

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
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
  const { data, error } = await supabase
    .from("caddie_magic_player_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();
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
  const scores = logs.map((log) => Number(log.score)).filter(Number.isFinite);
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

function phaseDefinitions() {
  return [
    { phase: "New Moon Phase", node: "notesWest", club: "West Club" },
    { phase: "Half New Moon Phase", node: "notesNorth", club: "North Club" },
    { phase: "Half Full Moon Phase", node: "notesSouth", club: "South Club" },
    { phase: "Full Moon Phase", node: "notesEast", club: "East Club" },
  ];
}

function noteMarkup(log) {
  return `
    <article class="cm-map-note">
      <div class="cm-map-note-head">
        <span>Moon Day ${escapeHtml(log.moon_day || "—")}</span>
        <span class="cm-map-note-score">${escapeHtml(log.score)}</span>
      </div>
      <p class="cm-map-note-course">${escapeHtml(log.course_played)}</p>
      <p class="cm-map-note-thought">“${escapeHtml(log.swing_thoughts)}”</p>
      <span class="cm-map-note-date">${escapeHtml(formatDate(log.round_date))}</span>
    </article>
  `;
}

function renderQuadrants(logs) {
  phaseDefinitions().forEach((definition) => {
    const node = $(definition.node);
    if (!node) return;
    const phaseLogs = logs.filter((log) => normalizePhase(log.moon_phase) === definition.phase);
    node.innerHTML = phaseLogs.length
      ? phaseLogs.map(noteMarkup).join("")
      : `<div class="cm-map-empty">No rounds have landed in ${escapeHtml(definition.club)} for this view.</div>`;
  });
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
  if (!logs.length) {
    node.innerHTML = `
      <article class="cm-insight"><span class="cm-insight-icon">◐</span><span><strong>Log a round to begin.</strong><br>The Score Map needs real cards before it can reveal a pattern.</span></article>
      <article class="cm-insight"><span class="cm-insight-icon">✦</span><span><strong>One swing thought is enough.</strong><br>Keep the note simple and memorable.</span></article>
      <article class="cm-insight"><span class="cm-insight-icon">⌁</span><span><strong>The map grows over time.</strong><br>Each moon phase gives the score a different context.</span></article>
    `;
    return;
  }

  const groups = phaseDefinitions().map((definition) => {
    const phaseLogs = logs.filter((log) => normalizePhase(log.moon_phase) === definition.phase);
    return { ...definition, logs: phaseLogs, average: averageScore(phaseLogs) };
  });
  const scoredGroups = groups.filter((group) => group.average !== null);
  const lowest = [...scoredGroups].sort((a, b) => a.average - b.average)[0];
  const busiest = [...groups].sort((a, b) => b.logs.length - a.logs.length)[0];
  const tempoCount = logs.filter((log) => /tempo|rhythm|smooth|patient|trust/i.test(log.swing_thoughts || "")).length;
  const lowestCopy = lowest
    ? `<strong>${escapeHtml(lowest.club)} holds the lowest average.</strong><br>${escapeHtml(lowest.average)} across ${lowest.logs.length} round${lowest.logs.length === 1 ? "" : "s"}.`
    : `<strong>The lowest-score pattern is still forming.</strong><br>Keep logging cards across the moon.`;
  const busiestCopy = busiest?.logs.length
    ? `<strong>${escapeHtml(busiest.club)} holds the most rounds.</strong><br>${busiest.logs.length} card${busiest.logs.length === 1 ? "" : "s"} in this view.`
    : `<strong>The club quadrants are still open.</strong><br>Your next round gives the map more shape.`;
  const tempoCopy = `<strong>${tempoCount} of ${logs.length} swing thought${logs.length === 1 ? "" : "s"} name tempo, rhythm, patience, or trust.</strong><br>Use that language as an early pattern marker.`;

  node.innerHTML = `
    <article class="cm-insight"><span class="cm-insight-icon">▥</span><span>${lowestCopy}</span></article>
    <article class="cm-insight"><span class="cm-insight-icon">◐</span><span>${busiestCopy}</span></article>
    <article class="cm-insight"><span class="cm-insight-icon">✦</span><span>${tempoCopy}</span></article>
  `;
}

function render() {
  const logs = selectedLogs();
  renderQuadrants(logs);
  renderSnapshot();
  renderInsights(logs);
  $("playerViewLabel").textContent = `${displayName()} · Player View`;
  $("mapRangeCopy").textContent = `${rangeLabel()} · ${logs.length} round${logs.length === 1 ? "" : "s"}`;
  document.querySelectorAll(".cm-filter-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.range === activeRange);
  });
}

function bindFilters() {
  $("mapFilters")?.querySelectorAll(".cm-filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeRange = button.dataset.range || "current";
      render();
    });
  });
}

async function init() {
  try {
    const { data } = await supabase.auth.getSession();
    currentUser = data.session?.user || null;
    if (!currentUser) {
      throw new Error("Sign in through the Caddie Magic Locker to open your Moon Score Map.");
    }
    playerProfile = await fetchProfile();
    if (!playerProfile) {
      throw new Error("Set your Player Locker before opening the Moon Score Map.");
    }
    allLogs = await fetchLogs();
    bindFilters();
    render();
  } catch (error) {
    console.error(error);
    $("scoreMapMessage").textContent = error?.message || "The Moon Score Map could not open.";
    renderQuadrants([]);
    renderSnapshot();
    renderInsights([]);
    $("mapRangeCopy").textContent = "Return to the Locker to sign in.";
  }
}

init();
