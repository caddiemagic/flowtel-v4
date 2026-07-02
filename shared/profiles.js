// shared/profiles.js

import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

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
    role: existing?.role || profile.role || "client",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}
