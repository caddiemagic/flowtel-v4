// Caddie Magic private-beta invitation and player-access helpers.

import { supabase } from "./supabase.js";
import { requireProductAccess } from "./product-access.js";

export async function validatePlayerInvitation(email, inviteCode) {
  const { data, error } = await supabase.rpc("caddie_magic_validate_player_invitation", {
    p_email: String(email || "").trim().toLowerCase(),
    p_invite_code: String(inviteCode || "").trim(),
  });
  if (error) throw error;
  return data === true;
}

export async function claimPlayerInvitation(inviteCode) {
  const { data, error } = await supabase.rpc("caddie_magic_claim_player_invitation", {
    p_invite_code: String(inviteCode || "").trim(),
  });
  if (error) throw error;
  return data === true;
}

export async function requireCaddieMagicAccess() {
  return requireProductAccess("caddie_magic");
}

export async function createPlayerInvitation({ email, firstName = "", lastName = "", expiresAt = null } = {}) {
  const { data, error } = await supabase.rpc("caddie_magic_create_player_invitation", {
    p_email: String(email || "").trim().toLowerCase(),
    p_first_name: String(firstName || "").trim() || null,
    p_last_name: String(lastName || "").trim() || null,
    p_expires_at: expiresAt || null,
  });
  if (error) throw error;
  return data;
}

export async function listPlayerInvitations() {
  const { data, error } = await supabase.rpc("caddie_magic_list_player_invitations");
  if (error) throw error;
  return data || [];
}

export async function listCaddieMagicPlayers() {
  const { data, error } = await supabase.rpc("caddie_magic_list_player_access");
  if (error) throw error;
  return data || [];
}

export async function revokePlayerInvitation(invitationId) {
  const { error } = await supabase.rpc("caddie_magic_revoke_player_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
}

export async function setCaddieMagicPlayerAccess(userId, enabled) {
  const { data, error } = await supabase.rpc("caddie_magic_set_player_access", {
    p_user_id: userId,
    p_enabled: Boolean(enabled),
  });
  if (error) throw error;
  return data;
}

export function buildPlayerInviteUrl(inviteCode, email = "") {
  const url = new URL("/caddie-magic/", window.location.origin);
  url.searchParams.set("invite", inviteCode);
  if (email) url.searchParams.set("email", String(email).trim().toLowerCase());
  return url.toString();
}
