// shared/seasons.js

export function normalizeCycleDay(day) {
  const raw = Number(day);

  if (!Number.isFinite(raw)) return null;

  return raw >= 28 ? 28 : ((raw - 1) % 28) + 1;
}

export function getInnerSeason(day) {
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
  }[season];
}

export function getCourt(season) {
  return {
    "Inner Winter": "Winter Court",
    "Inner Spring": "Spring Court",
    "Inner Summer": "Summer Court",
    "Inner Autumn": "Autumn Court",
  }[season];
}

export function calculateCycleStartDate(cycleDay, fromDate = new Date()) {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (Number(cycleDay) - 1));

  return start.toISOString().slice(0, 10);
}
