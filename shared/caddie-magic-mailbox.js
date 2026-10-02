// Caddie Magic v0.7.0 — Call Your Caddie browser voice-note mailbox.
// Phase 1 is intentionally provider-free: MediaRecorder -> private Supabase Storage.

import { supabase } from "./supabase.js";
import { requireProductAccess } from "./product-access.js";

export const CADDIE_MAILBOX_BUCKET = "caddie-mailbox-audio";
export const CADDIE_MAILBOX_MAX_SECONDS = 300;
export const CADDIE_MAILBOX_MAX_BYTES = 50 * 1024 * 1024;
export const CADDIE_MAILBOX_CONSENT_VERSION = "caddie-mailbox-v2";
export const CADDIE_MAILBOX_STATUSES = ["new", "listened", "selected", "used", "archived"];

const MIME_EXTENSION = new Map([
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/aac", "aac"],
  ["audio/x-m4a", "m4a"],
  ["audio/m4a", "m4a"],
]);

export function normalizeMailboxMime(value = "") {
  const base = String(value || "").split(";")[0].trim().toLowerCase();
  return MIME_EXTENSION.has(base) ? base : "";
}

export function mailboxExtensionForMime(value = "") {
  return MIME_EXTENSION.get(normalizeMailboxMime(value)) || "bin";
}

export function chooseMailboxRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => {
    try { return MediaRecorder.isTypeSupported(type); } catch (_) { return false; }
  }) || "";
}

export function formatMailboxDuration(seconds = 0) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export async function getMyMailboxPlayerSnapshot() {
  await requireProductAccess("caddie_magic");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) throw new Error("Sign in to Call Your Caddie.");

  const { data, error } = await supabase
    .from("caddie_magic_player_profiles")
    .select("id,first_name,handicap_or_score_range")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Complete your Player Profile before leaving a message for your Caddie.");
  return { user, profile: data };
}

export async function submitCaddieMailboxMessage({
  messageId,
  callerName,
  handicap,
  audioBlob,
  durationSeconds,
  consentRecording,
  consentPublication,
  anonymityRequested = false,
} = {}) {
  const { user } = await getMyMailboxPlayerSnapshot();
  if (!messageId) throw new Error("The voice-note identifier is missing.");
  if (!(audioBlob instanceof Blob) || audioBlob.size <= 0) throw new Error("Record a voice note before sending it.");
  if (audioBlob.size > CADDIE_MAILBOX_MAX_BYTES) throw new Error("That voice note is too large to send.");
  if (!consentRecording || !consentPublication) throw new Error("Recording and publication consent are required before sending.");

  const duration = Math.max(1, Math.min(CADDIE_MAILBOX_MAX_SECONDS, Math.round(Number(durationSeconds) || 0)));
  const mimeType = normalizeMailboxMime(audioBlob.type);
  if (!mimeType) throw new Error("This browser produced an unsupported audio format. Try the current version of Safari, Chrome, Edge, or Firefox.");
  const extension = mailboxExtensionForMime(mimeType);
  const storagePath = `${user.id}/${messageId}/voice-note.${extension}`;

  const upload = await supabase.storage
    .from(CADDIE_MAILBOX_BUCKET)
    .upload(storagePath, audioBlob, {
      cacheControl: "0",
      contentType: mimeType,
      upsert: false,
    });
  if (upload.error) throw upload.error;

  try {
    const { data, error } = await supabase.rpc("caddie_magic_submit_mailbox_message", {
      p_message_id: messageId,
      p_caller_name: String(callerName || "").trim(),
      p_handicap: String(handicap || "").trim(),
      p_storage_path: storagePath,
      p_mime_type: mimeType,
      p_size_bytes: audioBlob.size,
      p_recording_duration_seconds: duration,
      p_consent_recording: Boolean(consentRecording),
      p_consent_publication: Boolean(consentPublication),
      p_anonymity_requested: Boolean(anonymityRequested),
    });
    if (error) throw error;
    return data || messageId;
  } catch (error) {
    // Cleanup is permitted only while no accepted mailbox row references the file.
    try { await supabase.storage.from(CADDIE_MAILBOX_BUCKET).remove([storagePath]); } catch (_) {}
    throw error;
  }
}

export async function requireCaddieMailboxOwner() {
  const { data, error } = await supabase.rpc("flowtel_current_user_is_concierge");
  if (error) throw error;
  if (data !== true) throw new Error("Only The Caddie Master can open the Caddie Mailbox.");
  return true;
}

export async function listCaddieMailboxMessages(status = null) {
  await requireCaddieMailboxOwner();
  const normalized = status && CADDIE_MAILBOX_STATUSES.includes(String(status).toLowerCase())
    ? String(status).toLowerCase()
    : null;
  const { data, error } = await supabase.rpc("caddie_magic_mailbox_admin_list", {
    p_status: normalized,
  });
  if (error) throw error;
  return data || [];
}

export async function downloadCaddieMailboxAudio(message) {
  await requireCaddieMailboxOwner();
  const path = String(message?.storage_path || "");
  if (!path) throw new Error("This mailbox message is missing its private audio path.");
  const { data, error } = await supabase.storage.from(CADDIE_MAILBOX_BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function markCaddieMailboxListened(messageId) {
  const { data, error } = await supabase.rpc("caddie_magic_mailbox_mark_listened", {
    p_message_id: messageId,
  });
  if (error) throw error;
  return data === true;
}

export async function updateCaddieMailboxMessage(messageId, {
  status,
  callerName,
  adminNotes = "",
} = {}) {
  const normalized = String(status || "").toLowerCase();
  if (!CADDIE_MAILBOX_STATUSES.includes(normalized)) throw new Error("Choose a valid Caddie Mailbox state.");
  const { data, error } = await supabase.rpc("caddie_magic_mailbox_admin_update", {
    p_message_id: messageId,
    p_status: normalized,
    p_caller_name: String(callerName || "").trim(),
    p_admin_notes: String(adminNotes || ""),
  });
  if (error) throw error;
  return data === true;
}
