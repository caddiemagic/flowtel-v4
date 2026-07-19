import { supabase } from "./supabase.js";

function oneRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function getMyCaddieMagicProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user || null;
  if (!user) return null;

  const { data, error } = await supabase
    .from("caddie_magic_player_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getMyActiveCompass() {
  const { data, error } = await supabase
    .from("caddie_magic_compasses")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function saveMyCompass({ northClub, eastClub, westClub, southClub }) {
  const { data, error } = await supabase.rpc("caddie_magic_save_my_compass", {
    p_north_club: String(northClub || "").trim(),
    p_east_club: String(eastClub || "").trim(),
    p_west_club: String(westClub || "").trim(),
    p_south_club: String(southClub || "").trim(),
  });
  if (error) throw error;
  return oneRow(data);
}

export async function getCompassAssignments(playerProfileId = null) {
  let query = supabase
    .from("caddie_magic_compass_assignments")
    .select("*")
    .order("created_at", { ascending: false });
  if (playerProfileId) query = query.eq("player_profile_id", playerProfileId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateMyCompassAssignment(assignmentId, status, response = "") {
  const { data, error } = await supabase.rpc("caddie_magic_update_my_assignment", {
    p_assignment_id: assignmentId,
    p_status: status,
    p_response: String(response || "").trim() || null,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function getCompassDispatches(playerProfileId = null) {
  let query = supabase
    .from("caddie_magic_compass_dispatches")
    .select("*")
    .order("created_at", { ascending: true });
  if (playerProfileId) query = query.eq("player_profile_id", playerProfileId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function sendCompassDispatch(playerProfileId, message, assignmentId = null) {
  const cleaned = String(message || "").trim();
  if (!cleaned) throw new Error("Write a message before sending the dispatch.");
  const { data, error } = await supabase.rpc("caddie_magic_send_compass_dispatch", {
    p_player_profile_id: playerProfileId,
    p_assignment_id: assignmentId || null,
    p_message: cleaned,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function listCompassPlayers() {
  const { data, error } = await supabase.rpc("caddie_magic_list_compass_players");
  if (error) throw error;
  return data || [];
}

export async function getCompassForPlayer(playerProfileId) {
  const { data, error } = await supabase
    .from("caddie_magic_compasses")
    .select("*")
    .eq("player_profile_id", playerProfileId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function createCompassAssignment({
  playerProfileId,
  title,
  instructions,
  moonPhase = "",
  direction = "general",
  dueDate = null,
}) {
  const { data, error } = await supabase.rpc("caddie_magic_create_compass_assignment", {
    p_player_profile_id: playerProfileId,
    p_title: String(title || "").trim(),
    p_instructions: String(instructions || "").trim(),
    p_moon_phase: String(moonPhase || "").trim() || null,
    p_direction: direction || "general",
    p_due_date: dueDate || null,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function adminUpdateCompassAssignment(assignmentId, updates = {}) {
  const payload = {};
  if (updates.status) payload.status = updates.status;
  if (Object.prototype.hasOwnProperty.call(updates, "player_response")) payload.player_response = updates.player_response;
  if (updates.status === "completed") payload.completed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("caddie_magic_compass_assignments")
    .update(payload)
    .eq("id", assignmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
