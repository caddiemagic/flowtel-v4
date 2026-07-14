import {
  getCurrentProfile,
  getFlowFmInitiationStatus,
  getPersonalizedMoonPath,
  getWombWorkModule,
  getFlowFmAssignmentForMoon,
  getMoonDatesForPortal,
} from '/shared/flowtel.js';
import { FLOWTEL_ROLLOUT, canAccessFlowFmCurriculum } from '/shared/rollout.js';
import { renderTopNav, renderAccessState, escapeHtml, setMessage } from '/flow-fm/ui.js';
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';

const topNav=document.getElementById('topNav');
const heroCopy=document.getElementById('heroCopy');
const currentMoonTitle=document.getElementById('currentMoonTitle');
const currentMoonMeta=document.getElementById('currentMoonMeta');
const nextDoorTitle=document.getElementById('nextDoorTitle');
const nextDoorCopy=document.getElementById('nextDoorCopy');
const currentPortalLink=document.getElementById('currentPortalLink');
const currentModuleTitle=document.getElementById('currentModuleTitle');
const currentModuleCopy=document.getElementById('currentModuleCopy');
const currentAssignmentTitle=document.getElementById('currentAssignmentTitle');
const currentAssignmentCopy=document.getElementById('currentAssignmentCopy');
const portalDoorRowOne=document.getElementById('portalDoorRowOne');
const portalDoorRowTwo=document.getElementById('portalDoorRowTwo');
const portalDoorVaultRow=document.getElementById('portalDoorVaultRow');
const doorGrid=document.getElementById('doorGrid');
const message=document.getElementById('message');

const SUPPORT_DOORS=[
  { href:'/flow-fm/planning-room/', eyebrow:'PLANNING ROOM', title:'Print the moon calendar', copy:'Use moon phases, portals, and weekly prompts to plan business without overriding your body.', motif:'planning' },
  { href:'/flow-fm/profile-studio/', eyebrow:'PROFILE STUDIO', title:'Open Your Queendom', copy:'Choose the first title, bio, and offerings your clients will meet.', motif:'royal' },
];
const PORTAL_DOOR_THEMES=['winged','cartouche','sunburst','lotus'];

function renderSupportDoors(){
  doorGrid.innerHTML=SUPPORT_DOORS.map(item=>`<a class="door-card door-card--royal door-card--${item.motif || 'royal'}" href="${item.href}">
    <span class="support-door-crest" aria-hidden="true"></span>
    <p class="eyebrow">${escapeHtml(item.eyebrow)}</p>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.copy)}</p>
    <span class="door-link">Open room</span>
  </a>`).join('');
}
function renderPortalDoor(portal){
  const theme=PORTAL_DOOR_THEMES[(Number(portal.portalIndex || 1)-1) % PORTAL_DOOR_THEMES.length];
  const state=portal.isCurrent ? 'CURRENT PORTAL' : 'OPEN DOOR';
  return `<a class="portal-door temple-door temple-door--${theme} ${portal.isCurrent ? 'current' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}">
    <span class="temple-door-crown" aria-hidden="true">
      <span class="wing left"></span>
      <span class="sun-disk"></span>
      <span class="scarab-body"></span>
      <span class="wing right"></span>
    </span>
    <span class="door-arch" aria-hidden="true"></span>
    <span class="portal-number">${escapeHtml(portal.portalIndex)}</span>
    <div class="temple-door-copy">
      <p class="eyebrow">${escapeHtml(state)}</p>
      <h3>${escapeHtml(portal.name)}</h3>
      <p>${escapeHtml(portal.month || '')}</p>
    </div>
    <span class="door-open-label">Enter</span>
  </a>`;
}
function renderVaultDoor(portal){
  if(!portal) return '';
  if(portal.isLocked){
    return `<article class="portal-door temple-door temple-door--vault is-locked" aria-disabled="true">
      <span class="temple-door-crown" aria-hidden="true">
        <span class="wing left"></span>
        <span class="sun-disk"></span>
        <span class="scarab-body"></span>
        <span class="wing right"></span>
      </span>
      <span class="door-arch" aria-hidden="true"></span>
      <span class="portal-number">?</span>
      <div class="temple-door-copy">
        <p class="eyebrow">MYSTERY MOON</p>
        <h3>Time Vault</h3>
        <p>${escapeHtml(portal.vaultOpensLabel ? `Opens ${portal.vaultOpensLabel}` : 'Opens one year after you join')}</p>
      </div>
      <span class="door-open-label">Sealed</span>
    </article>`;
  }
  return `<a class="portal-door temple-door temple-door--vault ${portal.isCurrent ? 'current' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}">
    <span class="temple-door-crown" aria-hidden="true">
      <span class="wing left"></span>
      <span class="sun-disk"></span>
      <span class="scarab-body"></span>
      <span class="wing right"></span>
    </span>
    <span class="door-arch" aria-hidden="true"></span>
    <span class="portal-number">13</span>
    <div class="temple-door-copy">
      <p class="eyebrow">OUROBOROS MOON</p>
      <h3>${escapeHtml(portal.name)}</h3>
      <p>${escapeHtml(portal.returnMoon?.name ? `Returns through ${portal.returnMoon.name}` : 'The next spiral')}</p>
    </div>
    <span class="door-open-label">Open Vault</span>
  </a>`;
}
function renderLockedCurriculumNotice(){
  const card=`<article class="flowfm-beta-lock-card"><p class="eyebrow">PHASE 1 BETA</p><h3>The full temple curriculum is still sealed.</h3><p>For this first round of testing, guests are moving through the Flowtel guest experience and the Profile Studio only. The wider 13 Moon curriculum will open in a later rollout once this path feels solid.</p><div class="module-cta-row"><a class="pill-link" href="/flow-fm/profile-studio/">Open Profile Studio</a></div></article>`;
  portalDoorRowOne.innerHTML=card;
  portalDoorRowTwo.innerHTML='';
  portalDoorVaultRow.innerHTML='';
}
function renderPortalDoors(path, profile){
  if(!portalDoorRowOne || !portalDoorRowTwo || !portalDoorVaultRow) return;
  if(!canAccessFlowFmCurriculum(profile || {})){
    renderLockedCurriculumNotice();
    return;
  }
  const regularDoors=(path || []).filter(portal=>!portal.isOuroboros);
  const vault=(path || []).find(portal=>portal.isOuroboros) || null;
  portalDoorRowOne.innerHTML=regularDoors.slice(0,6).map(renderPortalDoor).join('');
  portalDoorRowTwo.innerHTML=regularDoors.slice(6,12).map(renderPortalDoor).join('');
  portalDoorVaultRow.innerHTML=renderVaultDoor(vault);
}
function renderStatus(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const path=getPersonalizedMoonPath(profile || {});
  const currentPortal=path.find(item=>item.isCurrent) || path[0];
  const currentModule=getWombWorkModule(status.progressMonth || 1) || currentPortal.wombWorkModule;
  const currentAssignment=getFlowFmAssignmentForMoon(status.progressMonth || 1) || currentPortal.businessAssignment;
  currentMoonTitle.textContent=status.hasStartDate ? currentPortal.name : 'Temple Moon preview';
  currentMoonMeta.innerHTML=status.hasStartDate
    ? `${escapeHtml(status.monthLine)}<div class="progress-pulse"><span style="width:${Math.min(100, Math.max(5, (Number(currentPortal.portalIndex || 1)/13)*100))}%"></span></div>`
    : 'Previewing Temple Moon until Flow FM start date is set.';
  const curriculumOpen=canAccessFlowFmCurriculum(profile || {});
  currentPortalLink.href=curriculumOpen ? `/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}` : '/flow-fm/profile-studio/';
  nextDoorTitle.textContent=curriculumOpen ? `Open ${currentPortal.name} Portal` : 'Open Your Profile Studio';
  nextDoorCopy.textContent=curriculumOpen
    ? 'Your moon portal gathers the training, womb work practice, business assignment, and next doorway in one place.'
    : 'Phase 1 beta is focused on the guest journey and your profile submission flow. The rest of the curriculum is staying sealed for now.';
  currentModuleTitle.textContent=curriculumOpen ? (currentModule?.title || 'Womb Work Module') : 'Phase 1 testing focus';
  currentModuleCopy.innerHTML=curriculumOpen
    ? `${escapeHtml(currentModule?.description || 'Your inner curriculum lives inside the current moon portal.')}<div class="module-cta-row"><a class="pill-link muted" href="/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}#womb-work">Open Current Womb Work</a></div>`
    : `Guest arrival, check-in rhythm, mentor selection, and Profile Studio submission are the only open testing paths in this phase.<div class="module-cta-row"><a class="pill-link muted" href="/client/">Return to Guest Flow</a></div>`;
  currentAssignmentTitle.textContent=curriculumOpen ? (currentAssignment?.title || 'Business Assignment') : 'Profile submission';
  currentAssignmentCopy.innerHTML=curriculumOpen
    ? `${escapeHtml(currentAssignment?.description || 'Your outer build task lives inside the current moon portal.')}<div class="module-cta-row"><a class="pill-link muted" href="${Number(currentAssignment?.index || 0)===1 ? '/flow-fm/profile-studio/' : `/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}#business-assignment`}">Open Current Business Assignment</a></div>`
    : `Use the Profile Studio to choose your title, bio, offerings, and send your Priestess Profile to be witnessed.<div class="module-cta-row"><a class="pill-link muted" href="/flow-fm/profile-studio/">Open Profile Studio</a></div>`;
  renderPortalDoors(path, profile);
}
async function init(){
  topNav.innerHTML=renderTopNav('hallway');
  renderSupportDoors();
  try{
    const profile=await getCurrentProfile();
    if(!isPractitionerLevel(profile)){
      replacePageWithPhaseTwoGate({
        featureName:'Initiation Hall',
        title:'Opening in Phase 2',
        copy:'The Initiation Hall will open in Phase 2 of beta testing for practitioner-level users. Phase 1 is focused on the guest Flowtel path.',
      });
      return;
    }
    renderStatus(profile);
    const state=renderAccessState(profile);
    heroCopy.textContent=profile
      ? (canAccessFlowFmCurriculum(profile)
          ? 'Welcome back. Your temple doors are open. Enter your current portal first, then move through the hallway as your body says yes.'
          : 'Welcome back. Phase 1 beta is focused on your guest journey and Profile Studio. The wider curriculum remains sealed while we localize testing.')
      : 'Preview the Flow FM hallway, then sign in to open your personalized moon portal.';
    setMessage(message,state.mode==='readonly' ? 'Flow FM access signals are not fully recognized yet. The hallway remains visible while you verify profile data.' : '');
  }catch(error){
    console.error(error);
    renderStatus(null);
    setMessage(message,'The hallway is visible, but your profile could not be loaded just now.');
  }
}
init();
