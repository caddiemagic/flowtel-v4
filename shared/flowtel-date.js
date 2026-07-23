// Flowtel v0.10.75 — date-only and Flowtel Time helpers.
// Calendar dates such as a Flow FM start date must never be shifted by a
// browser timezone conversion. Timestamps still use Flowtel Time.

export const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dateOnlyParts(value) {
  const match = String(value || "").slice(0, 10).match(DATE_ONLY_PATTERN);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) return null;
  return { year, month, day, iso: `${match[1]}-${match[2]}-${match[3]}` };
}

export function flowtelDateParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLOWTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    iso: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function calendarDateParts(value, { timeZone = FLOWTEL_TIME_ZONE } = {}) {
  const exact = dateOnlyParts(value);
  if (exact) return exact;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    iso: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function flowtelTodayISO(value = new Date()) {
  return flowtelDateParts(value)?.iso || "";
}

export function dateOnlyToLocalNoon(value) {
  const parts = dateOnlyParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
}

export function formatDateOnly(value, options = {}, locale) {
  if (!value) return "—";
  const parts = dateOnlyParts(value);
  if (!parts) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat(locale, options).format(date);
  }
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
}
