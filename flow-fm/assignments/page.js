import {
  getCurrentProfile,
  FLOW_FM_ASSIGNMENTS,
  getFlowFmInitiationStatus,
  getFlowFmAssignmentForMoon,
  listFlowFmAssignmentStatuses,
  saveFlowFmAssignmentDraft,
  submitFlowFmAssignment,
  mergeAssignmentRecords,
  assignmentProgress,
  assignmentStatusCopy,
} from '/shared/flowtel.js';
import {
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';
  renderTopNav,
  renderAccessCard,
  requestedMemberId,
  canTendOwnAssignments,
  isViewingAnotherMember,
  escapeHtml,
  safeHref,
  statusPill,
  setMessage,
} from '/flow-fm/ui.js';

const topNav = document.getElementById('topNav');
const accessState = document.getElementById('accessState');
const currentMoonTitle = document.getElementById('currentMoonTitle');
const currentMoonMeta = document.getElementById('currentMoonMeta');
const currentAssignmentTitle = document.getElementById('currentAssignmentTitle');
const currentAssignmentCopy = document.getElementById('currentAssignmentCopy');
const progressTitle = document.getElementById('progressTitle');
const progressCopy = document.getElementById('progressCopy');
const progressPills = document.getElementById('progressPills');
const assignmentList = document.getElementById('assignmentList');
const message = document.getElementById('message');

let currentProfile = null;
let currentRecords = [];

function recordForIndex(records,index){
  return (records || []).find(row => Number(row.assignment_index) === Number(index)) || null;
}
function assignmentLinks(record){
  const submission = safeHref(record?.submission_url);
  const attachment = safeHref(record?.attachment_url);
  const links = [];
  if(submission) links.push(`<a href="${escapeHtml(submission)}" target="_blank" rel="noreferrer">Open assignment link</a>`);
  if(attachment) links.push(`<a href="${escapeHtml(attachment)}" target="_blank" rel="noreferrer">Open file/media link</a>`);
  return links.length ? `<div class="assignment-links">${links.join('')}</div>` : '';
}
function witnessNotes(record){
  const mentor = String(record?.mentor_note || '').trim();
  const admin = String(record?.admin_note || '').trim();
  const reviewer = record?.reviewer_name ? ` · ${record.reviewer_name}` : '';
  if(!mentor && !admin) return '';
  return `<div class="witness-note"><p class="eyebrow">WITNESS NOTE${escapeHtml(reviewer)}</p>${mentor ? `<p>${escapeHtml(mentor)}</p>` : ''}${admin ? `<p class="admin-note">Admin note: ${escapeHtml(admin)}</p>` : ''}</div>`;
}
function renderCurrent(profile,records=[]){
  const status = getFlowFmInitiationStatus(profile || {});
  const assignment = getFlowFmAssignmentForMoon(status.progressMonth || status.moonIndex || 1) || FLOW_FM_ASSIGNMENTS[0];
  const record = recordForIndex(records, assignment.index);
  currentMoonTitle.textContent = status.moon?.name || 'Temple Moon';
  currentMoonMeta.textContent = status.monthLine;
  currentAssignmentTitle.textContent = `${assignment.index} · ${assignment.title}`;
  currentAssignmentCopy.textContent = `${assignment.description} ${assignmentStatusCopy(record?.status || 'not_started')}`;
}
function renderProgress(records=[]){
  const progress = assignmentProgress(records);
  progressTitle.textContent = `${progress.complete} of ${progress.total} rooms tended`;
  progressCopy.textContent = progress.next
    ? `Next room: Assignment ${progress.next.index} · ${progress.next.title}. ${assignmentStatusCopy(progress.next.record.status)}`
    : 'Your Flow Factory has been tended through all 13 assignments.';
  progressPills.innerHTML = [
    ['Complete',progress.complete],
    ['Submitted',progress.submitted],
    ['Drafting',progress.drafting],
    ['Revision',progress.needsRevision],
  ].map(([label,value]) => `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`).join('');
}
function renderAssignmentForm(item, record, readOnly){
  if(readOnly){
    return `<div class="assignment-readonly">${record?.submission_text ? `<p>${escapeHtml(record.submission_text)}</p>` : `<p class="empty-note">No submission has been left in this room yet.</p>`}${assignmentLinks(record)}${witnessNotes(record)}</div>`;
  }
  if(record?.status === 'complete'){
    return `<div class="assignment-complete-note"><p>${escapeHtml(assignmentStatusCopy(record.status))}</p>${record?.submission_text ? `<p>${escapeHtml(record.submission_text)}</p>` : ''}${assignmentLinks(record)}${witnessNotes(record)}</div>`;
  }
  return `<form class="assignment-form" data-assignment-form="${escapeHtml(item.index)}">
    <label><span>Reflection, evidence, or next note</span><textarea name="submission_text" rows="4" placeholder="What did you create? What link, file, or practice is ready to be witnessed?">${escapeHtml(record?.submission_text || '')}</textarea></label>
    <div class="form-grid">
      <label><span>Assignment link</span><input name="submission_url" type="url" placeholder="https://..." value="${escapeHtml(record?.submission_url || '')}" /></label>
      <label><span>File or media URL</span><input name="attachment_url" type="url" placeholder="https://..." value="${escapeHtml(record?.attachment_url || '')}" /></label>
    </div>
    ${witnessNotes(record)}
    <div class="assignment-actions"><button type="button" data-assignment-action="draft">Save Draft</button><button type="button" data-assignment-action="submit">Send to be Witnessed</button></div>
  </form>`;
}
function renderAssignments(profile, records=[]){
  const status = getFlowFmInitiationStatus(profile || {});
  const activeIndex = status.progressMonth || status.moonIndex || 1;
  const merged = mergeAssignmentRecords(records);
  const readOnly = !profile || isViewingAnotherMember(profile) || !canTendOwnAssignments(profile);
  assignmentList.innerHTML = merged.map(item => {
    const record = item.record;
    return `<article class="assignment-row ${item.index===activeIndex ? 'active' : ''}" data-assignment-index="${escapeHtml(item.index)}">
      <div class="assignment-number">${escapeHtml(item.index)}</div>
      <div class="assignment-body">
        <div class="assignment-row-heading"><div><p class="assignment-type">${escapeHtml(item.type)}</p><h3>${escapeHtml(item.title)}</h3></div>${statusPill(record.status)}</div>
        <p>${escapeHtml(item.description)}</p>
        <p class="assignment-status-copy">${escapeHtml(assignmentStatusCopy(record.status))}</p>
        ${renderAssignmentForm(item, record, readOnly)}
        ${Number(item.index) === 1 ? '<div class="assignment-links profile-assignment-link"><a href="/flow-fm/profile-studio/">Open Priestess Profile Studio</a></div>' : ''}
      </div>
    </article>`;
  }).join('');
  bindAssignmentForms();
}
function bindAssignmentForms(){
  assignmentList.querySelectorAll('[data-assignment-form]').forEach(form => {
    form.querySelectorAll('[data-assignment-action]').forEach(button => {
      button.addEventListener('click', () => handleAssignmentAction(form, button.dataset.assignmentAction));
    });
  });
}
async function handleAssignmentAction(form, action){
  const assignmentIndex = Number(form.dataset.assignmentForm);
  const formData = new FormData(form);
  const payload = {
    assignmentIndex,
    submissionText: String(formData.get('submission_text') || ''),
    submissionUrl: String(formData.get('submission_url') || ''),
    attachmentUrl: String(formData.get('attachment_url') || ''),
  };
  try{
    setMessage(message, action === 'submit' ? 'Sending this assignment to be witnessed...' : 'Saving this assignment draft...');
    if(action === 'submit') await submitFlowFmAssignment(payload);
    else await saveFlowFmAssignmentDraft(payload);
    await refreshAssignments();
    setMessage(message, action === 'submit' ? 'Assignment sent to be witnessed.' : 'Assignment draft saved.');
  }catch(error){
    console.error(error);
    setMessage(message, error.message || 'This assignment could not be tended yet.');
  }
}
async function refreshAssignments(){
  if(!currentProfile){
    currentRecords = [];
    renderCurrent(null, []);
    renderProgress([]);
    renderAssignments(null, []);
    return;
  }
  try{
    currentRecords = await listFlowFmAssignmentStatuses(requestedMemberId());
  }catch(error){
    console.error(error);
    currentRecords = [];
    setMessage(message, 'The rooms opened, but saved assignment records could not be loaded. You can still begin drafting below.');
  }
  renderCurrent(currentProfile, currentRecords);
  renderProgress(currentRecords);
  renderAssignments(currentProfile, currentRecords);
}
async function init(){
  topNav.innerHTML = renderTopNav('assignments');
  try{
    currentProfile = await getCurrentProfile();
    if(!isPractitionerLevel(currentProfile)){
      replacePageWithPhaseTwoGate({ featureName:'Business Assignments', title:'Opening in Phase 2', copy:'Business Assignments will open in Phase 2 of beta testing for practitioner-level users.' });
      return;
    }
    accessState.innerHTML = renderAccessCard(currentProfile);
    await refreshAssignments();
  }catch(error){
    console.error(error);
    accessState.innerHTML = renderAccessCard(null);
    renderCurrent(null, []);
    renderProgress([]);
    renderAssignments(null, []);
    setMessage(message, 'The assignment room is visible in preview mode.');
  }
}
init();
