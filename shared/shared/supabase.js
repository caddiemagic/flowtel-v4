// shared/supabase.js
// Flowtel v4 Supabase connection

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const SUPABASE_URL = "https://rfgmvsvlukichiqytmky.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_7e2-nhTCRcKtEW_RbUYVVA_nV4NvM34";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return data.user;
}