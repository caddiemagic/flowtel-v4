import {
  getCurrentProfile,
  getPersonalizedMoonPath,
  getPersonalizedMoonPortal,
  listFlowFmAssignmentStatuses,
  saveFlowFmAssignmentDraft,
  submitFlowFmAssignment,
  assignmentStatusCopy,
} from '/shared/flowtel.js';
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
const portalDoorStrip=document.getElementById('portalDoorStrip');
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
  portalEyebrow.textContent=`MONTH ${portal.portalIndex}`;
  portalTitle.textContent=portal.isOuroboros ? 'Ouroboros Moon' : portal.name;
  portalIntro.textContent=portal.isOuroboros
    ? `Your 13th moon returns you through ${portal.returnMoon?.name || 'your entry moon'} for integration, celebration, and the next spiral.`
    : `Your current teaching and business doorway for this initiation.`;
  hereTitle.textContent=portal.isCurrent ? `You are walking ${portal.name}.` : `You are exploring ${portal.name}.`;
  hereCopy.textContent=portal.isCurrent
    ? 'This is the moon Flowtel is currently orienting you through. You may still explore any portal when your body says yes.'
    : 'This room is open for exploration. Your current moon remains marked in the portal library.';
  portalActions.innerHTML=`<a class="pill-link" href="/flow-fm/">Back to Hall</a><a class="pill-link muted" href="/flow-fm/planning-room/">Planning Room</a><a class="pill-link muted" href="/flow-fm/moons/">Explore Doors</a>`;
  moonPanel.innerHTML=`<p class="eyebrow">MOON INITIATION</p><h3>${escapeHtml(portal.name)}</h3><p>${escapeHtml(portal.theme || '')}</p><div class="portal-meta"><span>${escapeHtml(portal.wing || '')}</span><span>${escapeHtml(portal.season || '')}</span><span>${portal.isOuroboros ? `Returns through ${escapeHtml(portal.returnMoon?.name || 'entry moon')}` : `Canonical ${escapeHtml(portal.month || '')}`}</span></div>`;
  trainingPanel.innerHTML=`<p class="eyebrow">WOMB WORK MODULE ${escapeHtml(module.index || portal.portalIndex)}</p><h3>${escapeHtml(module.title || 'Integration')}</h3><p>${escapeHtml(module.description || 'Integration practices live here.')}</p><div class="module-detail-grid"><article><span>Practice</span><p>${escapeHtml(module.practice || 'Practice will be added here.')}</p></article><article><span>Reflection Prompt</span><p>${escapeHtml(module.prompt || 'Prompt will be added here.')}</p></article><article><span>Course Content</span><p><span class="lesson-placeholder">Squarespace lesson placeholder</span></p></article></div>`;
  assignmentPanel.innerHTML=`<p class="eyebrow">BUSINESS ASSIGNMENT ${escapeHtml(assignment.index || portal.portalIndex)}</p><div class="assignment-row-heading"><div><h3>${escapeHtml(assignment.title || 'Integration Assignment')}</h3><p>${escapeHtml(assignment.description || 'This portal completes the spiral.')}</p></div>${statusPill(record?.status || 'not_started')}</div><p class="assignment-status-copy">${escapeHtml(assignmentStatusCopy(record?.status || 'not_started'))}</p>${renderAssignmentForm(portal, record, readOnly)}`;
  bindAssignmentForm();
}
function renderPortalDoors(path){
  portalDoorStrip.innerHTML=path.map(portal=>`<a class="portal-mini-door ${portal.isCurrent ? 'current' : ''} ${activePortal?.portalIndex===portal.portalIndex ? 'active' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}"><span>${escapeHtml(portal.portalIndex)}</span><strong>${escapeHtml(portal.name)}</strong><small>${portal.isOuroboros ? `Return: ${escapeHtml(portal.returnMoon?.name || '')}` : escapeHtml(portal.month)}</small></a>`).join('');
}
async function loadRecords(){
  if(!currentProfile){ currentRecords=[]; return; }
  try{ currentRecords=await listFlowFmAssignmentStatuses(requestedMemberId()); }
  catch(error){ console.error(error); currentRecords=[]; setMessage(message,'The portal opened, but assignment records could not be loaded.'); }
}
async function init(){
  topNav.innerHTML=renderTopNav('hallway');
  try{
    currentProfile=await getCurrentProfile();
    await loadRecords();
    const path=getPersonalizedMoonPath(currentProfile || {});
    const portal=getPersonalizedMoonPortal(currentProfile || {}, portalParam());
    renderPortal(portal);
    renderPortalDoors(path);
  }catch(error){
    console.error(error);
    currentProfile=null;
    const path=getPersonalizedMoonPath({});
    const portal=getPersonalizedMoonPortal({}, portalParam() || 1);
    renderPortal(portal);
    renderPortalDoors(path);
    setMessage(message,'The moon portal is open in preview mode.');
  }
}
init();
