// Caddie Magic v0.5.1 — Caddie Master Scorecard Review credits.

import { supabase } from "./supabase.js";

function oneRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function requestCaddieReview() {
  const { data, error } = await supabase.rpc("caddie_magic_request_score_review");
  if (error) throw error;
  return oneRow(data);
}

export async function getMyCaddieReviewRequests() {
  const { data, error } = await supabase
    .from("caddie_magic_review_requests")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function listCaddieReviewRequests() {
  const { data, error } = await supabase.rpc("caddie_magic_list_score_review_requests");
  if (error) throw error;
  return data || [];
}

export async function completeCaddieReviewRequest(requestId, note) {
  if (!requestId) throw new Error("Choose a Scorecard Review request.");
  const cleaned = String(note || "").trim();
  if (!cleaned) throw new Error("Leave a Caddie Master Note before completing the review.");

  const { data, error } = await supabase.rpc("caddie_magic_complete_score_review", {
    p_request_id: requestId,
    p_note: cleaned,
  });
  if (error) throw error;
  return oneRow(data);
}

export async function closeCaddieReviewRequest(requestId, status, note = "") {
  const normalized = String(status || "").trim().toLowerCase();
  if (!requestId) throw new Error("Choose a Scorecard Review request.");
  if (!["cancelled", "declined"].includes(normalized)) {
    throw new Error("Choose cancelled or declined.");
  }
  const { data, error } = await supabase.rpc("caddie_magic_close_score_review", {
    p_request_id: requestId,
    p_status: normalized,
    p_note: String(note || "").trim() || null,
  });
  if (error) throw error;
  return oneRow(data);
}
