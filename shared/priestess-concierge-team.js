import { supabase } from "./supabase.js";

function unwrapSingle(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function listPriestessConciergeTeam() {
  const { data, error } = await supabase.rpc("flowtel_admin_list_priestess_concierge_team");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getPriestessConciergeProfile(memberId) {
  if (!memberId) throw new Error("Choose a Flow FM member.");
  const { data, error } = await supabase.rpc("flowtel_admin_get_priestess_concierge_profile", {
    p_member_id: memberId,
  });
  if (error) throw error;
  return unwrapSingle(data) || data || null;
}

export async function setPriestessAcceptingClients(memberId, accepting) {
  if (!memberId) throw new Error("Choose a Flow FM member.");
  const { data, error } = await supabase.rpc("flowtel_admin_set_priestess_accepting_clients", {
    p_member_id: memberId,
    p_accepting: !!accepting,
  });
  if (error) throw error;
  return data === true;
}

export async function setPriestessFlowFmStartDate(memberId, startedAt) {
  if (!memberId) throw new Error("Choose a Flow FM member.");
  const value = String(startedAt || "").slice(0, 10);
  if (!value) throw new Error("Choose the Flow FM start date.");
  const { data, error } = await supabase.rpc("flowtel_admin_set_flowfm_start_date", {
    p_member_id: memberId,
    p_started_at: value,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getPriestessHourlyFlowRate(memberId) {
  if (!memberId) throw new Error("Choose a Flow FM member.");
  const { data, error } = await supabase.rpc("flowtel_admin_get_member_hourly_flow_rate", {
    p_member_id: memberId,
  });
  if (error) throw error;
  return unwrapSingle(data) || data || null;
}

export async function getPriestessConciergeTeamAccess(memberId) {
  if (!memberId) throw new Error("Choose a Flow FM member.");
  const { data, error } = await supabase.rpc("flowtel_admin_get_concierge_team_access", {
    p_member_id: memberId,
  });
  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("function") && message.includes("flowtel_admin_get_concierge_team_access")) {
      throw new Error("Concierge Team access controls are not installed yet. Run migration 062.");
    }
    throw error;
  }
  return data === true;
}

export async function setPriestessConciergeTeamAccess(memberId, enabled) {
  if (!memberId) throw new Error("Choose a Flow FM member.");
  const { data, error } = await supabase.rpc("flowtel_admin_set_concierge_team_access", {
    p_member_id: memberId,
    p_enabled: !!enabled,
  });
  if (error) throw error;
  return data === true;
}
