import {
  getCurrentProfile,
  getPersonalizedMoonPath,
  getMoonDatesForPortal,
  listFlowFmAssignmentStatuses,
} from '/shared/flowtel.js?v=0.10.77';
import { canAccessFlowFmCurriculum } from '/shared/rollout.js';
import { renderTopNav, escapeHtml, seasonClass, setMessage, statusPill } from '/flow-fm/ui.js?v=0.10.77';
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';

const topNav=document.getElementById('topNav');
const moonPath=document.getElementById('moonPath');
const message=document.getElementById('message');
let currentRecords=[];

function recordForIndex(index){
  return currentRecords.find(row=>Number(row.assignment_index)===Number(index)) || null;
}
function portalHref(portal, anchor=''){
  return `/flow-fm/portal/?portal=${encodeURIComponent(portal.portalIndex)}${anchor}`;
}
function curriculumPiece({label,title,copy,href,status='',tone=''}){
  return `<section class="moon-curriculum-piece ${tone ? `piece-${escapeHtml(tone)}` : ''}">
    <div class="moon-piece-heading"><p class="moon-piece-label">${escapeHtml(label)}</p>${status}</div>
    <h4>${escapeHtml(title)}</h4>
    <p>${escapeHtml(copy)}</p>
    <a class="moon-piece-link" href="${href}">Open ${escapeHtml(label)}</a>
  </section>`;
}
function renderLockedVault(portal){
  return `<article class="moon-card moon-curriculum-card moon-${seasonClass(portal.season)} is-locked">
    <div class="moon-card-header"><div class="moon-number">?</div><div><p class="eyebrow">TIME VAULT</p><h3>Mystery Moon</h3><p>${escapeHtml(portal.vaultOpensLabel ? `Opens ${portal.vaultOpensLabel}` : 'Opens one year after your Flow FM start date')}</p></div></div>
    <div class="moon-curriculum-grid"><section class="moon-curriculum-piece is-sealed"><p class="moon-piece-label">WOMB WORK</p><h4>Sealed</h4><p>The final practice opens with the anniversary vault.</p></section><section class="moon-curriculum-piece is-sealed"><p class="moon-piece-label">BUSY WORK</p><h4>Sealed</h4><p>The final practical build remains time-locked.</p></section></div>
  </article>`;
}
function renderMoonCard(portal){
  if(portal.isOuroboros && portal.isLocked) return renderLockedVault(portal);
  const module=portal.wombWorkModule || {};
  const busyWork=portal.busyWork || portal.businessAssignment || {};
  const record=recordForIndex(busyWork.index || portal.portalIndex);
  const dates=getMoonDatesForPortal(portal);
  return `<article class="moon-card moon-curriculum-card ${portal.isCurrent ? 'active' : ''} moon-${seasonClass(portal.season)}" id="moon-${escapeHtml(portal.portalIndex)}">
    <div class="moon-card-header">
      <div class="moon-number">${escapeHtml(portal.portalIndex)}</div>
      <div class="moon-card-title-block">
        <p class="eyebrow">${portal.isOuroboros ? '13TH WING' : `${escapeHtml(portal.month)} · ${escapeHtml(portal.wing)}`}</p>
        <h3>${escapeHtml(portal.name)}</h3>
        <p class="moon-theme">${escapeHtml(portal.theme || '')}</p>
        <div class="moon-date-pills"><span><strong>New</strong>${escapeHtml(dates.newMoonLabel)}</span><span><strong>Full</strong>${escapeHtml(dates.fullMoonLabel)}</span></div>
      </div>
      ${portal.isCurrent ? '<span class="current-moon-marker">Current Moon</span>' : ''}
    </div>
    <div class="moon-curriculum-grid">
      ${curriculumPiece({label:'Womb Work',title:module.title || 'Integration',copy:module.description || 'The inner practice for this Moon.',href:portalHref(portal,'#womb-work'),tone:'womb'})}
      ${curriculumPiece({label:'Busy Work',title:busyWork.title || 'Integration',copy:busyWork.description || 'The practical build for this Moon.',href:Number(busyWork.index)===1 ? '/flow-fm/profile-studio/' : portalHref(portal,'#busy-work'),status:statusPill(record?.status || 'not_started'),tone:'busy'})}
    </div>
    <div class="moon-card-footer"><a class="pill-link muted" href="${portalHref(portal)}">Open Moon ${escapeHtml(portal.portalIndex)}</a></div>
  </article>`;
}
function renderMoonPath(profile){
  if(!canAccessFlowFmCurriculum(profile || {})){
    moonPath.innerHTML=`<article class="flowfm-beta-lock-card"><p class="eyebrow">PHASE 1 BETA</p><h3>The 13 Moons curriculum is resting for now.</h3><p>Profile Studio and Hourly Flow Rate remain open while the Moon curriculum is held for a later beta phase.</p><div class="module-cta-row"><a class="pill-link" href="/flow-fm/profile-studio/">Open Profile Studio</a></div></article>`;
    return;
  }
  moonPath.innerHTML=getPersonalizedMoonPath(profile || {}).map(renderMoonCard).join('');
  const focus=new URLSearchParams(window.location.search).get('focus');
  if(focus==='womb-work') setMessage(message,'Womb Work is now organized inside each Moon.');
  if(focus==='busy-work' || focus==='assignments') setMessage(message,'Busy Work is now organized inside each Moon.');
  const current=moonPath.querySelector('.moon-curriculum-card.active');
  if(focus && current) current.scrollIntoView({behavior:'smooth',block:'center'});
}
async function init(){
  topNav.innerHTML=renderTopNav('moons');
  try{
    const profile=await getCurrentProfile();
    if(!isPractitionerLevel(profile)){
      replacePageWithPhaseTwoGate({featureName:'13 Moons',title:'Opening in Phase 2',copy:'The 13 Moons curriculum will open in Phase 2 of beta testing for practitioner-level users.'});
      return;
    }
    try{ currentRecords=await listFlowFmAssignmentStatuses(); }
    catch(error){ console.error(error); currentRecords=[]; setMessage(message,'The curriculum opened, but Busy Work statuses could not be loaded just now.'); }
    renderMoonPath(profile);
  }catch(error){
    console.error(error);
    currentRecords=[];
    renderMoonPath(null);
    setMessage(message,'The 13 Moons curriculum is open in preview mode.');
  }
}
init();
