import {
  getCurrentProfile,
  getFlowFmInitiationStatus,
  getPersonalizedMoonPath,
  getWombWorkModule,
  getFlowFmAssignmentForMoon,
  getMoonDatesForPortal,
} from '/shared/flowtel.js';
import { renderTopNav, renderAccessState, escapeHtml, setMessage } from '/flow-fm/ui.js';

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
const portalDoorGrid=document.getElementById('portalDoorGrid');
const doorGrid=document.getElementById('doorGrid');
const message=document.getElementById('message');

const SUPPORT_DOORS=[
  { href:'/flow-fm/planning-room/', eyebrow:'PLANNING ROOM', title:'Print the moon calendar', copy:'Use moon phases, portals, and weekly prompts to plan business without overriding your body.' },
  { href:'/flow-fm/profile-studio/', eyebrow:'PROFILE STUDIO', title:'Open Your Queendom', copy:'Choose the first title, bio, and offerings your clients will meet.' },
];

function renderSupportDoors(){
  doorGrid.innerHTML=SUPPORT_DOORS.map(item=>`<a class="door-card" href="${item.href}"><p class="eyebrow">${escapeHtml(item.eyebrow)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.copy)}</p><span class="door-link">Open room</span></a>`).join('');
}
function renderPortalDoors(path){
  portalDoorGrid.innerHTML=path.map(portal=>{
    const moonDates=getMoonDatesForPortal(portal);
    return `<a class="portal-door ${portal.isCurrent ? 'current' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}"><span class="portal-number">${escapeHtml(portal.portalIndex)}</span><div><p class="eyebrow">${portal.isCurrent ? 'CURRENT MOON' : (portal.isOuroboros ? 'RETURN MOON' : 'OPEN TO EXPLORE')}</p><h3>${escapeHtml(portal.name)}</h3><div class="moon-date-line"><span>New Moon: ${escapeHtml(moonDates.newMoonLabel)}</span><span>Full Moon: ${escapeHtml(moonDates.fullMoonLabel)}</span></div><p>${portal.isOuroboros ? `Returning through ${escapeHtml(portal.returnMoon?.name || 'entry moon')}` : `${escapeHtml(portal.wombWorkModule?.title || 'Womb Work')} · ${escapeHtml(portal.businessAssignment?.title || 'Assignment')}`}</p></div></a>`;
  }).join('');
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
  currentPortalLink.href=`/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}`;
  nextDoorTitle.textContent=`Open ${currentPortal.name} Portal`;
  nextDoorCopy.textContent='Your moon portal gathers the training, womb work practice, business assignment, and next doorway in one place.';
  currentModuleTitle.textContent=currentModule?.title || 'Womb Work Module';
  currentModuleCopy.innerHTML=`${escapeHtml(currentModule?.description || 'Your inner curriculum lives inside the current moon portal.')}<div class="module-cta-row"><a class="pill-link muted" href="/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}#womb-work">Open Current Womb Work</a></div>`;
  currentAssignmentTitle.textContent=currentAssignment?.title || 'Business Assignment';
  currentAssignmentCopy.innerHTML=`${escapeHtml(currentAssignment?.description || 'Your outer build task lives inside the current moon portal.')}<div class="module-cta-row"><a class="pill-link muted" href="${Number(currentAssignment?.index || 0)===1 ? '/flow-fm/profile-studio/' : `/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}#business-assignment`}">Open Current Business Assignment</a></div>`;
  renderPortalDoors(path);
}
async function init(){
  topNav.innerHTML=renderTopNav('hallway');
  renderSupportDoors();
  try{
    const profile=await getCurrentProfile();
    renderStatus(profile);
    const state=renderAccessState(profile);
    heroCopy.textContent=profile
      ? 'Welcome back. Follow your current moon portal, or explore any open room when your body says yes.'
      : 'Preview the Flow FM hallway, then sign in to open your personalized moon portal.';
    setMessage(message,state.mode==='readonly' ? 'Flow FM access signals are not fully recognized yet. The hallway remains visible while you verify profile data.' : '');
  }catch(error){
    console.error(error);
    renderStatus(null);
    setMessage(message,'The hallway is visible, but your profile could not be loaded just now.');
  }
}
init();
