// Caddie Magic v0.2.0 — Locker Room

import { supabase } from "../../shared/supabase.js";
import { getMoonMagic } from "../../shared/moon.js";

const $ = (id) => document.getElementById(id);

let allEntries = [];
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
  if (activeRange === "all") return allEntries;
  const currentStart = getMoonMagic(todayISO()).lastNewMoonDate;
  const targetStart = activeRange === "last" ? previousMoonStart(currentStart) : currentStart;
  if (!targetStart) return [];
  return allEntries.filter((entry) => entry.moon_cycle_start_date === targetStart);
}

function rangeLabel(entries) {
  const currentStart = getMoonMagic(todayISO()).lastNewMoonDate;
  if (activeRange === "all") return `All moon cycles · ${entries.length} anonymous thought${entries.length === 1 ? "" : "s"}`;
  if (activeRange === "last") {
    const lastStart = previousMoonStart(currentStart);
    return lastStart
      ? `Moon cycle beginning ${formatDate(lastStart)} · ${entries.length} anonymous thought${entries.length === 1 ? "" : "s"}`
      : "No previous moon cycle reflections yet.";
  }
  return `Moon cycle beginning ${formatDate(currentStart)} · ${entries.length} anonymous thought${entries.length === 1 ? "" : "s"}`;
}

function thoughtMarkup(entry) {
  return `
    <article class="cm-collective-note">
      <span>Moon Day ${escapeHtml(entry.moon_day || "—")}</span>
      <p>${escapeHtml(entry.swing_thought)}</p>
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
      ? phaseEntries.map(thoughtMarkup).join("")
      : `<div class="cm-collective-empty">No anonymous swing thoughts have landed in ${escapeHtml(definition.club)} for this view.</div>`;
  });
  $("collectiveRange").textContent = rangeLabel(entries);
  document.querySelectorAll(".cm-collective-filter").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.range === activeRange);
  });
}

function bindFilters() {
  $("collectiveFilters")?.querySelectorAll(".cm-collective-filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeRange = button.dataset.range || "current";
      render();
    });
  });
}

async function init() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      throw new Error("Sign in through Caddie Magic to open the Locker Room.");
    }
    const { data, error } = await supabase.rpc("caddie_magic_get_collective_swing_thoughts", {
      p_moon_cycle_start: null,
      p_moon_phase: null,
    });
    if (error) throw error;
    allEntries = data || [];
    bindFilters();
    render();
  } catch (error) {
    console.error(error);
    $("collectiveMessage").textContent = error?.message || "The Locker Room could not open.";
    allEntries = [];
    bindFilters();
    render();
  }
}

init();
