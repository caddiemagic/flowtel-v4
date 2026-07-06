// shared/assignments.js
// Flow FM Business Assignment Tracker helpers.

import { supabase } from "./supabase.js";
import { FLOW_FM_ASSIGNMENTS } from "./initiation.js";

export const FLOW_FM_ASSIGNMENT_STATUSES = [
  { value: "not_started", label: "Not started", tone: "quiet" },
  { value: "drafting", label: "Drafting", tone: "draft" },
  { value: "submitted", label: "Submitted", tone: "submitted" },
  { value: "reviewed", label: "Reviewed", tone: "reviewed" },
  { value: "complete", label: "Complete", tone: "complete" },
  { value: "needs_revision", label: "Needs revision", tone: "revision" },
];

const DEFAULT_STATUS = "not_started";

export function normalizeAssignmentStatus(value) {
  const key = String(value || "").trim().toLowerCase();
  return FLOW_FM_ASSIGNMENT_STATUSES.some(item => item.value === key) ? key : DEFAULT_STATUS;
}

export function labelForAssignmentStatus(value) {
  const status = normalizeAssignmentStatus(value);
  return FLOW_FM_ASSIGNMENT_STATUSES.find(item => item.value === status)?.label || "Not started";
}

export function toneForAssignmentStatus(value) {
  const status = normalizeAssignmentStatus(value);
  return FLOW_FM_ASSIGNMENT_STATUSES.find(item => item.value === status)?.tone || "quiet";
}

export function assignmentStatusCopy(value) {
  const status = normalizeAssignmentStatus(value);
  return {
    not_started: "This room is waiting for your first note, link, or piece of evidence.",
    drafting: "A draft is saved. Return when the assignment is ready to be witnessed.",
    submitted: "Sent to be witnessed. Your mentor or Flowtel admin can tend it from the review queue.",
    reviewed: "Witnessed. Read the note, integrate, and mark the next step when ready.",
    complete: "Complete. This piece of your Flow Factory has been tended.",
    needs_revision: "A revision has been requested. Soften, refine, and send the next version when it is ready.",
  }[status];
}

export function emptyAssignmentRecord(assignmentIndex) {
  return {
    id: null,
    member_id: null,
    assignment_index: Number(assignmentIndex),
    status: DEFAULT_STATUS,
    submission_text: "",
    submission_url: "",
    attachment_url: "",
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    reviewer_name: "",
    mentor_note: "",
    admin_note: "",
    completed_at: null,
    created_at: null,
    updated_at: null,
  };
}

export function mergeAssignmentRecords(records = []) {
  const byIndex = new Map((records || []).map(row => [Number(row.assignment_index), row]));
  return FLOW_FM_ASSIGNMENTS.map(assignment => ({
    ...assignment,
    record: {
      ...emptyAssignmentRecord(assignment.index),
      ...(byIndex.get(Number(assignment.index)) || {}),
      assignment_index: Number(assignment.index),
      status: normalizeAssignmentStatus(byIndex.get(Number(assignment.index))?.status),
    },
  }));
}

export function assignmentProgress(records = []) {
  const merged = mergeAssignmentRecords(records);
  const complete = merged.filter(item => item.record.status === "complete").length;
  const submitted = merged.filter(item => item.record.status === "submitted").length;
  const drafting = merged.filter(item => item.record.status === "drafting").length;
  const needsRevision = merged.filter(item => item.record.status === "needs_revision").length;
  const next = merged.find(item => !["complete"].includes(item.record.status)) || merged[merged.length - 1];
  return {
    total: FLOW_FM_ASSIGNMENTS.length,
    complete,
    submitted,
    drafting,
    needsRevision,
    next,
  };
}

export async function listFlowFmAssignmentStatuses(memberId = null) {
  const { data, error } = await supabase.rpc("flow_fm_get_assignment_statuses", {
    p_member_id: memberId || null,
  });

  if (error) throw error;
  return data || [];
}

export async function saveFlowFmAssignmentDraft({ assignmentIndex, submissionText = "", submissionUrl = "", attachmentUrl = "" }) {
  const { data, error } = await supabase.rpc("flow_fm_save_assignment_draft", {
    p_assignment_index: Number(assignmentIndex),
    p_submission_text: submissionText || null,
    p_submission_url: submissionUrl || null,
    p_attachment_url: attachmentUrl || null,
  });

  if (error) throw error;
  return data;
}

export async function submitFlowFmAssignment({ assignmentIndex, submissionText = "", submissionUrl = "", attachmentUrl = "" }) {
  const { data, error } = await supabase.rpc("flow_fm_submit_assignment", {
    p_assignment_index: Number(assignmentIndex),
    p_submission_text: submissionText || null,
    p_submission_url: submissionUrl || null,
    p_attachment_url: attachmentUrl || null,
  });

  if (error) throw error;
  return data;
}

export async function listFlowFmAssignmentReviewQueue() {
  const { data, error } = await supabase.rpc("flow_fm_get_assignment_review_queue");

  if (error) throw error;
  return data || [];
}

export async function reviewFlowFmAssignment({ submissionId, status, mentorNote = "", adminNote = "" }) {
  const { data, error } = await supabase.rpc("flow_fm_review_assignment", {
    p_submission_id: submissionId,
    p_status: status,
    p_mentor_note: mentorNote || null,
    p_admin_note: adminNote || null,
  });

  if (error) throw error;
  return data;
}
