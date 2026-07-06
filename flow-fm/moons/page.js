import {
  getCurrentProfile,
  FLOW_FM_MOONS,
  FLOW_FM_ARCS,
  getFlowFmInitiationStatus,
  getPersonalizedMoonPath,
} from '/shared/flowtel.js';
import { renderTopNav, escapeHtml, seasonClass, setMessage } from '/flow-fm/ui.js';

const topNav=document.getElementById('topNav');
const currentMoonTitle=document.getElementById('currentMoonTitle');
const currentMoonMeta=document.getElementById('currentMoonMeta');
const anchorTitle=document.getElementById('anchorTitle');
const anchorCopy=document.getElementById('anchorCopy');
const arcCards=document.getElementById('arcCards');
const moonPath=document.getElementById('moonPath');
const message=document.getElementById('message');

function renderArcs(){
  arcCards.innerHTML=FLOW_FM_ARCS.map(arc=>{
    const moons=arc.moons.map(index=>FLOW_FM_MOONS.find(moon=>moon.index===index)).filter(Boolean);
    return `<article class="arc-card"><p class="eyebrow">${escapeHtml(arc.range)}</p><h3>${escapeHtml(arc.label)}</h3><p>${escapeHtml(arc.copy)}</p><div class="arc-moons">${moons.map(moon=>`<span>${escapeHtml(moon.index)} · ${escapeHtml(moon.name)}</span>`).join('')}</div></article>`;
  }).join('');
}
function renderMoonPath(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const path=getPersonalizedMoonPath(profile || {});
  moonPath.innerHTML=path.map(portal=>{
    const active=portal.isCurrent;
    const assignmentLine=portal.isOuroboros
      ? `Return moon: ${portal.returnMoon?.name || 'entry moon'}`
      : `${portal.wombWorkModule?.title || 'Womb Work'} · ${portal.businessAssignment?.title || 'Assignment'}`;
    return `<article class="moon-card ${active ? 'active' : ''} moon-${seasonClass(portal.season)}"><div class="moon-number">${escapeHtml(portal.portalIndex)}</div><div><p class="eyebrow">${portal.isOuroboros ? '13TH WING' : `${escapeHtml(portal.month)} · ${escapeHtml(portal.wing)}`}</p><h3>${escapeHtml(portal.name)}</h3><p>${escapeHtml(portal.theme)}</p><p class="assignment-line">${escapeHtml(assignmentLine)}</p><div class="assignment-links"><a href="/flow-fm/portal/?portal=${portal.portalIndex}">Open moon portal</a></div></div></article>`;
  }).join('');
  const current=path.find(item=>item.isCurrent) || path[0];
  currentMoonTitle.textContent=current?.name || 'Temple Moon';
  currentMoonMeta.textContent=status.monthLine;
  anchorTitle.textContent=status.anchorMoon ? `Entered through ${status.anchorMoon.name}` : 'Joined through the moon you entered.';
  anchorCopy.textContent=status.hasStartDate
    ? `${status.anchorExplanation} This view rotates the 13 moon doors around your entry point.`
    : 'If she joins before the full moon threshold, she begins with the current named moon. If she joins after the threshold, she begins with the next named moon.';
}
async function init(){
  topNav.innerHTML=renderTopNav('moons');
  renderArcs();
  try{
    const profile=await getCurrentProfile();
    renderMoonPath(profile);
  }catch(error){
    console.error(error);
    renderMoonPath(null);
    setMessage(message,'The 13 Moons Path is open in preview mode.');
  }
}
init();
