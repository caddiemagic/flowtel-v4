import {
  getCurrentProfile,
  getPersonalizedMoonPortal,
  listFlowFmAssignmentStatuses,
  saveFlowFmAssignmentDraft,
  submitFlowFmAssignment,
  assignmentStatusCopy,
  getMoonDatesForPortal,
} from '/shared/flowtel.js';
import { canAccessFlowFmCurriculum } from '/shared/rollout.js';
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';
import {
  renderTopNav,
  escapeHtml,
  requestedMemberId,
  canTendOwnAssignments,
  isViewingAnotherMember,
  safeHref,
  setMessage,
  statusPill,
} from '/flow-fm/ui.js';

const topNav=document.getElementById('topNav');
const portalEyebrow=document.getElementById('portalEyebrow');
const portalTitle=document.getElementById('portalTitle');
const portalIntro=document.getElementById('portalIntro');
const hereTitle=document.getElementById('hereTitle');
const hereCopy=document.getElementById('hereCopy');
const portalActions=document.getElementById('portalActions');
const moonPanel=document.getElementById('moonPanel');
const trainingPanel=document.getElementById('trainingPanel');
const assignmentPanel=document.getElementById('assignmentPanel');
const message=document.getElementById('message');
let currentProfile=null;
let currentRecords=[];
let activePortal=null;

function portalParam(){
  const value=new URLSearchParams(window.location.search).get('portal');
  const number=Number(value);
  return Number.isFinite(number) ? number : null;
}
function recordForIndex(records,index){
  return (records || []).find(row=>Number(row.assignment_index)===Number(index)) || null;
}
function assignmentLinks(record){
  const submission=safeHref(record?.submission_url);
  const attachment=safeHref(record?.attachment_url);
  const links=[];
  if(submission) links.push(`<a href="${escapeHtml(submission)}" target="_blank" rel="noreferrer">Open assignment link</a>`);
  if(attachment) links.push(`<a href="${escapeHtml(attachment)}" target="_blank" rel="noreferrer">Open file/media link</a>`);
  return links.length ? `<div class="assignment-links">${links.join('')}</div>` : '';
}
function witnessNotes(record){
  const mentor=String(record?.mentor_note || '').trim();
  const admin=String(record?.admin_note || '').trim();
  if(!mentor && !admin) return '';
  return `<div class="witness-note"><p class="eyebrow">WITNESS NOTE</p>${mentor ? `<p>${escapeHtml(mentor)}</p>` : ''}${admin ? `<p class="admin-note">Admin note: ${escapeHtml(admin)}</p>` : ''}</div>`;
}
function renderAssignmentForm(portal, record, readOnly){
  const assignment=portal.businessAssignment;
  if(!assignment) return '<p>This portal is reserved for integration.</p>';
  if(Number(assignment.index)===1){
    return `<div class="assignment-complete-note"><p>The Priestess Profile Studio is the workroom for Assignment 1. Submit the profile there; the Business Assignment tracker should treat that as the real doorway.</p><div class="assignment-actions"><a class="pill-link" href="/flow-fm/profile-studio/">Open Profile Studio</a></div>${witnessNotes(record)}</div>`;
  }
  if(readOnly){
    return `<div class="assignment-readonly">${record?.submission_text ? `<p>${escapeHtml(record.submission_text)}</p>` : `<p class="empty-note">This assignment is open to explore. Sign in as the member to save or submit.</p>`}${assignmentLinks(record)}${witnessNotes(record)}</div>`;
  }
  if(record?.status === 'complete'){
    return `<div class="assignment-complete-note"><p>${escapeHtml(assignmentStatusCopy(record.status))}</p>${record?.submission_text ? `<p>${escapeHtml(record.submission_text)}</p>` : ''}${assignmentLinks(record)}${witnessNotes(record)}</div>`;
  }
  return `<form class="assignment-form" data-assignment-form="${escapeHtml(assignment.index)}">
    <label><span>Reflection, evidence, or next note</span><textarea name="submission_text" rows="4" placeholder="What did you create? What link, file, or practice is ready to be witnessed?">${escapeHtml(record?.submission_text || '')}</textarea></label>
    <div class="form-grid"><label><span>Assignment link</span><input name="submission_url" type="url" placeholder="https://..." value="${escapeHtml(record?.submission_url || '')}" /></label><label><span>File or media URL</span><input name="attachment_url" type="url" placeholder="https://..." value="${escapeHtml(record?.attachment_url || '')}" /></label></div>
    ${witnessNotes(record)}
    <div class="assignment-actions"><button type="button" data-assignment-action="draft">Save Draft</button><button type="button" data-assignment-action="submit">Send to be Witnessed</button></div>
  </form>`;
}
function bindAssignmentForm(){
  const form=assignmentPanel.querySelector('[data-assignment-form]');
  if(!form) return;
  form.querySelectorAll('[data-assignment-action]').forEach(button=>button.addEventListener('click',()=>handleAssignmentAction(form,button.dataset.assignmentAction)));
}
async function handleAssignmentAction(form,action){
  const assignmentIndex=Number(form.dataset.assignmentForm);
  const formData=new FormData(form);
  const payload={assignmentIndex,submissionText:String(formData.get('submission_text')||''),submissionUrl:String(formData.get('submission_url')||''),attachmentUrl:String(formData.get('attachment_url')||'')};
  try{
    setMessage(message, action==='submit' ? 'Sending this assignment to be witnessed...' : 'Saving this assignment draft...');
    if(action==='submit') await submitFlowFmAssignment(payload);
    else await saveFlowFmAssignmentDraft(payload);
    await loadRecords();
    renderPortal(activePortal);
    setMessage(message, action==='submit' ? 'Assignment sent to be witnessed.' : 'Assignment draft saved.');
  }catch(error){
    console.error(error);
    setMessage(message, error.message || 'This assignment could not be tended yet.');
  }
}
function renderPortal(portal){
  activePortal=portal;
  const module=portal.wombWorkModule || {};
  const assignment=portal.businessAssignment || {};
  const record=recordForIndex(currentRecords, assignment.index);
  const readOnly=!currentProfile || isViewingAnotherMember(currentProfile) || !canTendOwnAssignments(currentProfile);
  portalActions.innerHTML=`<a class="pill-link muted" href="/flow-fm/">Initiation Hall</a><a class="pill-link muted" href="/flow-fm/hourly-flow-rate/">Hourly Flow Rate</a><a class="pill-link muted" href="/flow-fm/profile-studio/">Profile Studio</a><a class="pill-link muted" href="/client/">Return to Suite</a>`;

  if(!canAccessFlowFmCurriculum(currentProfile || {})){
    portalEyebrow.textContent='PHASE 1 BETA';
    portalTitle.textContent='Temple curriculum sealed';
    portalIntro.textContent='The moon curriculum is being held back for a later rollout so guest-flow testing stays clean and easy to localize.';
    hereTitle.textContent='Your BIG VISION rooms are active.';
    hereCopy.textContent='In this phase, members can move through the Flowtel arrival experience, choose a mentor, cultivate an Hourly Flow Rate, and submit a Priestess Profile for review.';
    moonPanel.innerHTML=`<p class="eyebrow">ACTIVE TESTING PATH</p><h3>Guest Flow + BIG VISION Rooms</h3><p>The wider 13 Moon path is intentionally paused during this round of testing.</p><div class="portal-meta"><span>Guest experience open</span><span>Mentor selection open</span><span>Profile + Hourly Flow Rate open</span></div>`;
    trainingPanel.innerHTML=`<p class="eyebrow">WHAT TO TEST NOW</p><h3>Stay in the simplest path.</h3><p>Use this phase to test the guest Flowtel rhythm, Profile Studio, and the Hourly Flow Rate receiving practice over time.</p><div class="module-detail-grid"><article><span>Open</span><p>Guest check-in, Hourly Flow Rate, Profile Studio, mentor request flow, and admin review queue.</p></article><article><span>Closed</span><p>Clock-in, practitioner concierge workflows, and the wider curriculum.</p></article><article><span>Next step</span><p>Choose four seasonal locations or complete your profile and send it to be witnessed.</p></article></div><div class="module-cta-row"><a class="pill-link" href="/flow-fm/hourly-flow-rate/">Open Hourly Flow Rate</a><a class="pill-link muted" href="/flow-fm/profile-studio/">Open Profile Studio</a></div>`;
    assignmentPanel.innerHTML=`<p class="eyebrow">CURRENT ACTION</p><div class="assignment-row-heading"><div><h3>Submit your Priestess Profile</h3><p>This is the core build path for Phase 1 beta.</p></div>${statusPill('drafting')}</div><p class="assignment-status-copy">Once the profile is submitted, the admin review queue can witness it under the founding Flowtel admin account.</p><div class="assignment-actions"><a class="pill-link" href="/flow-fm/profile-studio/">Go to Profile Studio</a></div>`;
    return;
  }

  if(portal.isOuroboros && portal.isLocked){
    portalEyebrow.textContent='MONTH 13 · TIME VAULT';
    portalTitle.textContent='Mystery Moon';
    portalIntro.textContent='The Ouroboros Moon is sealed for now. It opens as a ceremonial time vault on the anniversary of your Flow FM beginning.';
    hereTitle.textContent='This door is still sealed.';
    hereCopy.textContent=portal.vaultOpensLabel
      ? `Your Mystery Moon opens on ${portal.vaultOpensLabel}. Until then, let the suspense build and keep walking the first twelve doors.`
      : 'Your Mystery Moon opens one year after you join Flow FM.';
    moonPanel.innerHTML=`<p class="eyebrow">MYSTERY MOON</p><h3>Ouroboros Time Vault</h3><p>The final moon is being kept as a sacred reveal. This chamber opens one full year after your Flow FM initiation so the ending can arrive with ceremony.</p><div class="portal-meta"><span>Sealed door</span><span>${escapeHtml(portal.vaultOpensLabel ? `Opens ${portal.vaultOpensLabel}` : 'Opens after one year')}</span><span>${escapeHtml(portal.returnMoon?.name ? `Returns through ${portal.returnMoon.name}` : 'Returns through your entry moon')}</span></div>`;
    trainingPanel.innerHTML=`<p class="eyebrow">BEFORE THE VAULT OPENS</p><h3>Tend the first twelve moons.</h3><p>The Mystery Moon is not a room to rush. Let your initiation ripen first, then come back when the vault opens.</p><div class="module-detail-grid"><article><span>What to do now</span><p>Stay with your current moon portal and complete the first twelve doors in rhythm.</p></article><article><span>Why it is sealed</span><p>The final moon is designed as a one-year return, opened on the same date you joined Flow FM.</p></article><article><span>When it opens</span><p>${escapeHtml(portal.vaultOpensLabel || 'One year after your start date')}</p></article></div>`;
    assignmentPanel.innerHTML=`<p class="eyebrow">TIME-LOCKED ASSIGNMENT</p><div class="assignment-row-heading"><div><h3>Vault not open yet</h3><p>The Month 13 assignment is intentionally hidden until your anniversary door opens.</p></div>${statusPill('not_started')}</div><p class="assignment-status-copy">Return on the anniversary of your Flow FM start date to open this final initiation.</p>`;
    return;
  }

  portalEyebrow.textContent=`MONTH ${portal.portalIndex} · MOON PORTAL`;
  portalTitle.textContent=portal.isOuroboros ? 'Ouroboros Moon' : portal.name;
  portalIntro.textContent=portal.isOuroboros
    ? `Your 13th moon returns you through ${portal.returnMoon?.name || 'your entry moon'} for integration, celebration, and the next spiral.`
    : `This portal gathers ${portal.name}, ${module.title || 'womb work'}, and ${assignment.title || 'business practice'} in one place.`;
  hereTitle.textContent=portal.name;
  hereCopy.textContent=portal.isCurrent
    ? 'This is the moon Flowtel is currently orienting you through. Training, practice, and the business doorway are gathered below.'
    : 'This room is open for exploration. Return to the Initiation Hall any time to see the full path.';
  const moonDates=getMoonDatesForPortal(portal);
  moonPanel.innerHTML=`<p class="eyebrow">MOON INITIATION</p><h3>${escapeHtml(portal.name)}</h3><p>${escapeHtml(portal.theme || '')}</p><div class="portal-meta"><span>${escapeHtml(portal.wing || '')}</span><span>${escapeHtml(portal.season || '')}</span><span>New Moon: ${escapeHtml(moonDates.newMoonLabel)}</span><span>Full Moon: ${escapeHtml(moonDates.fullMoonLabel)}</span><span>${portal.isOuroboros ? `Returns through ${escapeHtml(portal.returnMoon?.name || 'entry moon')}` : `Canonical ${escapeHtml(portal.month || '')}`}</span></div>`;
  trainingPanel.innerHTML=`<p class="eyebrow">WOMB WORK MODULE ${escapeHtml(module.index || portal.portalIndex)}</p><h3>${escapeHtml(module.title || 'Integration')}</h3><p>${escapeHtml(module.description || 'Integration practices live here.')}</p><div class="module-detail-grid"><article><span>Practice</span><p>${escapeHtml(module.practice || 'Practice will be added here.')}</p></article><article><span>Reflection Prompt</span><p>${escapeHtml(module.prompt || 'Prompt will be added here.')}</p></article><article><span>Course Content</span><p><span class="lesson-placeholder">Squarespace lesson placeholder</span></p></article></div>${Number(module.index || portal.portalIndex)===1 ? '<div class="module-cta-row"><a class="pill-link" href="/tracker/">Track Your Cycle</a></div>' : ''}`;
  assignmentPanel.innerHTML=`<p class="eyebrow">BUSINESS ASSIGNMENT ${escapeHtml(assignment.index || portal.portalIndex)}</p><div class="assignment-row-heading"><div><h3>${escapeHtml(assignment.title || 'Integration Assignment')}</h3><p>${escapeHtml(assignment.description || 'This portal completes the spiral.')}</p></div>${statusPill(record?.status || 'not_started')}</div><p class="assignment-status-copy">${escapeHtml(assignmentStatusCopy(record?.status || 'not_started'))}</p>${renderAssignmentForm(portal, record, readOnly)}`;
  bindAssignmentForm();
}
async function loadRecords(){
  if(!currentProfile){ currentRecords=[]; return; }
  try{ currentRecords=await listFlowFmAssignmentStatuses(requestedMemberId()); }
  catch(error){ console.error(error); currentRecords=[]; setMessage(message,'The portal opened, but assignment records could not be loaded.'); }
}
async function init(){
  topNav.innerHTML=renderTopNav('portal');
  try{
    currentProfile=await getCurrentProfile();
    if(!isPractitionerLevel(currentProfile)){
      replacePageWithPhaseTwoGate({ featureName:'Moon Portal', title:'Opening in Phase 2', copy:'Moon Portal will open in Phase 2 of beta testing for practitioner-level users.' });
      return;
    }
    await loadRecords();
    const portal=getPersonalizedMoonPortal(currentProfile || {}, portalParam());
    renderPortal(portal);
  }catch(error){
    console.error(error);
    currentProfile=null;
    const portal=getPersonalizedMoonPortal({}, portalParam() || 1);
    renderPortal(portal);
    setMessage(message,'The moon portal is open in preview mode.');
  }
}
init();
