import {
  getCurrentProfile,
  FLOW_FM_MOONS,
  FLOW_FM_ARCS,
  getFlowFmInitiationStatus,
  getPersonalizedMoonPath,
  getMoonDatesForPortal,
} from '/shared/flowtel.js';
import { canAccessFlowFmCurriculum } from '/shared/rollout.js';
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
  if(!canAccessFlowFmCurriculum(profile || {})){
    moonPath.innerHTML=`<article class="flowfm-beta-lock-card"><p class="eyebrow">PHASE 1 BETA</p><h3>The 13 Moons Path is resting for now.</h3><p>During this first beta, guests are only testing the Flowtel guest journey and Profile Studio submission flow. The moon curriculum will open in a later phase.</p><div class="module-cta-row"><a class="pill-link" href="/flow-fm/profile-studio/">Open Profile Studio</a></div></article>`;
    return;
  }
  moonPath.innerHTML=path.map(portal=>{
    const active=portal.isCurrent;
    if(portal.isOuroboros && portal.isLocked){
      return `<article class="moon-card ${active ? 'active' : ''} moon-${seasonClass(portal.season)}">
        <div class="moon-number">?</div>
        <div>
          <p class="eyebrow">TIME VAULT</p>
          <h3>Mystery Moon</h3>
          <p class="assignment-line">Opens ${escapeHtml(portal.vaultOpensLabel || 'one year after your Flow FM start date')} · returns through ${escapeHtml(portal.returnMoon?.name || 'your entry moon')}</p>
          <div class="assignment-links"><span>Sealed until your anniversary</span></div>
        </div>
      </article>`;
    }
    const assignmentLine=portal.isOuroboros
      ? `Return moon: ${portal.returnMoon?.name || 'entry moon'}`
      : `${portal.wombWorkModule?.title || 'Womb Work'} · ${portal.businessAssignment?.title || 'Assignment'}`;
    const moonDates=getMoonDatesForPortal(portal);
    return `<article class="moon-card ${active ? 'active' : ''} moon-${seasonClass(portal.season)}">
      <div class="moon-number">${escapeHtml(portal.portalIndex)}</div>
      <div>
        <p class="eyebrow">${portal.isOuroboros ? '13TH WING' : `${escapeHtml(portal.month)} · ${escapeHtml(portal.wing)}`}</p>
        <h3>${escapeHtml(portal.name)}</h3>
        <div class="moon-date-pills"><span><strong>New</strong>${escapeHtml(moonDates.newMoonLabel)}</span><span><strong>Full</strong>${escapeHtml(moonDates.fullMoonLabel)}</span></div>
        <p class="assignment-line">${escapeHtml(assignmentLine)}</p>
        <div class="assignment-links"><a href="/flow-fm/portal/?portal=${portal.portalIndex}">Open initiation</a></div>
      </div>
    </article>`;
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
