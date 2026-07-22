// Flowtel v0.10.57 — Hourly Flow Rate pure calculation and season helpers.
// This module intentionally has no browser, Supabase, or DOM dependency so the
// canonical formulas and Flowtel-season behavior can be tested independently.

export const FLOWTEL_TIME_ZONE = "America/Los_Angeles";
export const SELF_CARE_HOURS_PER_WEEK = 40;
export const INNER_SUMMER_WEEKS = 12;
export const ANNUAL_SELF_CARE_HOURS = SELF_CARE_HOURS_PER_WEEK * INNER_SUMMER_WEEKS;
export const FLOW_MULTIPLIER = 2;

export const FLOWTEL_SEASONS = Object.freeze([
  Object.freeze({ key: "spring", name: "Spring", startMonth: 2, startDay: 1, endMonth: 4, endDay: 30 }),
  Object.freeze({ key: "summer", name: "Summer", startMonth: 5, startDay: 1, endMonth: 7, endDay: 31 }),
  Object.freeze({ key: "autumn", name: "Autumn", startMonth: 8, startDay: 1, endMonth: 10, endDay: 31 }),
  Object.freeze({ key: "winter", name: "Winter", startMonth: 11, startDay: 1, endMonth: 1, endDay: 31 }),
]);

export const SEASONAL_MONEY_LAYERS = Object.freeze([
  "lodging",
  "nourishment",
  "self_care",
  "transitions",
  "pleasure_support",
]);

export const LAYER_LABELS = Object.freeze({
  lodging: "Seasonal Home",
  nourishment: "Seasonal Nourishment",
  self_care: "Sovereign Self-Care",
  transitions: "Seasonal Transitions",
  pleasure_support: "Pleasure & Support",
});

export const CURRENCY_OPTIONS = Object.freeze([
  Object.freeze({ code: "USD", label: "US Dollar", symbol: "$" }),
  Object.freeze({ code: "CAD", label: "Canadian Dollar", symbol: "CA$" }),
  Object.freeze({ code: "EUR", label: "Euro", symbol: "€" }),
  Object.freeze({ code: "GBP", label: "British Pound", symbol: "£" }),
  Object.freeze({ code: "AUD", label: "Australian Dollar", symbol: "A$" }),
  Object.freeze({ code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" }),
  Object.freeze({ code: "MXN", label: "Mexican Peso", symbol: "MX$" }),
]);

const DAY_MS = 86_400_000;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function isoFromParts(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function partsFromISO(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, timestamp };
}

export function normalizeCurrencyCode(value, fallback = "USD") {
  const normalized = String(value || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) return normalized;
  return String(fallback || "USD").trim().toUpperCase();
}

export function currencySymbol(currencyCode) {
  const normalized = normalizeCurrencyCode(currencyCode);
  return CURRENCY_OPTIONS.find((item) => item.code === normalized)?.symbol || `${normalized} `;
}

export function flowtelDateISO(fromDate = new Date()) {
  if (typeof fromDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    if (!partsFromISO(fromDate)) throw new Error("Invalid Flowtel date.");
    return fromDate;
  }

  const date = fromDate instanceof Date ? fromDate : new Date(fromDate);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date supplied to Flowtel Time.");

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLOWTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== "literal") accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function inclusiveDayCount(startsOn, endsOn) {
  const start = partsFromISO(startsOn);
  const end = partsFromISO(endsOn);
  if (!start || !end || end.timestamp < start.timestamp) return 0;
  return Math.floor((end.timestamp - start.timestamp) / DAY_MS) + 1;
}

export function buildFutureSeasonCycle(flowtelToday = new Date()) {
  const todayISO = flowtelDateISO(flowtelToday);
  const today = partsFromISO(todayISO);
  const { year, month } = today;

  let firstSeasonIndex;
  let firstSeasonYear;

  if (month === 1) {
    firstSeasonIndex = 0; // Spring of the current year.
    firstSeasonYear = year;
  } else if (month >= 2 && month <= 4) {
    firstSeasonIndex = 1; // Summer.
    firstSeasonYear = year;
  } else if (month >= 5 && month <= 7) {
    firstSeasonIndex = 2; // Autumn.
    firstSeasonYear = year;
  } else if (month >= 8 && month <= 10) {
    firstSeasonIndex = 3; // Winter.
    firstSeasonYear = year;
  } else {
    firstSeasonIndex = 0; // Spring of the next year.
    firstSeasonYear = year + 1;
  }

  return Array.from({ length: 4 }, (_, offset) => {
    const sequenceIndex = firstSeasonIndex + offset;
    const canonicalIndex = sequenceIndex % FLOWTEL_SEASONS.length;
    const seasonYear = firstSeasonYear + Math.floor(sequenceIndex / FLOWTEL_SEASONS.length);
    const season = FLOWTEL_SEASONS[canonicalIndex];
    const startsOn = isoFromParts(seasonYear, season.startMonth, season.startDay);
    const endsOn = season.key === "winter"
      ? isoFromParts(seasonYear + 1, season.endMonth, season.endDay)
      : isoFromParts(seasonYear, season.endMonth, season.endDay);

    return {
      sortOrder: offset + 1,
      seasonKey: season.key,
      seasonName: season.name,
      startsOn,
      endsOn,
      dayCount: inclusiveDayCount(startsOn, endsOn),
      isSuggested: offset === 0,
    };
  });
}

export function seasonLocationLabel(season = {}) {
  const explicit = String(season.location_label || season.locationLabel || '').trim();
  if(explicit) return explicit;
  return [season.city, season.region, season.country]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function seasonDisplayName(season = {}) {
  const key = String(season.season_key || season.seasonKey || "").toLowerCase();
  const name = FLOWTEL_SEASONS.find((item) => item.key === key)?.name || "Season";
  const startsOn = season.starts_on || season.startsOn;
  const endsOn = season.ends_on || season.endsOn;
  const start = partsFromISO(startsOn);
  const end = partsFromISO(endsOn);
  if (!start || !end) return name;
  return start.year === end.year ? `${name} ${start.year}` : `${name} ${start.year}–${end.year}`;
}

export function formatSeasonDateRange(season = {}) {
  const startsOn = season.starts_on || season.startsOn;
  const endsOn = season.ends_on || season.endsOn;
  const start = partsFromISO(startsOn);
  const end = partsFromISO(endsOn);
  if (!start || !end) return "Dates are being prepared";

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(start.timestamp))} – ${formatter.format(new Date(end.timestamp))}`;
}

function numericAmount(value, { allowNull = false } = {}) {
  if (value === null || value === undefined || value === "") return allowNull ? null : 0;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Monetary amounts must be valid numbers.");
  if (amount < 0) throw new Error("Costs must be zero or positive.");
  return amount;
}

function amountInCents(value) {
  return Math.round(numericAmount(value) * 100);
}

export function effectiveCostEntries(costEntries = []) {
  const normalized = (costEntries || []).map((entry) => ({
    ...entry,
    layerKey: String(entry.layer_key || entry.layerKey || "").trim(),
    seasonId: entry.season_id || entry.seasonId || "global",
    entryMode: String(entry.entry_mode || entry.entryMode || "detailed").trim().toLowerCase(),
    baseAmount: numericAmount(entry.base_amount ?? entry.baseAmount),
  }));

  const groups = new Map();
  for (const entry of normalized) {
    const key = `${entry.seasonId}:${entry.layerKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const effective = [];
  for (const entries of groups.values()) {
    const layerKey = entries[0]?.layerKey;
    if (layerKey === "lodging") {
      effective.push(...entries.filter((entry) => entry.baseAmount > 0));
      continue;
    }

    const detailed = entries.filter((entry) => entry.entryMode === "detailed" && entry.baseAmount > 0);
    if (detailed.length) {
      effective.push(...detailed);
      continue;
    }

    effective.push(...entries.filter((entry) => entry.entryMode === "estimate" && entry.baseAmount > 0));
  }

  return effective;
}

export function layerTotals(costEntries = []) {
  const totals = new Map();
  for (const entry of effectiveCostEntries(costEntries)) {
    const key = `${entry.seasonId}:${entry.layerKey}`;
    totals.set(key, (totals.get(key) || 0) + entry.baseAmount);
  }
  return totals;
}

export function calculateHourlyFlowRate({ monthlyHomeBase = 0, costEntries = [] } = {}) {
  const homeBaseMonthlyCents = amountInCents(monthlyHomeBase);
  const annualHomeBaseCents = homeBaseMonthlyCents * 12;
  const seasonalFreedomCents = effectiveCostEntries(costEntries)
    .reduce((sum, entry) => sum + amountInCents(entry.baseAmount), 0);
  const annualVisionCents = annualHomeBaseCents + seasonalFreedomCents;
  const annualVisionTotal = annualVisionCents / 100;
  const baseHourlyRate = annualVisionTotal / ANNUAL_SELF_CARE_HOURS;
  const hourlyFlowRate = baseHourlyRate * FLOW_MULTIPLIER;

  return {
    monthlyHomeBase: homeBaseMonthlyCents / 100,
    annualHomeBase: annualHomeBaseCents / 100,
    seasonalFreedom: seasonalFreedomCents / 100,
    annualVisionTotal,
    baseHourlyRate,
    flowMultiplier: FLOW_MULTIPLIER,
    annualSelfCareHours: ANNUAL_SELF_CARE_HOURS,
    hourlyFlowRate,
    heroRate: annualVisionCents > 0 ? Math.round(hourlyFlowRate) : null,
    hasMonetaryValue: annualVisionCents > 0,
  };
}

export function countFlowingLayers({ seasons = [], costEntries = [], monthlyHomeBase = 0 } = {}) {
  const totals = layerTotals(costEntries);
  let count = numericAmount(monthlyHomeBase) > 0 ? 1 : 0;
  for (const season of seasons || []) {
    const seasonId = season.id || season.seasonId;
    for (const layerKey of SEASONAL_MONEY_LAYERS) {
      if ((totals.get(`${seasonId}:${layerKey}`) || 0) > 0) count += 1;
    }
  }
  return count;
}

export function isFullyEnvisioned({ seasons = [], costEntries = [], monthlyHomeBase = 0 } = {}) {
  if (numericAmount(monthlyHomeBase) <= 0 || !Array.isArray(seasons) || seasons.length !== 4) return false;
  const totals = layerTotals(costEntries);
  return seasons.every((season) => {
    const seasonId = season.id || season.seasonId;
    return SEASONAL_MONEY_LAYERS.every((layerKey) => (totals.get(`${seasonId}:${layerKey}`) || 0) > 0);
  });
}

export function seasonStatus({ season = {}, costEntries = [] } = {}) {
  const seasonId = season.id || season.seasonId;
  const totals = layerTotals(costEntries);
  const destinationChosen = Boolean(seasonLocationLabel(season));
  const lodging = totals.get(`${seasonId}:lodging`) || 0;
  const additionalLayers = SEASONAL_MONEY_LAYERS
    .filter((key) => key !== "lodging")
    .filter((key) => (totals.get(`${seasonId}:${key}`) || 0) > 0);

  if (SEASONAL_MONEY_LAYERS.every((key) => (totals.get(`${seasonId}:${key}`) || 0) > 0)) return "Flowing";
  if (additionalLayers.length > 0) return "Being Resourced";
  if (lodging > 0) return "Home Found";
  if (destinationChosen) return "Location Chosen";
  return "Dreaming";
}

export function analyzeLodgingCoverage(season = {}, costEntries = []) {
  const startsOn = season.starts_on || season.startsOn;
  const endsOn = season.ends_on || season.endsOn;
  const start = partsFromISO(startsOn);
  const end = partsFromISO(endsOn);
  if (!start || !end) return { hasGaps: false, hasOverlaps: false, message: "" };

  const seasonId = season.id || season.seasonId;
  const intervals = (costEntries || [])
    .filter((entry) => (entry.season_id || entry.seasonId) === seasonId)
    .filter((entry) => String(entry.layer_key || entry.layerKey) === "lodging")
    .filter((entry) => numericAmount(entry.base_amount ?? entry.baseAmount) > 0)
    .map((entry) => {
      const intervalStart = partsFromISO(entry.starts_on || entry.startsOn);
      const intervalEnd = partsFromISO(entry.ends_on || entry.endsOn);
      if (!intervalStart || !intervalEnd || intervalEnd.timestamp < intervalStart.timestamp) return null;
      return {
        start: Math.max(start.timestamp, intervalStart.timestamp),
        end: Math.min(end.timestamp, intervalEnd.timestamp),
      };
    })
    .filter((interval) => interval && interval.end >= interval.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (!intervals.length) return { hasGaps: false, hasOverlaps: false, message: "" };

  let hasGaps = intervals[0].start > start.timestamp;
  let hasOverlaps = false;
  let cursor = intervals[0].end;

  for (const interval of intervals.slice(1)) {
    if (interval.start <= cursor) hasOverlaps = true;
    if (interval.start > cursor + DAY_MS) hasGaps = true;
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < end.timestamp) hasGaps = true;

  let message = "";
  if (hasGaps && hasOverlaps) {
    message = "Your saved homes include both a date gap and an overlap. They can remain while your seasonal plan is unfolding.";
  } else if (hasGaps) {
    message = "A portion of this season does not have a saved home yet. You can add another property whenever you feel called.";
  } else if (hasOverlaps) {
    message = "Two saved homes overlap on the calendar. Flowtel will keep both in the vision and include both valid amounts.";
  } else {
    message = "Your saved lodging dates cover this full season.";
  }

  return { hasGaps, hasOverlaps, message };
}

export function calculateNourishmentTotal({
  averageBreakfast = 0,
  averageLunch = 0,
  averageDinner = 0,
  dayCount = 0,
  serviceAllowancePercent = 25,
} = {}) {
  const breakfastCents = amountInCents(averageBreakfast);
  const lunchCents = amountInCents(averageLunch);
  const dinnerCents = amountInCents(averageDinner);
  const days = Math.max(0, Math.floor(numericAmount(dayCount)));
  const allowancePercent = numericAmount(serviceAllowancePercent);
  const mealsCents = (breakfastCents + lunchCents + dinnerCents) * days;
  const allowanceCents = Math.round(mealsCents * (allowancePercent / 100));
  return {
    dayCount: days,
    mealsTotal: mealsCents / 100,
    serviceAllowancePercent: allowancePercent,
    serviceAllowanceTotal: allowanceCents / 100,
    total: (mealsCents + allowanceCents) / 100,
  };
}

export function calculateSelfCareServiceTotal({ costPerAppointment = 0, appointments = 0 } = {}) {
  const unitCents = amountInCents(costPerAppointment);
  const count = numericAmount(appointments);
  return Math.round(unitCents * count) / 100;
}

export function roundMoney(value) {
  return Math.round(numericAmount(value) * 100) / 100;
}
