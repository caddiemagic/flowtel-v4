// shared/moon.js

const SYNODIC_MONTH_DAYS = 29.530588853;
const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

// Flowtel Moon Magic uses calendar-day hospitality logic in Flowtel Time.
// Canonical 2026 New Moon dates are Pacific Time dates prepared by Griffith
// Observatory using USNO Data Services.
const CANONICAL_NEW_MOONS = [
  "2026-01-18",
  "2026-02-17",
  "2026-03-18",
  "2026-04-17",
  "2026-05-16",
  "2026-06-14",
  "2026-07-14",
  "2026-08-12",
  "2026-09-10",
  "2026-10-10",
  "2026-11-08",
  "2026-12-08",
];

// Fallback anchor for dates outside the canonical 2026 table.
// June 14, 2026 is a Pacific Time New Moon date.
const KNOWN_NEW_MOON_ISO = "2026-06-14";

function flowtelDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLOWTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function utcDateFromISO(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDaysISO(iso, days) {
  const utc = utcDateFromISO(iso) + (days * 86400000);
  return new Date(utc).toISOString().slice(0, 10);
}

function daysBetweenISO(startISO, endISO) {
  return Math.round((utcDateFromISO(endISO) - utcDateFromISO(startISO)) / 86400000);
}

function canonicalNewMoonPair(flowtelToday) {
  const sorted = [...CANONICAL_NEW_MOONS].sort();
  let last = null;
  let next = null;

  for (const date of sorted) {
    if (date <= flowtelToday) last = date;
    if (date > flowtelToday) {
      next = date;
      break;
    }
  }

  if (last) return { last, next };

  return { last: null, next: sorted[0] || null };
}

function fallbackMoonPair(flowtelToday) {
  const elapsedDays = daysBetweenISO(KNOWN_NEW_MOON_ISO, flowtelToday);
  const cycles = Math.floor(elapsedDays / SYNODIC_MONTH_DAYS);
  let last = addDaysISO(KNOWN_NEW_MOON_ISO, Math.round(cycles * SYNODIC_MONTH_DAYS));

  if (last > flowtelToday) {
    last = addDaysISO(last, -Math.round(SYNODIC_MONTH_DAYS));
  }

  let next = addDaysISO(last, Math.round(SYNODIC_MONTH_DAYS));
  if (next <= flowtelToday) {
    next = addDaysISO(next, Math.round(SYNODIC_MONTH_DAYS));
  }

  return { last, next };
}

function moonSeasonForDay(moonDay) {
  if (moonDay >= 27 || moonDay <= 5) {
    return {
      phase: "New Moon Phase",
      innerSeason: "Inner Winter",
      emoji: "🌑",
      theme: "Rest and dream your new big vision.",
    };
  }

  if (moonDay <= 11) {
    return {
      phase: "Half Full Moon Phase",
      innerSeason: "Inner Spring",
      emoji: "🌓",
      theme: "Create and scheme.",
    };
  }

  if (moonDay <= 19) {
    return {
      phase: "Full Moon Phase",
      innerSeason: "Inner Summer",
      emoji: "🌕",
      theme: "Witness your magic and be seen.",
    };
  }

  return {
    phase: "Half New Moon Phase",
    innerSeason: "Inner Autumn",
    emoji: "🌗",
    theme: "Audit, revise, and prepare for the next cycle.",
  };
}

export function getMoonMagic(date = new Date()) {
  const flowtelToday = typeof date === "string" ? date.slice(0, 10) : flowtelDateISO(date);
  const canonicalPair = canonicalNewMoonPair(flowtelToday);
  const pair = canonicalPair.last ? canonicalPair : fallbackMoonPair(flowtelToday);
  const moonDay = daysBetweenISO(pair.last, flowtelToday) + 1;
  const season = moonSeasonForDay(moonDay);

  return {
    moonDay,
    phase: season.phase,
    innerSeason: season.innerSeason,
    emoji: season.emoji,
    theme: season.theme,
    lastNewMoonDate: pair.last,
    nextNewMoonDate: pair.next || addDaysISO(pair.last, Math.round(SYNODIC_MONTH_DAYS)),
  };
}
