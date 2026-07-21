// Caddie Magic v0.5.0 — Caddie Network relationships, availability, and consultations.

import { supabase } from "./supabase.js";

function oneRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function getMyCaddieProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user || null;
  if (!user) return null;
  const { data, error } = await supabase
    .from("caddie_magic_caddie_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function saveMyCaddieProfile(profile, { submit = false } = {}) {
  const { data, error } = await supabase.rpc("caddie_magic_save_my_caddie_profile", {
    p_display_name: String(profile?.displayName || "").trim(),
    p_professional_title: String(profile?.professionalTitle || "").trim() || null,
    p_profile_photo_url: String(profile?.profilePhotoUrl || "").trim() || null,
    p_years_experience: profile?.yearsExperience === "" || profile?.yearsExperience == null
      ? null
      : Number(profile.yearsExperience),
    p_courses_served: String(profile?.coursesServed || "").trim() || null,
    p_pebble_beach_experience: String(profile?.pebbleBeachExperience || "").trim() || null,
    p_city: String(profile?.city || "").trim() || null,
    p_timezone: String(profile?.timezone || "America/Los_Angeles").trim(),
    p_philosophy: String(profile?.philosophy || "").trim() || null,
    p_consultation_method: String(profile?.consultationMethod || "").trim() || null,
    p_consultation_duration_minutes: Number(profile?.consultationDurationMinutes || 30),
    p_meeting_link: String(profile?.meetingLink || "").trim() || null,
    p_submit: Boolean(submit),
  });
  if (error) throw error;
  return oneRow(data);
}

export async function setAcceptingPlayerRequests(enabled) {
  const { data, error } = await supabase.rpc("caddie_magic_set_accepting_player_requests", {
    p_enabled: Boolean(enabled),
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listAvailableCaddies() {
  const { data, error } = await supabase.rpc("caddie_magic_list_available_caddies");
  if (error) throw error;
  return data || [];
}

export async function requestCaddie(caddieProfileId, request = {}) {
  const { data, error } = await supabase.rpc("caddie_magic_request_caddie", {
    p_caddie_profile_id: caddieProfileId,
    p_anticipated_trip_date: request.anticipatedTripDate || null,
    p_course_itinerary: String(request.courseItinerary || "").trim() || null,
    p_consultation_goal: String(request.consultationGoal || "").trim() || null,
    p_played_pebble_before: request.playedPebbleBefore == null ? null : Boolean(request.playedPebbleBefore),
    p_share_scorecard: request.shareScorecard !== false,
    p_share_score_map: request.shareScoreMap !== false,
    p_share_compass: request.shareCompass !== false,
    p_share_upcoming_golf: request.shareUpcomingGolf !== false,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listMyCaddieRequests() {
  const { data, error } = await supabase.rpc("caddie_magic_list_my_caddie_requests");
  if (error) throw error;
  return data || [];
}

export async function cancelMyCaddieRequest(requestId) {
  const { data, error } = await supabase.rpc("caddie_magic_cancel_my_caddie_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listMyPlayerRequests() {
  const { data, error } = await supabase.rpc("caddie_magic_list_my_player_requests");
  if (error) throw error;
  return data || [];
}

export async function respondToPlayerRequest(requestId, response) {
  const { data, error } = await supabase.rpc("caddie_magic_respond_to_player_request", {
    p_request_id: requestId,
    p_response: response,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listMyAvailabilitySlots() {
  const profile = await getMyCaddieProfile();
  if (!profile) return [];
  const { data, error } = await supabase
    .from("caddie_magic_caddie_availability_slots")
    .select("*")
    .eq("caddie_profile_id", profile.id)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addMyAvailabilitySlot(startsAt, endsAt) {
  const { data, error } = await supabase.rpc("caddie_magic_add_my_availability_slot", {
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function removeMyAvailabilitySlot(slotId) {
  const { data, error } = await supabase.rpc("caddie_magic_remove_my_availability_slot", {
    p_slot_id: slotId,
  });
  if (error) throw error;
  return data === true;
}

export async function listAcceptedCaddieAvailability(requestId) {
  const { data, error } = await supabase.rpc("caddie_magic_list_accepted_caddie_availability", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data || [];
}

export async function bookConsultation(requestId, slotId) {
  const { data, error } = await supabase.rpc("caddie_magic_book_consultation", {
    p_request_id: requestId,
    p_slot_id: slotId,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function cancelConsultation(consultationId) {
  const { data, error } = await supabase.rpc("caddie_magic_cancel_consultation", {
    p_consultation_id: consultationId,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function completeConsultation(consultationId) {
  const { data, error } = await supabase.rpc("caddie_magic_complete_consultation", {
    p_consultation_id: consultationId,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listMyConsultations() {
  const { data, error } = await supabase.rpc("caddie_magic_list_my_consultations");
  if (error) throw error;
  return data || [];
}

export async function getPlayerConsultationSnapshot(requestId) {
  const { data, error } = await supabase.rpc("caddie_magic_get_player_consultation_snapshot", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data || null;
}

export async function invitePlayerToCaddieNetwork(playerProfileId) {
  const { data, error } = await supabase.rpc("caddie_magic_invite_player_to_caddie_network", {
    p_player_profile_id: playerProfileId,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listCaddieNetworkProfiles() {
  const { data, error } = await supabase.rpc("caddie_magic_list_caddie_network_profiles");
  if (error) throw error;
  return data || [];
}

export async function setCaddieProfileStatus(caddieProfileId, status) {
  const { data, error } = await supabase.rpc("caddie_magic_set_caddie_profile_status", {
    p_caddie_profile_id: caddieProfileId,
    p_status: status,
  });
  if (error) throw error;
  return oneRow(data);
}
