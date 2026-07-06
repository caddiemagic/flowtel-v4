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
const currentModuleTitle=document.getElementById('currentModuleTitle');
const currentAssignmentTitle=document.getElementById('currentAssignmentTitle');
const currentModuleActionTitle=document.getElementById('currentModuleActionTitle');
const currentModuleCopy=document.getElementById('currentModuleCopy');
const currentModuleLink=document.getElementById('currentModuleLink');
const currentAssignmentActionTitle=document.getElementById('currentAssignmentActionTitle');
const currentAssignmentCopy=document.getElementById('currentAssignmentCopy');
const currentAssignmentLink=document.getElementById('currentAssignmentLink');
const portalDoorStrip=document.getElementById('portalDoorStrip');
const message=document.getElementById('message');
const progressBar=document.getElementById('initiationProgressBar');
const progressMarker=document.getElementById('initiationMoonMarker');

function renderPortalDoors(path=[]){
  portalDoorStrip.innerHTML=path.map(portal=>`<a class="portal-mini-door ${portal.isCurrent ? 'current' : ''}" href="/flow-fm/portal/?portal=${portal.portalIndex}"><span>${escapeHtml(portal.portalIndex)}</span><strong>${escapeHtml(portal.name)}</strong><small>${portal.isCurrent ? 'current moon' : (portal.isOuroboros ? `return: ${escapeHtml(portal.returnMoon?.name || '')}` : 'open')}</small></a>`).join('');
}
function updateProgress(status){
  const progressMonth=Number(status.progressMonth || 1);
  const percent=Math.min(100,Math.max(0,(progressMonth/13)*100));
  if(progressBar) progressBar.style.width=`${percent}%`;
  if(progressMarker) progressMarker.style.left=`${percent}%`;
}
function renderStatus(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const path=getPersonalizedMoonPath(profile || {});
  const currentPortal=path.find(item=>item.isCurrent) || path[0];
  const portalIndex=Number(currentPortal?.portalIndex || status.progressMonth || 1);
  const currentModule=getWombWorkModule(portalIndex) || currentPortal?.wombWorkModule || {};
  const currentAssignment=getFlowFmAssignmentForMoon(portalIndex) || currentPortal?.businessAssignment || {};
  const portalHref=`/flow-fm/portal/?portal=${portalIndex}`;

  currentMoonTitle.textContent=status.hasStartDate ? `${currentPortal.name}` : 'Temple Moon preview';
  currentMoonMeta.textContent=status.hasStartDate
    ? `${status.monthLine}. ${currentPortal.wing || ''} · ${currentPortal.season || ''}`
    : 'Previewing the first doorway until your Flow FM start date is set.';
  currentModuleTitle.textContent=currentModule.title || 'Womb Work Module';
  currentAssignmentTitle.textContent=currentAssignment.title || 'Business Assignment';
  currentModuleActionTitle.textContent=currentModule.title || 'Open your Womb Work.';
  currentModuleCopy.textContent=currentModule.description || 'The inner curriculum for this moon lives here.';
  currentModuleLink.href=`${portalHref}#training`;
  currentAssignmentActionTitle.textContent=currentAssignment.title || 'Open your assignment.';
  currentAssignmentCopy.textContent=currentAssignment.description || 'The outer build track for this moon lives here.';
  currentAssignmentLink.href=Number(currentAssignment.index)===1 ? '/flow-fm/profile-studio/' : `${portalHref}#assignment`;
  currentAssignmentLink.textContent=Number(currentAssignment.index)===1 ? 'Open Profile Studio' : 'Open Current Business Assignment';
  updateProgress(status);
  renderPortalDoors(path);
}
async function init(){
  topNav.innerHTML=renderTopNav('hallway');
  try{
    const profile=await getCurrentProfile();
    renderStatus(profile);
    const state=renderAccessState(profile);
    heroCopy.textContent=profile
      ? 'One clear next step. Every moon door remains open when you are ready to explore.'
      : 'Preview the Flow FM hall, then sign in to open your personalized path.';
    setMessage(message,state.mode==='readonly' ? 'Flow FM access signals are not fully recognized yet. The hall remains visible while you verify profile data.' : '');
  }catch(error){
    console.error(error);
    renderStatus(null);
    setMessage(message,'The hall is visible, but your profile could not be loaded just now.');
  }
}
init();
