// Caddie Magic v0.4.1 — Locker Room Thoughts + Anonymous Scores

import { supabase } from "../../shared/supabase.js";
import { requireCaddieMagicAccess } from "../../shared/caddie-magic-access.js?v=0.4.1";
import { getMoonMagic } from "../../shared/moon.js";

const $ = (id) => document.getElementById(id);

let allEntries = [];
let activeRange = "current";
let activeView = "thoughts_scores";

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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function phaseDefinitions() {
  return [
    { phase: "New Moon Phase", node: "collectiveWest", club: "West Club" },
    { phase: "Half New Moon Phase", node: "collectiveNorth", club: "North Club" },
    { phase: "Half Full Moon Phase", node: "collectiveSouth", club: "South Club" },
    { phase: "Full Moon Phase", node: "collectiveEast", club: "East Club" },
  ];
}

function moonCycleStarts() {
  return [...new Set(allEntries.map((entry) => entry.moon_cycle_start_date).filter(Boolean))].sort().reverse();
}

function previousMoonStart(currentStart) {
  return moonCycleStarts().find((start) => start < currentStart) || null;
}

function selectedEntries() {
  let entries = allEntries;
  if (activeRange !== "all") {
    const currentStart = getMoonMagic(todayISO()).lastNewMoonDate;
    const targetStart = activeRange === "last" ? previousMoonStart(currentStart) : currentStart;
    entries = targetStart ? allEntries.filter((entry) => entry.moon_cycle_start_date === targetStart) : [];
  }
  if (activeView === "scores") {
    entries = entries.filter((entry) => entry.score !== null && entry.score !== "");
  }
  return entries;
}

function rangeLabel(entries) {
  const currentStart = getMoonMagic(todayISO()).lastNewMoonDate;
  const noun = activeView === "scores" ? "anonymous score" : "anonymous entry";
  if (activeRange === "all") return `All moon cycles · ${entries.length} ${noun}${entries.length === 1 ? "" : "s"}`;
  if (activeRange === "last") {
    const lastStart = previousMoonStart(currentStart);
    return lastStart
      ? `Moon cycle beginning ${formatDate(lastStart)} · ${entries.length} ${noun}${entries.length === 1 ? "" : "s"}`
      : "No previous moon cycle entries yet.";
  }
  return `Moon cycle beginning ${formatDate(currentStart)} · ${entries.length} ${noun}${entries.length === 1 ? "" : "s"}`;
}

function entryMarkup(entry) {
  if (activeView === "scores") {
    return `<article class="cm-collective-note is-score-only"><strong>${escapeHtml(entry.score)}</strong></article>`;
  }
  const thought = String(entry.swing_thought || "").trim();
  const hasScore = entry.score !== null && entry.score !== "";
  return `
    <article class="cm-collective-note">
      <div class="cm-collective-note-head">
        <span>Moon Day ${escapeHtml(entry.moon_day || "—")}</span>
        ${hasScore ? `<strong>${escapeHtml(entry.score)}</strong>` : ""}
      </div>
      ${thought ? `<p>${escapeHtml(thought)}</p>` : `<p class="cm-collective-score-entry">Score logged without a swing thought.</p>`}
    </article>
  `;
}

function render() {
  const entries = selectedEntries();
  phaseDefinitions().forEach((definition) => {
    const node = $(definition.node);
    if (!node) return;
    const phaseEntries = entries.filter((entry) => normalizePhase(entry.moon_phase) === definition.phase);
    node.innerHTML = phaseEntries.length
      ? phaseEntries.map(entryMarkup).join("")
      : `<div class="cm-collective-empty">No anonymous ${activeView === "scores" ? "scores" : "entries"} have landed in ${escapeHtml(definition.club)} for this view.</div>`;
  });
  $("collectiveRange").textContent = rangeLabel(entries);
  document.querySelectorAll(".cm-collective-filter[data-range]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.range === activeRange);
  });
  document.querySelectorAll(".cm-collective-filter[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
}

function bindFilters() {
  $("collectiveFilters")?.querySelectorAll(".cm-collective-filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeRange = button.dataset.range || "current";
      render();
    });
  });
  $("collectiveViewFilters")?.querySelectorAll(".cm-collective-filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.view || "thoughts_scores";
      render();
    });
  });
}

async function init() {
  await requireCaddieMagicAccess();
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) throw new Error("Sign in through Caddie Magic to open the Locker Room.");
    const { data, error } = await supabase.rpc("caddie_magic_get_locker_room_entries", {
      p_moon_cycle_start: null,
      p_moon_phase: null,
    });
    if (error) throw error;
    allEntries = data || [];
    bindFilters();
    render();
  } catch (error) {
    console.error(error);
    const missingMigration = String(error?.message || "").toLowerCase().includes("caddie_magic_get_locker_room_entries");
    $("collectiveMessage").textContent = missingMigration
      ? "The upgraded Locker Room requires migration 043."
      : (error?.message || "The Locker Room could not open.");
    allEntries = [];
    bindFilters();
    render();
  }
}

init();
