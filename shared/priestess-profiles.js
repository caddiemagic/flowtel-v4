// shared/priestess-profiles.js
// Flow FM Priestess Profile Studio helpers.

import { supabase } from "./supabase.js";

export const PRIESTESS_PROFILE_STATUSES = [
  { value: "draft", label: "Draft", tone: "draft" },
  { value: "submitted", label: "Submitted", tone: "submitted" },
  { value: "approved", label: "Approved", tone: "complete" },
  { value: "needs_revision", label: "Needs revision", tone: "revision" },
];

const DEFAULT_STATUS = "draft";

export function normalizePriestessProfileStatus(value) {
  const key = String(value || "").trim().toLowerCase();
  return PRIESTESS_PROFILE_STATUSES.some(item => item.value === key) ? key : DEFAULT_STATUS;
}

export function labelForPriestessProfileStatus(value) {
  const status = normalizePriestessProfileStatus(value);
  return PRIESTESS_PROFILE_STATUSES.find(item => item.value === status)?.label || "Draft";
}

export function toneForPriestessProfileStatus(value) {
  const status = normalizePriestessProfileStatus(value);
  return PRIESTESS_PROFILE_STATUSES.find(item => item.value === status)?.tone || "draft";
}

export function priestessProfileStatusCopy(value) {
  const status = normalizePriestessProfileStatus(value);
  return {
    draft: "Your profile draft is still in your hands. Save as often as you need.",
    submitted: "Your Priestess Profile has been sent to be witnessed.",
    approved: "Your Priestess Profile has been approved for the next doorway.",
    needs_revision: "A refinement has been requested. Tend the note, soften the language, and send the next version when ready.",
  }[status];
}

export function emptyPriestessProfile(memberId = null) {
  return {
    id: null,
    member_id: memberId,
    member_name: "",
    member_email: "",
    status: DEFAULT_STATUS,
    priestess_name: "",
    legal_name: "",
    profile_email: "",
    profile_photo_url: "",
    bio: "",
    modalities: "",
    who_she_serves: "",
    session_types: "",
    scheduling_url: "",
    website_url: "",
    instagram_url: "",
    tiktok_url: "",
    podcast_url: "",
    queendom_name: "",
    offerings: "",
    location: "",
    timezone: "",
    framework_language: "",
    network_opt_in: false,
    revenue_share_opt_in: false,
    mentor_note: "",
    admin_note: "",
    submitted_at: null,
    reviewed_at: null,
    approved_at: null,
    reviewed_by: null,
    reviewer_name: "",
    created_at: null,
    updated_at: null,
  };
}

export function mergePriestessProfile(profile = null, memberId = null) {
  const row = Array.isArray(profile) ? profile[0] : profile;
  return {
    ...emptyPriestessProfile(memberId),
    ...(row || {}),
    status: normalizePriestessProfileStatus(row?.status),
    network_opt_in: !!row?.network_opt_in,
    revenue_share_opt_in: !!row?.revenue_share_opt_in,
  };
}

function profilePayload(profile = {}) {
  return {
    p_priestess_name: profile.priestessName || profile.priestess_name || null,
    p_legal_name: profile.legalName || profile.legal_name || null,
    p_profile_email: profile.profileEmail || profile.profile_email || null,
    p_profile_photo_url: profile.profilePhotoUrl || profile.profile_photo_url || null,
    p_bio: profile.bio || null,
    p_modalities: profile.modalities || null,
    p_who_she_serves: profile.whoSheServes || profile.who_she_serves || null,
    p_session_types: profile.sessionTypes || profile.session_types || null,
    p_scheduling_url: profile.schedulingUrl || profile.scheduling_url || null,
    p_website_url: profile.websiteUrl || profile.website_url || null,
    p_instagram_url: profile.instagramUrl || profile.instagram_url || null,
    p_tiktok_url: profile.tiktokUrl || profile.tiktok_url || null,
    p_podcast_url: profile.podcastUrl || profile.podcast_url || null,
    p_queendom_name: profile.queendomName || profile.queendom_name || null,
    p_offerings: profile.offerings || null,
    p_location: profile.location || null,
    p_timezone: profile.timezone || null,
    p_framework_language: profile.frameworkLanguage || profile.framework_language || null,
    p_network_opt_in: !!(profile.networkOptIn ?? profile.network_opt_in),
    p_revenue_share_opt_in: !!(profile.revenueShareOptIn ?? profile.revenue_share_opt_in),
  };
}

export async function getPriestessProfile(memberId = null) {
  const { data, error } = await supabase.rpc("flow_fm_get_priestess_profile", {
    p_member_id: memberId || null,
  });

  if (error) {
    // PostgreSQL set-returning functions return an empty array when no profile exists.
    // Permission and migration errors should still be surfaced to the UI.
    throw error;
  }
  return mergePriestessProfile(data || [], memberId);
}

export async function savePriestessProfileDraft(profile = {}) {
  const { data, error } = await supabase.rpc("flow_fm_save_priestess_profile_draft", profilePayload(profile));
  if (error) throw error;
  return data;
}

export async function submitPriestessProfile(profile = {}) {
  const { data, error } = await supabase.rpc("flow_fm_submit_priestess_profile", profilePayload(profile));
  if (error) throw error;
  return data;
}

export async function listPriestessProfileReviewQueue() {
  const { data, error } = await supabase.rpc("flow_fm_get_priestess_profile_review_queue");
  if (error) throw error;
  return data || [];
}

export async function reviewPriestessProfile({ profileId, status, mentorNote = "", adminNote = "" }) {
  const { data, error } = await supabase.rpc("flow_fm_review_priestess_profile", {
    p_profile_id: profileId,
    p_status: status,
    p_mentor_note: mentorNote || null,
    p_admin_note: adminNote || null,
  });
  if (error) throw error;
  return data;
}
