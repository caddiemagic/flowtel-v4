// shared/profiles.js

import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { resolveMembership, roleFromResolvedMembership, rankForMembership, normalizeMembership } from "./membership.js";

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
  const resolvedMembership = resolveMembership(existing?.membership_type, incomingMembership);
  const resolvedRole = (user.email?.endsWith("@test.local") && profile.forceBetaRole)
    ? (profile.role || "client")
    : roleFromResolvedMembership(resolvedMembership, existing?.role || profile.role || "client");

  const payload = {
    id: user.id,
    email: user.email,
    first_name:
      profile.firstName ||
      existing?.first_name ||
      user.user_metadata?.first_name ||
      null,
    last_name:
      profile.lastName ||
      existing?.last_name ||
      user.user_metadata?.last_name ||
      null,
    role: resolvedRole,
    membership_type: resolvedMembership || existing?.membership_type || null,
    membership_rank: rankForMembership(resolvedMembership || existing?.membership_type),
    squarespace_source:
      profile.squarespaceSource ||
      profile.source ||
      existing?.squarespace_source ||
      null,
    source_updated_at:
      profile.squarespaceSource || profile.source
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
