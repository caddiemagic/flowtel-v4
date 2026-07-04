// shared/seasons.js

export function normalizeCycleDay(day) {
  const raw = Number(day);

  if (!Number.isFinite(raw)) return null;

  return raw >= 28 ? 28 : ((raw - 1) % 28) + 1;
}

export function getInnerSeason(day) {
  const raw = Number(day);
  if (Number.isFinite(raw) && raw > 33) return "Receiving Season";

  const normalized = normalizeCycleDay(day);

  if (!normalized) return null;
  if (normalized >= 27 || normalized <= 5) return "Inner Winter";
  if (normalized >= 6 && normalized <= 11) return "Inner Spring";
  if (normalized >= 12 && normalized <= 19) return "Inner Summer";

  return "Inner Autumn";
}

export function getWing(season) {
  return {
    "Inner Winter": "West Wing",
    "Inner Spring": "South Wing",
    "Inner Summer": "East Wing",
    "Inner Autumn": "North Wing",
    "Receiving Season": "Receiving Wing",
  }[season];
}

export function getCourt(season) {
  return {
    "Inner Winter": "Winter Court",
    "Inner Spring": "Spring Court",
    "Inner Summer": "Summer Court",
    "Inner Autumn": "Autumn Court",
    "Receiving Season": "Receiving Court",
  }[season];
}

const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

function flowtelTodayISO(fromDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLOWTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fromDate).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calculateCycleStartDate(cycleDay, fromDate = new Date()) {
  const todayISO = flowtelTodayISO(fromDate);
  const [year, month, day] = todayISO.split("-").map(Number);
  const startUTC = Date.UTC(year, month - 1, day) - ((Number(cycleDay) - 1) * 86400000);

  return new Date(startUTC).toISOString().slice(0, 10);
}
