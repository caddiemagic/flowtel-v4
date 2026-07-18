// shared/auth.js

import { supabase } from "./supabase.js";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Could not get current user:", error);
    return null;
  }

  return data.user;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data.user;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return data.user;
}

export async function updateCurrentPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) throw error;

  return data.user;
}

export async function sendPasswordResetEmail(email, redirectTo) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;

  return data;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error && !/session.*missing|auth session missing/i.test(String(error.message || error))) {
    throw error;
  }
}
