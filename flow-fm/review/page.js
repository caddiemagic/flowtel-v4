import {
  getCurrentProfile,
  getFlowFmAssignmentForMoon,
  listFlowFmAssignmentReviewQueue,
  reviewFlowFmAssignment,
  listPriestessProfileReviewQueue,
  reviewPriestessProfile,
} from '/shared/flowtel.js?v=0.10.77';
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';
import {
  renderTopNav,
  renderAccessCard,
  escapeHtml,
  safeHref,
  setMessage,
  statusPill,
  profileStatusPill,
  isAdminRole,
} from '/flow-fm/ui.js?v=0.10.77';

const topNav = document.getElementById('topNav');
const accessState = document.getElementById('accessState');
const reviewQueue = document.getElementById('reviewQueue');
const profileReviewQueue = document.getElementById('profileReviewQueue');
const reviewQueueCard = document.getElementById('reviewQueueCard');
const profileReviewQueueCard = document.getElementById('profileReviewQueueCard');
const message = document.getElementById('message');

let currentProfile = null;

function reviewLink(row){
  return `<a href="/flow-fm/portal/?portal=${encodeURIComponent(row.assignment_index)}&member=${encodeURIComponent(row.member_id)}#busy-work">Open member Busy Work</a>`;
}
function renderReviewQueue(rows=[]){
  if(!isAdminRole(currentProfile)){
    reviewQueue.innerHTML = `<article class="review-row empty"><p>The Review Desk opens for Flowtel admin and owner accounts only.</p></article>`;
    return;
  }
  if(!rows.length){
    reviewQueue.innerHTML = `<article class="review-row empty"><p>No submitted Busy Work is waiting in the queue.</p></article>`;
    return;
  }
  reviewQueue.innerHTML = rows.map(row => {
    const assignment = getFlowFmAssignmentForMoon(row.assignment_index);
    const submission = safeHref(row.submission_url);
    const attachment = safeHref(row.attachment_url);
    return `<article class="review-row" data-review-id="${escapeHtml(row.id)}"><div class="review-heading"><div><p class="eyebrow">${escapeHtml(row.member_name)} · BUSY WORK ${escapeHtml(row.assignment_index)}</p><h3>${escapeHtml(assignment?.title || 'Flow FM Busy Work')}</h3><p>${escapeHtml(row.submission_text || 'No written note was included.')}</p><div class="assignment-links">${submission ? `<a href="${escapeHtml(submission)}" target="_blank" rel="noreferrer">Open Busy Work link</a>` : ''}${attachment ? `<a href="${escapeHtml(attachment)}" target="_blank" rel="noreferrer">Open file/media link</a>` : ''}${reviewLink(row)}</div></div>${statusPill(row.status)}</div><div class="review-form"><label><span>Mentor note</span><textarea rows="3" data-review-note placeholder="Leave the note she should receive after this is witnessed.">${escapeHtml(row.mentor_note || '')}</textarea></label>${isAdminRole(currentProfile) ? `<label><span>Admin note</span><textarea rows="3" data-admin-note placeholder="Internal Flowtel note.">${escapeHtml(row.admin_note || '')}</textarea></label>` : ''}<div class="assignment-actions review-actions"><button type="button" data-review-status="reviewed">Mark Reviewed</button><button type="button" data-review-status="complete">Mark Complete</button><button type="button" data-review-status="needs_revision">Request Revision</button></div></div></article>`;
  }).join('');
  reviewQueue.querySelectorAll('[data-review-status]').forEach(button => {
    button.addEventListener('click', () => handleReviewAction(button.closest('[data-review-id]'), button.dataset.reviewStatus));
  });
}
async function handleReviewAction(row, status){
  if(!row) return;
  const submissionId = row.dataset.reviewId;
  const mentorNote = row.querySelector('[data-review-note]')?.value || '';
  const adminNote = row.querySelector('[data-admin-note]')?.value || '';
  try{
    setMessage(message, 'Tending this Busy Work review...');
    await reviewFlowFmAssignment({ submissionId, status, mentorNote, adminNote });
    await refresh();
    setMessage(message, 'Busy Work review saved.');
  }catch(error){
    console.error(error);
    setMessage(message, error.message || 'This Busy Work could not be reviewed yet.');
  }
}
function renderProfileReviewQueue(rows=[]){
  if(!isAdminRole(currentProfile)){
    profileReviewQueue.innerHTML = `<article class="review-row empty"><p>The profile review queue opens for Flowtel admin and owner accounts only.</p></article>`;
    return;
  }
  if(!rows.length){
    profileReviewQueue.innerHTML = `<article class="review-row empty"><p>No Priestess Profiles are waiting in the queue.</p></article>`;
    return;
  }
  profileReviewQueue.innerHTML = rows.map(row => `<article class="review-row" data-profile-review-id="${escapeHtml(row.id)}"><div class="review-heading"><div><p class="eyebrow">${escapeHtml(row.member_name)} · PROFILE REVIEW</p><h3>${escapeHtml(row.priestess_name || 'Priestess Profile')}</h3><p>${escapeHtml(row.bio || 'No About Me has been included yet.')}</p><div class="assignment-links"><a href="/flow-fm/profile-studio/?member=${encodeURIComponent(row.member_id)}">Open profile studio</a></div></div>${profileStatusPill(row.status)}</div><div class="review-form"><label><span>Mentor note</span><textarea rows="3" data-profile-review-note placeholder="Leave the note she should receive after this profile is witnessed.">${escapeHtml(row.mentor_note || '')}</textarea></label>${isAdminRole(currentProfile) ? `<label><span>Admin note</span><textarea rows="3" data-profile-admin-note placeholder="Internal Flowtel note.">${escapeHtml(row.admin_note || '')}</textarea></label>` : ''}<div class="assignment-actions review-actions"><button type="button" data-profile-review-status="approved">Approve Profile</button><button type="button" data-profile-review-status="needs_revision">Request Refinement</button></div></div></article>`).join('');
  profileReviewQueue.querySelectorAll('[data-profile-review-status]').forEach(button => {
    button.addEventListener('click', () => handleProfileReviewAction(button.closest('[data-profile-review-id]'), button.dataset.profileReviewStatus));
  });
}
async function handleProfileReviewAction(row, status){
  if(!row) return;
  const profileId = row.dataset.profileReviewId;
  const mentorNote = row.querySelector('[data-profile-review-note]')?.value || '';
  const adminNote = row.querySelector('[data-profile-admin-note]')?.value || '';
  try{
    setMessage(message, 'Tending this Priestess Profile...');
    await reviewPriestessProfile({ profileId, status, mentorNote, adminNote });
    await refresh();
    setMessage(message, status === 'approved' ? 'Priestess Profile approved.' : 'Profile refinement note sent.');
  }catch(error){
    console.error(error);
    setMessage(message, error.message || 'This Priestess Profile could not be reviewed yet.');
  }
}
function errorMessage(error){
  return error?.message || error?.hint || error?.details || 'Unknown queue error.';
}

async function refresh(){
  if(!isAdminRole(currentProfile)){
    renderReviewQueue([]);
    renderProfileReviewQueue([]);
    setMessage(message, 'The Review Desk opens for Flowtel admin and owner accounts only.');
    return;
  }

  const [assignmentResult, profileResult] = await Promise.allSettled([
    listFlowFmAssignmentReviewQueue(),
    listPriestessProfileReviewQueue(),
  ]);

  let notices = [];

  if(assignmentResult.status === 'fulfilled'){
    renderReviewQueue(assignmentResult.value || []);
  }else{
    console.error('Busy Work review queue failed.', assignmentResult.reason);
    renderReviewQueue([]);
    notices.push(`Busy Work queue could not be loaded: ${errorMessage(assignmentResult.reason)}`);
  }

  if(profileResult.status === 'fulfilled'){
    renderProfileReviewQueue(profileResult.value || []);
  }else{
    console.error('Profile review queue failed.', profileResult.reason);
    renderProfileReviewQueue([]);
    notices.push(`Profile queue could not be loaded: ${errorMessage(profileResult.reason)}`);
  }

  setMessage(message, notices.join(' '));
}
async function init(){
  topNav.innerHTML = renderTopNav('review');
  try{
    currentProfile = await getCurrentProfile();
    if(!isPractitionerLevel(currentProfile)){
      replacePageWithPhaseTwoGate({ featureName:'Review Desk', title:'Opening in Phase 2', copy:'Review Desk will open in Phase 2 of beta testing for practitioner-level users.' });
      return;
    }
    accessState.innerHTML = renderAccessCard(currentProfile);
    await refresh();
  }catch(error){
    console.error(error);
    accessState.innerHTML = renderAccessCard(null);
    renderReviewQueue([]);
    renderProfileReviewQueue([]);
    reviewQueueCard.classList.remove('hidden');
    profileReviewQueueCard.classList.remove('hidden');
    setMessage(message, 'The Review Desk is visible in preview mode.');
  }
}
init();
