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
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function listCaddieReviewRequests() {
  const { data, error } = await supabase.rpc("caddie_magic_list_score_review_requests");
  if (error) throw error;
  return data || [];
}

export async function completeCaddieReviewRequest(requestId, note) {
  if (!requestId) throw new Error("Choose a Caddie Review request.");
  const cleaned = String(note || "").trim();
  if (!cleaned) throw new Error("Leave a Caddie Note before completing the review.");

  const { data, error } = await supabase.rpc("caddie_magic_complete_score_review", {
    p_request_id: requestId,
    p_note: cleaned,
  });
  if (error) throw error;
  return oneRow(data);
}
