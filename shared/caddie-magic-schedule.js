import { supabase } from "./supabase.js";
import { getMoonMagic } from "./moon.js";

function oneRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function utcDate(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysISO(iso, days) {
  const date = utcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startISO, endISO) {
  return Math.round((utcDate(endISO) - utcDate(startISO)) / 86400000);
}

export function buildMoonForecast(dateStart, dateEnd = dateStart) {
  const start = String(dateStart || "").slice(0, 10);
  const end = String(dateEnd || dateStart || "").slice(0, 10);
  if (!start || !end) return [];
  const totalDays = daysBetween(start, end);
  if (totalDays < 0) throw new Error("The end date cannot be before the start date.");
  if (totalDays > 31) throw new Error("An upcoming golf event may span no more than 32 calendar days.");

  return Array.from({ length: totalDays + 1 }, (_, index) => {
    const date = addDaysISO(start, index);
    const moon = getMoonMagic(date);
    return {
      date,
      moon_day: moon.moonDay,
      moon_phase: moon.phase,
      moon_emoji: moon.emoji,
    };
  });
}

export async function getMyUpcomingGolfEvents() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const todayISO = today.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("caddie_magic_upcoming_golf_events")
    .select("*")
    .gte("date_end", todayISO)
    .order("date_start", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveUpcomingGolfEvent({
  eventType,
  title,
  dateStart,
  dateEnd = null,
  location = "",
  course = "",
  notes = "",
}) {
  const forecast = buildMoonForecast(dateStart, dateEnd || dateStart);
  const { data, error } = await supabase.rpc("caddie_magic_save_upcoming_golf_event", {
    p_event_type: String(eventType || "").trim(),
    p_title: String(title || "").trim(),
    p_date_start: dateStart,
    p_date_end: dateEnd || dateStart,
    p_location: String(location || "").trim() || null,
    p_course: String(course || "").trim() || null,
    p_notes: String(notes || "").trim() || null,
    p_moon_forecast: forecast,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function deleteUpcomingGolfEvent(eventId) {
  const { data, error } = await supabase.rpc("caddie_magic_delete_upcoming_golf_event", {
    p_event_id: eventId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function listUpcomingGolfEvents(startDate, endDate) {
  const { data, error } = await supabase.rpc("caddie_magic_list_upcoming_golf_events", {
    p_start: startDate || null,
    p_end: endDate || null,
  });
  if (error) throw error;
  return data || [];
}
