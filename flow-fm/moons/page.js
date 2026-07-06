import {
  getCurrentProfile,
  FLOW_FM_MOONS,
  FLOW_FM_ARCS,
  getFlowFmInitiationStatus,
  getPersonalizedMoonPath,
  getMoonDatesForPortal,
} from '/shared/flowtel.js';
import { renderTopNav, escapeHtml, seasonClass, setMessage } from '/flow-fm/ui.js';

const topNav=document.getElementById('topNav');
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
    const moonDates=getMoonDatesForPortal(portal);
    return `<article class="moon-card ${active ? 'active' : ''} moon-${seasonClass(portal.season)}"><div class="moon-number">${escapeHtml(portal.portalIndex)}</div><div><p class="eyebrow">${portal.isOuroboros ? '13TH WING' : `${escapeHtml(portal.month)} · ${escapeHtml(portal.wing)}`}</p><h3>${escapeHtml(portal.name)}</h3><div class="moon-date-line"><span>New Moon: ${escapeHtml(moonDates.newMoonLabel)}</span><span>Full Moon: ${escapeHtml(moonDates.fullMoonLabel)}</span></div><p class="assignment-line">${escapeHtml(assignmentLine)}</p><div class="assignment-links"><a href="/flow-fm/portal/?portal=${portal.portalIndex}">Open initiation</a></div></div></article>`;
  }).join('');
}

async function init(){
  topNav.innerHTML=renderTopNav('moons');
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
