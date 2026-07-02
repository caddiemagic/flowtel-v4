// shared/engine.js
// Flowtel v4 Engine

import { supabase, getCurrentUser } from "./supabase.js";

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile error:", error);
    return null;
  }

  return data;
}

export async function getTodaysStay() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("flowtel_stays")
    .select("*")
    .eq("client_id", user.id)
    .eq("checkin_date", today)
    .maybeSingle();

  if (error) {
    console.error("Today stay error:", error);
    return null;
  }

  return data;
}

export function getInnerSeason(day) {
  const normalized = day >= 28 ? 28 : ((day - 1) % 28) + 1;

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

export function calculateCycleStartDate(cycleDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - (cycleDay - 1));

  return start.toISOString().slice(0, 10);
}

export async function createStay({ cycleDay, feelsLike }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No user is signed in.");

  const innerSeason = getInnerSeason(cycleDay);
  const cycleStartDate = calculateCycleStartDate(cycleDay);

  const stay = {
    client_id: user.id,
    cycle_day_claimed: cycleDay,
    cycle_start_date: cycleStartDate,
    inner_season: innerSeason,
    feels_like_inner_season: feelsLike,
    wing: getWing(innerSeason),
    court: getCourt(innerSeason),
    checkin_date: new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase
    .from("flowtel_stays")
    .upsert(stay, {
      onConflict: "client_id,checkin_date",
    })
    .select()
    .single();

  if (error) {
    console.error("Create stay error:", error);
    throw error;
  }

  return data;
}

export async function getFrontDeskStays() {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("flowtel_stays")
    .select(`
      *,
      profiles:client_id (
        first_name,
        last_name,
        email
      )
    `)
    .eq("checkin_date", today)
    .order("checked_in_at", { ascending: false });

  if (error) {
    console.error("Front desk error:", error);
    return [];
  }

  return data;
}