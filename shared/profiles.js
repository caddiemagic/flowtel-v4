// shared/profiles.js

import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { resolveMembership, roleFromResolvedMembership, rankForMembership, normalizeMembership } from "./membership.js";
import { claimFlowtelAccess, requireProductAccess, isProductAccessError } from "./product-access.js?v=0.10.71";


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

async function fetchProfileForUser(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    await requireProductAccess("flowtel");
    return await fetchProfileForUser(user);
  } catch (error) {
    console.error("Profile lookup failed:", error);
    if (isProductAccessError(error)) throw error;
    return null;
  }
}

export async function ensureProfile(profile = {}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const accessGranted = await claimFlowtelAccess();
  if (!accessGranted) {
    await requireProductAccess("flowtel");
  }
  const existing = await fetchProfileForUser(user);

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

export function normalizeHemisphere(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["northern", "southern", "equatorial"].includes(normalized) ? normalized : "";
}

export async function updateMySharedFlowtelIdentity({
  firstName = "",
  lastName = "",
  displayName = "",
  location = "",
  timezone = "America/Los_Angeles",
  hemisphere = "",
} = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No authenticated user.");

  const payload = {
    p_first_name: String(firstName || "").trim(),
    p_last_name: String(lastName || "").trim(),
    p_display_name: String(displayName || "").trim(),
    p_location: String(location || "").trim(),
    p_timezone: String(timezone || "").trim(),
    p_hemisphere: normalizeHemisphere(hemisphere) || null,
  };

  const { data, error } = await supabase.rpc("flowtel_update_my_shared_identity", payload);
  if (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("flowtel_update_my_shared_identity")) {
      throw new Error("The shared Flowtel identity foundation is not installed yet. Run migration 056, then save again.");
    }
    throw error;
  }

  const saved = Array.isArray(data) ? data[0] || null : data;
  const metadataUpdate = await supabase.auth.updateUser({
    data: {
      first_name: payload.p_first_name,
      last_name: payload.p_last_name,
      display_name: payload.p_display_name,
      full_name: payload.p_display_name,
      name: payload.p_display_name,
      location: payload.p_location,
      timezone: payload.p_timezone,
      hemisphere: payload.p_hemisphere,
    },
  });
  if (metadataUpdate.error) {
    console.warn("Flowtel identity saved, but browser Auth metadata could not be refreshed yet.", metadataUpdate.error);
  }
  return saved;
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


export function profileNeedsConfirmation(profile = {}) {
  if (!profile || !profile.id) return false;
  if (profile.profile_confirmation_required === true) return true;

  return !String(profile.first_name || "").trim()
    || !String(profile.last_name || "").trim()
    || !String(profile.display_name || "").trim()
    || !String(profile.location || "").trim()
    || !String(profile.timezone || "").trim();
}

export async function updateMyGuestProfile({
  firstName = "",
  lastName = "",
  displayName = "",
  location = "",
  timezone = "America/Los_Angeles",
  hemisphere = "",
} = {}) {
  try {
    return await updateMySharedFlowtelIdentity({
      firstName,
      lastName,
      displayName,
      location,
      timezone,
      hemisphere,
    });
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("shared flowtel identity foundation") && !message.includes("flowtel_update_my_shared_identity")) throw error;

    // Compatibility fallback for a brief rolling deployment window. Migration
    // 056 should still be installed before the v0.10.71 website files.
    const user = await getCurrentUser();
    if (!user) throw new Error("No authenticated user.");
    const payload = {
      p_first_name: String(firstName || "").trim(),
      p_last_name: String(lastName || "").trim(),
      p_display_name: String(displayName || "").trim(),
      p_location: String(location || "").trim(),
      p_timezone: String(timezone || "").trim(),
    };
    const { data, error: legacyError } = await supabase.rpc("flowtel_update_my_guest_profile", payload);
    if (legacyError) throw legacyError;
    return Array.isArray(data) ? data[0] || null : data;
  }
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
