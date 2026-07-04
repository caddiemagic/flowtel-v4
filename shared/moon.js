// shared/moon.js

const SYNODIC_MONTH_DAYS = 29.530588853;
const FLOWTEL_TIME_ZONE = "America/Los_Angeles";
// Flowtel framework anchor: June 14, 2026 is Moon Day 1.
// Therefore July 3, 2026 is Moon Day 20 and July 4, 2026 is Moon Day 21.
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
  const [year, month, day] = String(iso).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDaysISO(iso, days) {
  const utc = utcDateFromISO(iso) + (days * 86400000);
  return new Date(utc).toISOString().slice(0, 10);
}

function daysBetweenISO(startISO, endISO) {
  return Math.round((utcDateFromISO(endISO) - utcDateFromISO(startISO)) / 86400000);
}

export function getMoonMagic(date = new Date()) {
  const flowtelToday = typeof date === "string" ? date.slice(0, 10) : flowtelDateISO(date);
  const elapsedDays = daysBetweenISO(KNOWN_NEW_MOON_ISO, flowtelToday);
  const cycleIndex = ((elapsedDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const moonDay = Math.floor(cycleIndex) + 1;
  const lastNewMoonDate = addDaysISO(flowtelToday, -(moonDay - 1));

  if (moonDay >= 27 || moonDay <= 5) {
    return {
      moonDay,
      phase: "New Moon Phase",
      innerSeason: "Inner Winter",
      emoji: "🌑",
      theme: "Rest and dream your new big vision.",
      lastNewMoonDate,
    };
  }

  if (moonDay <= 11) {
    return {
      moonDay,
      phase: "Half Full Moon Phase",
      innerSeason: "Inner Spring",
      emoji: "🌓",
      theme: "Create and scheme.",
      lastNewMoonDate,
    };
  }

  if (moonDay <= 19) {
    return {
      moonDay,
      phase: "Full Moon Phase",
      innerSeason: "Inner Summer",
      emoji: "🌕",
      theme: "Witness your magic and be seen.",
      lastNewMoonDate,
    };
  }

  return {
    moonDay,
    phase: "Half New Moon Phase",
    innerSeason: "Inner Autumn",
    emoji: "🌗",
    theme: "Audit, revise, and prepare for the next cycle.",
    lastNewMoonDate,
  };
}
