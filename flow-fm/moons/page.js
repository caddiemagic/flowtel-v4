import {
  getCurrentProfile,
  FLOW_FM_MOONS,
  FLOW_FM_ARCS,
  getFlowFmInitiationStatus,
  getFlowFmAssignmentForMoon,
} from '../../shared/flowtel.js';
import { renderTopNav, escapeHtml, seasonClass, setMessage } from '../ui.js';

const topNav = document.getElementById('topNav');
const currentMoonTitle = document.getElementById('currentMoonTitle');
const currentMoonMeta = document.getElementById('currentMoonMeta');
const anchorTitle = document.getElementById('anchorTitle');
const anchorCopy = document.getElementById('anchorCopy');
const arcCards = document.getElementById('arcCards');
const moonPath = document.getElementById('moonPath');
const message = document.getElementById('message');

function renderArcs(){
  arcCards.innerHTML = FLOW_FM_ARCS.map(arc => {
    const moons = arc.moons.map(index => FLOW_FM_MOONS.find(moon => moon.index === index)).filter(Boolean);
    return `<article class="arc-card"><p class="eyebrow">${escapeHtml(arc.range)}</p><h3>${escapeHtml(arc.label)}</h3><p>${escapeHtml(arc.copy)}</p><div class="arc-moons">${moons.map(moon => `<span>${escapeHtml(moon.index)} · ${escapeHtml(moon.name)}</span>`).join('')}</div></article>`;
  }).join('');
}
function renderMoonPath(profile){
  const status = getFlowFmInitiationStatus(profile || {});
  const activeIndex = status.moon?.index || 1;
  moonPath.innerHTML = FLOW_FM_MOONS.map(moon => {
    const assignment = getFlowFmAssignmentForMoon(moon.index);
    const active = moon.index === activeIndex;
    const returnLine = moon.index === 13 && status.anchorMoon ? `Return moon: ${status.anchorMoon.name}` : `Assignment: ${assignment?.title || 'Integration'}`;
    return `<article class="moon-card ${active ? 'active' : ''} moon-${seasonClass(moon.season)}"><div class="moon-number">${escapeHtml(moon.index)}</div><div><p class="eyebrow">${escapeHtml(moon.month)} · ${escapeHtml(moon.wing)}</p><h3>${escapeHtml(moon.name)}</h3><p>${escapeHtml(moon.theme)}</p><p class="assignment-line">${escapeHtml(returnLine)}</p></div></article>`;
  }).join('');
  currentMoonTitle.textContent = status.moon?.name || 'Temple Moon';
  currentMoonMeta.textContent = status.monthLine;
  anchorTitle.textContent = status.anchorMoon ? `Entered through ${status.anchorMoon.name}` : 'Joined through the moon you entered.';
  anchorCopy.textContent = status.hasStartDate
    ? `${status.anchorExplanation} Current month: ${status.progressMonth} of 13.`
    : 'If she joins before the full moon threshold, she begins with the current named moon. If she joins after the threshold, she begins with the next named moon.';
}
async function init(){
  topNav.innerHTML = renderTopNav('moons');
  renderArcs();
  try{
    const profile = await getCurrentProfile();
    renderMoonPath(profile);
  }catch(error){
    console.error(error);
    renderMoonPath(null);
    setMessage(message, 'The 13 Moons Path is open in preview mode.');
  }
}
init();
