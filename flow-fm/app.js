import {
  getCurrentProfile,
  getFlowFmInitiationStatus,
  getPersonalizedMoonPath,
  getWombWorkModule,
  getFlowFmAssignmentForMoon,
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
  { href:'/flow-fm/moons/', eyebrow:'13 MOONS PATH', title:'See the full spiral', copy:'A mythic map of your wings, seasons, and moon initiation order.' },
  { href:'/flow-fm/womb-work/', eyebrow:'WOMB WORK LIBRARY', title:'Browse the inner curriculum', copy:'All 13 inner modules live here as a library and future Squarespace lesson archive.' },
  { href:'/flow-fm/assignments/', eyebrow:'ASSIGNMENT TRACKER', title:'View the build track', copy:'Track drafts, submissions, witness notes, and completion states across all 13 assignments.' },
  { href:'/flow-fm/profile-studio/', eyebrow:'PROFILE STUDIO', title:'Build your public doorway', copy:'Assignment 1 has its own studio for the Priestess Profile intake and preview.' },
  { href:'/flow-fm/planning-room/', eyebrow:'PLANNING ROOM', title:'Print the moon calendar', copy:'Use moon phases, portals, and weekly prompts to plan business without overriding your body.' },
  { href:'/flow-fm/review/', eyebrow:'REVIEW DESK', title:'Witness submitted work', copy:'Mentors and admins tend submissions in a separate room so the student hallway stays calm.' },
];

function renderSupportDoors(){
  doorGrid.innerHTML=SUPPORT_DOORS.map(item=>`<a class="door-card" href="${item.href}"><p class="eyebrow">${escapeHtml(item.eyebrow)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.copy)}</p><span class="door-link">Open room</span></a>`).join('');
}
function renderPortalDoors(path){
  portalDoorGrid.innerHTML=path.map(portal=>`<a class="portal-door ${portal.isCurrent ? 'current' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}"><span class="portal-number">${escapeHtml(portal.portalIndex)}</span><div><p class="eyebrow">${portal.isCurrent ? 'CURRENT MOON' : (portal.isOuroboros ? 'RETURN MOON' : 'OPEN TO EXPLORE')}</p><h3>${escapeHtml(portal.name)}</h3><p>${portal.isOuroboros ? `Returning through ${escapeHtml(portal.returnMoon?.name || 'entry moon')}` : `${escapeHtml(portal.wombWorkModule?.title || 'Womb Work')} · ${escapeHtml(portal.businessAssignment?.title || 'Assignment')}`}</p></div></a>`).join('');
}
function renderStatus(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const path=getPersonalizedMoonPath(profile || {});
  const currentPortal=path.find(item=>item.isCurrent) || path[0];
  const currentModule=getWombWorkModule(status.progressMonth || 1) || currentPortal.wombWorkModule;
  const currentAssignment=getFlowFmAssignmentForMoon(status.progressMonth || 1) || currentPortal.businessAssignment;
  currentMoonTitle.textContent=status.hasStartDate ? `${currentPortal.name} · Month ${currentPortal.portalIndex} of 13` : 'Temple Moon preview';
  currentMoonMeta.textContent=status.hasStartDate
    ? `${status.monthLine}. ${status.anchorExplanation}`
    : 'Previewing Temple Moon until Flow FM start date is set.';
  currentPortalLink.href=`/flow-fm/portal/?portal=${currentPortal.portalIndex || 1}`;
  nextDoorTitle.textContent=`Open ${currentPortal.name} Portal`;
  nextDoorCopy.textContent='Your moon portal gathers the training, womb work practice, business assignment, and next doorway in one place.';
  currentModuleTitle.textContent=currentModule?.title || 'Womb Work Module';
  currentModuleCopy.textContent=currentModule?.description || 'Your inner curriculum lives inside the current moon portal.';
  currentAssignmentTitle.textContent=currentAssignment?.title || 'Business Assignment';
  currentAssignmentCopy.textContent=currentAssignment?.description || 'Your outer build task lives inside the current moon portal.';
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
