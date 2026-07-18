// shared/profiles.js

import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { resolveMembership, roleFromResolvedMembership, rankForMembership, normalizeMembership } from "./membership.js";


export function displayNameForProfile(profile = {}, fallback = "Guest") {
  const displayName = String(
    profile?.display_name ||
    profile?.priestess_name ||
    profile?.displayName ||
    ""
  ).trim();

  if (displayName) return displayName;

  const legalName = [profile?.first_name, profile?.last_name]
    .map(value => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  const emailPrefix = String(profile?.email || "").trim().split("@")[0];
  return legalName || emailPrefix || fallback;
}

export function firstNameForProfile(profile = {}, fallback = "Guest") {
  const displayName = displayNameForProfile(profile, "");
  return displayName.split(/\s+/).filter(Boolean)[0] || fallback;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup failed:", error);
    return null;
  }

  return data;
}

export async function ensureProfile(profile = {}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const existing = await getCurrentProfile();

  const incomingMembership = normalizeMembership(profile.membershipType || profile.membership || profile.source);
  const existingMembership = Number(existing?.membership_rank || 0) >= 3
    ? "council"
    : Number(existing?.membership_rank || 0) >= 2
      ? "flowfm"
      : existing?.membership_type || user.user_metadata?.membership_type;
  const resolvedMembership = resolveMembership(existingMembership, incomingMembership);
  const resolvedRole = (user.email?.endsWith("@test.local") && profile.forceBetaRole)
    ? (profile.role || "client")
    : roleFromResolvedMembership(resolvedMembership, existing?.role || profile.role || "client");

  const payload = {
    id: user.id,
    email: user.email,
    first_name:
      existing?.first_name ||
      profile.firstName ||
      user.user_metadata?.first_name ||
      null,
    last_name:
      existing?.last_name ||
      profile.lastName ||
      user.user_metadata?.last_name ||
      null,
    display_name:
      existing?.display_name ||
      profile.displayName ||
      user.user_metadata?.display_name ||
      [
        profile.firstName || existing?.first_name || user.user_metadata?.first_name,
        profile.lastName || existing?.last_name || user.user_metadata?.last_name,
      ].filter(Boolean).join(" ") ||
      null,
    role: resolvedRole,
    membership_type: resolvedMembership || existing?.membership_type || null,
    membership_rank: rankForMembership(resolvedMembership || existing?.membership_type),
    squarespace_source:
      profile.squarespaceSource ||
      profile.source ||
      existing?.squarespace_source ||
      null,
    squarespace_contact_id:
      profile.squarespaceContactId ||
      profile.squarespace_contact_id ||
      existing?.squarespace_contact_id ||
      null,
    squarespace_contact_email:
      profile.squarespaceContactEmail ||
      profile.squarespace_contact_email ||
      existing?.squarespace_contact_email ||
      user.email ||
      null,
    squarespace_contact_synced_at:
      profile.squarespaceContactId || profile.squarespace_contact_id
        ? new Date().toISOString()
        : existing?.squarespace_contact_synced_at || null,
    squarespace_verified_at:
      profile.squarespaceVerifiedAt ||
      (profile.squarespaceContactId || profile.squarespace_contact_id
        ? new Date().toISOString()
        : existing?.squarespace_verified_at || null),
    source_updated_at:
      profile.squarespaceSource || profile.source || profile.squarespaceContactId || profile.squarespace_contact_id
        ? new Date().toISOString()
        : existing?.source_updated_at || null,
    flowfm_started_at:
      profile.flowfmStartedAt ||
      existing?.flowfm_started_at ||
      null,
    practitioner_level:
      existing?.practitioner_level ||
      profile.practitionerLevel ||
      "Initiate",
    is_initiated:
      existing?.is_initiated ||
      profile.isInitiated ||
      false,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateMyFlowtelIdentity({ firstName = "", lastName = "", displayName = "" } = {}) {
  const user = await getCurrentUser();

  if (!user) throw new Error("No authenticated user.");

  const legalFirstName = String(firstName || "").trim();
  const legalLastName = String(lastName || "").trim();
  const flowtelDisplayName = String(displayName || "").trim();

  if (!legalFirstName) throw new Error("Add your legal first name.");
  if (!legalLastName) throw new Error("Add your legal last name.");
  if (!flowtelDisplayName) throw new Error("Add the display name you want to use inside the Flowtel.");

  const { data, error } = await supabase.rpc("flowtel_update_my_identity", {
    p_first_name: legalFirstName,
    p_last_name: legalLastName,
    p_display_name: flowtelDisplayName,
  });

  if (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("function") && message.toLowerCase().includes("flowtel_update_my_identity")) {
      throw new Error("The Flowtel identity helper is not installed yet. Run migration 040, then save your profile again.");
    }
    throw error;
  }

  // Refresh the active browser session metadata so identity changes are reflected
  // immediately without requiring a sign-out/sign-in cycle.
  const metadataUpdate = await supabase.auth.updateUser({
    data: {
      first_name: legalFirstName,
      last_name: legalLastName,
      display_name: flowtelDisplayName,
      full_name: flowtelDisplayName,
      name: flowtelDisplayName,
    },
  });
  if (metadataUpdate.error) {
    console.warn("Flowtel identity saved, but browser Auth metadata could not be refreshed yet.", metadataUpdate.error);
  }

  return Array.isArray(data) ? data[0] || null : data;
}

export async function updatePowderRoomSharing(enabled = true) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ collective_season_notes_opt_out: !enabled })
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export function profileNeedsPersonalRoomKey(profile = {}) {
  const role = String(profile?.role || "client").trim().toLowerCase();
  const email = String(profile?.email || "").trim().toLowerCase();

  if (["admin", "owner"].includes(role)) return false;
  if (email.endsWith("@test.local")) return false;

  return !profile?.password_setup_completed_at;
}

export async function markPersonalRoomKeyCreated() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const { data, error } = await supabase.rpc("flowtel_complete_password_setup");

  if (!error && data) return Array.isArray(data) ? data[0] || null : data;

  // Compatibility fallback while migration 038 is being deployed.
  const fallback = await supabase
    .from("profiles")
    .update({ password_setup_completed_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (fallback.error) throw error || fallback.error;

  return fallback.data;
}
