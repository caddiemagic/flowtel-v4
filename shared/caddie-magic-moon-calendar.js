// Caddie Magic v0.4.4 — lunar calendar and exact phase-event language.
// Pacific dates are based on Griffith Observatory's USNO-prepared phase tables.

const DAY_MS = 86400000;

const MOON_NAMES_BY_NEW_MOON_MONTH = {
  1: "Rose Moon",
  2: "Honey Moon",
  3: "Naked Moon",
  4: "Creatrix Moon",
  5: "Mother Moon",
  6: "Money Moon",
  7: "Dragon Moon",
  8: "Wild Woman Moon",
  9: "Lover Moon",
  10: "Blood Moon",
  11: "Temple Moon",
  12: "Serpent Moon",
};

const PHASE_EVENTS = [
  // Boundary support for the cycle entering 2026.
  ["2025-12-19", "New Moon"],
  ["2025-12-27", "First Quarter Moon"],

  ["2026-01-03", "Full Moon"],
  ["2026-01-10", "Last Quarter Moon"],
  ["2026-01-18", "New Moon"],
  ["2026-01-25", "First Quarter Moon"],
  ["2026-02-01", "Full Moon"],
  ["2026-02-09", "Last Quarter Moon"],
  ["2026-02-17", "New Moon"],
  ["2026-02-24", "First Quarter Moon"],
  ["2026-03-03", "Full Moon"],
  ["2026-03-11", "Last Quarter Moon"],
  ["2026-03-18", "New Moon"],
  ["2026-03-25", "First Quarter Moon"],
  ["2026-04-01", "Full Moon"],
  ["2026-04-09", "Last Quarter Moon"],
  ["2026-04-17", "New Moon"],
  ["2026-04-23", "First Quarter Moon"],
  ["2026-05-01", "Full Moon"],
  ["2026-05-09", "Last Quarter Moon"],
  ["2026-05-16", "New Moon"],
  ["2026-05-23", "First Quarter Moon"],
  ["2026-05-31", "Full Moon"],
  ["2026-06-08", "Last Quarter Moon"],
  ["2026-06-14", "New Moon"],
  ["2026-06-21", "First Quarter Moon"],
  ["2026-06-29", "Full Moon"],
  ["2026-07-07", "Last Quarter Moon"],
  ["2026-07-14", "New Moon"],
  ["2026-07-21", "First Quarter Moon"],
  ["2026-07-29", "Full Moon"],
  ["2026-08-05", "Last Quarter Moon"],
  ["2026-08-12", "New Moon"],
  ["2026-08-19", "First Quarter Moon"],
  ["2026-08-27", "Full Moon"],
  ["2026-09-04", "Last Quarter Moon"],
  ["2026-09-10", "New Moon"],
  ["2026-09-18", "First Quarter Moon"],
  ["2026-09-26", "Full Moon"],
  ["2026-10-03", "Last Quarter Moon"],
  ["2026-10-10", "New Moon"],
  ["2026-10-18", "First Quarter Moon"],
  ["2026-10-25", "Full Moon"],
  ["2026-11-01", "Last Quarter Moon"],
  ["2026-11-08", "New Moon"],
  ["2026-11-17", "First Quarter Moon"],
  ["2026-11-24", "Full Moon"],
  ["2026-11-30", "Last Quarter Moon"],
  ["2026-12-08", "New Moon"],
  ["2026-12-16", "First Quarter Moon"],
  ["2026-12-23", "Full Moon"],
  ["2026-12-30", "Last Quarter Moon"],

  // 2027 keeps the owner calendar usable beyond the current beta year.
  ["2027-01-07", "New Moon"],
  ["2027-01-15", "First Quarter Moon"],
  ["2027-01-22", "Full Moon"],
  ["2027-01-29", "Last Quarter Moon"],
  ["2027-02-06", "New Moon"],
  ["2027-02-13", "First Quarter Moon"],
  ["2027-02-20", "Full Moon"],
  ["2027-02-27", "Last Quarter Moon"],
  ["2027-03-08", "New Moon"],
  ["2027-03-15", "First Quarter Moon"],
  ["2027-03-22", "Full Moon"],
  ["2027-03-29", "Last Quarter Moon"],
  ["2027-04-06", "New Moon"],
  ["2027-04-13", "First Quarter Moon"],
  ["2027-04-20", "Full Moon"],
  ["2027-04-28", "Last Quarter Moon"],
  ["2027-05-06", "New Moon"],
  ["2027-05-12", "First Quarter Moon"],
  ["2027-05-20", "Full Moon"],
  ["2027-05-28", "Last Quarter Moon"],
  ["2027-06-04", "New Moon"],
  ["2027-06-11", "First Quarter Moon"],
  ["2027-06-18", "Full Moon"],
  ["2027-06-26", "Last Quarter Moon"],
  ["2027-07-03", "New Moon"],
  ["2027-07-10", "First Quarter Moon"],
  ["2027-07-18", "Full Moon"],
  ["2027-07-26", "Last Quarter Moon"],
  ["2027-08-02", "New Moon"],
  ["2027-08-08", "First Quarter Moon"],
  ["2027-08-17", "Full Moon"],
  ["2027-08-24", "Last Quarter Moon"],
  ["2027-08-31", "New Moon"],
  ["2027-09-07", "First Quarter Moon"],
  ["2027-09-15", "Full Moon"],
  ["2027-09-23", "Last Quarter Moon"],
  ["2027-09-29", "New Moon"],
  ["2027-10-07", "First Quarter Moon"],
  ["2027-10-15", "Full Moon"],
  ["2027-10-22", "Last Quarter Moon"],
  ["2027-10-29", "New Moon"],
  ["2027-11-06", "First Quarter Moon"],
  ["2027-11-13", "Full Moon"],
  ["2027-11-20", "Last Quarter Moon"],
  ["2027-11-27", "New Moon"],
  ["2027-12-05", "First Quarter Moon"],
  ["2027-12-13", "Full Moon"],
  ["2027-12-20", "Last Quarter Moon"],
  ["2027-12-27", "New Moon"],
];

const EVENT_BY_DATE = new Map(PHASE_EVENTS);
const NEW_MOONS = PHASE_EVENTS.filter(([, label]) => label === "New Moon").map(([date]) => date);

function utcMs(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addCalendarDays(iso, days) {
  return new Date(utcMs(iso) + (Number(days) * DAY_MS)).toISOString().slice(0, 10);
}

export function calendarDaysBetween(start, end) {
  return Math.round((utcMs(end) - utcMs(start)) / DAY_MS);
}

export function normalizeCaddieMoonPhase(value = "") {
  const phase = String(value || "").trim();
  const lower = phase.toLowerCase();
  if (lower.includes("half full") || lower.includes("first quarter")) return "First Quarter Phase";
  if (lower.includes("half new") || lower.includes("third quarter") || lower.includes("last quarter")) return "Last Quarter Phase";
  if (lower.includes("full") && !lower.includes("half")) return "Full Moon Phase";
  if (lower.includes("new") && !lower.includes("half")) return "New Moon Phase";
  return phase || "Moon Phase";
}

export function exactMoonEventForDate(dateISO) {
  return EVENT_BY_DATE.get(String(dateISO || "").slice(0, 10)) || "";
}

export function moonLabelForDate(dateISO, fallbackPhase = "") {
  return exactMoonEventForDate(dateISO) || normalizeCaddieMoonPhase(fallbackPhase);
}

export function shortCalendarDate(dateISO) {
  if (!dateISO) return "";
  const date = new Date(`${String(dateISO).slice(0, 10)}T12:00:00Z`);
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date).toUpperCase();
  return `${month} ${date.getUTCDate()}`;
}

function fallbackCycleStart(dateISO) {
  const date = String(dateISO || "").slice(0, 10);
  let best = NEW_MOONS[0];
  for (const newMoon of NEW_MOONS) {
    if (newMoon <= date) best = newMoon;
    else break;
  }
  return best;
}

export function moonCycleForDate(dateISO) {
  const date = String(dateISO || new Date().toISOString().slice(0, 10)).slice(0, 10);
  let startIndex = 0;
  for (let index = 0; index < NEW_MOONS.length; index += 1) {
    if (NEW_MOONS[index] <= date) startIndex = index;
    else break;
  }
  const startDate = NEW_MOONS[startIndex] || fallbackCycleStart(date);
  const nextStartDate = NEW_MOONS[startIndex + 1] || addCalendarDays(startDate, 30);
  const endDate = addCalendarDays(nextStartDate, -1);
  const [, month] = startDate.split("-").map(Number);
  const previousStart = NEW_MOONS[startIndex - 1] || "";
  const previousMonth = previousStart ? Number(previousStart.slice(5, 7)) : null;
  const isThirteenthMoon = previousMonth === month;
  return {
    startDate,
    endDate,
    nextStartDate,
    name: isThirteenthMoon ? "Ouroboros Moon" : (MOON_NAMES_BY_NEW_MOON_MONTH[month] || "Caddie Moon"),
    year: Number(startDate.slice(0, 4)),
    length: calendarDaysBetween(startDate, nextStartDate),
    index: startIndex,
  };
}

export function moonCycleByStart(startDate) {
  return moonCycleForDate(startDate);
}

export function adjacentMoonCycle(currentStartDate, step) {
  const currentIndex = NEW_MOONS.indexOf(String(currentStartDate || "").slice(0, 10));
  const targetIndex = Math.min(NEW_MOONS.length - 1, Math.max(0, (currentIndex < 0 ? 0 : currentIndex) + Number(step || 0)));
  return moonCycleForDate(NEW_MOONS[targetIndex]);
}

export function moonCycleDays(cycle) {
  return Array.from({ length: cycle.length }, (_, index) => {
    const date = addCalendarDays(cycle.startDate, index);
    return {
      date,
      moonDay: index + 1,
      exactEvent: exactMoonEventForDate(date),
    };
  });
}
