import { listTimeAndSpaceTeam, timeAndSpacePresentation } from '/shared/time-and-space.js?v=0.10.72';

const grid = document.getElementById('timeSpaceGrid');
const empty = document.getElementById('timeSpaceEmpty');
const gate = document.getElementById('timeSpaceGate');
const gateMessage = document.getElementById('gateMessage');
const message = document.getElementById('timeSpaceMessage');
const summary = document.getElementById('teamSummary');
const flowtelClock = document.getElementById('flowtelClock');
const flowtelDate = document.getElementById('flowtelDate');

let team = [];
let clockTimer = null;

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function safePhoto(value){
  const source = String(value || '').trim();
  if(!source) return '/assets/flowtel-pinkrose.png';
  try{
    const url = new URL(source, window.location.origin);
    if(url.protocol === 'https:' || url.origin === window.location.origin) return url.href;
  }catch(_error){ /* use fallback */ }
  return '/assets/flowtel-pinkrose.png';
}

function cardMarkup(member, now){
  const view = timeAndSpacePresentation(member, now);
  return `<article class="time-space-card" data-member-id="${escapeHtml(member.member_id)}">
    <div class="time-space-photo">
      <img src="${escapeHtml(safePhoto(member.profile_photo_url))}" alt="${escapeHtml(view.display_name || 'Priestess')}" loading="lazy" onerror="this.src='/assets/flowtel-pinkrose.png';" />
    </div>
    <div class="time-space-card-copy">
      <p class="eyebrow">${escapeHtml(view.priestess_title || 'FLOW FM PRIESTESS')}</p>
      <h2>${escapeHtml(view.display_name || 'Flow FM Priestess')}</h2>
      <p class="time-space-location">${escapeHtml(view.location || 'Location being tended')}</p>
      <dl>
        <div><dt>Local time</dt><dd>${escapeHtml(view.localTime)}</dd></div>
        <div><dt>Local date</dt><dd>${escapeHtml(view.localDate)}</dd></div>
        <div><dt>Time zone</dt><dd>${escapeHtml(view.timezone || 'Not selected')}</dd></div>
        <div><dt>Hemisphere</dt><dd>${escapeHtml(view.hemisphereLabel)}</dd></div>
      </dl>
      <span class="outer-season">${escapeHtml(view.outerSeason)}</span>
    </div>
  </article>`;
}

function render(now = new Date()){
  if(!grid) return;
  grid.innerHTML = team.map((member) => cardMarkup(member, now)).join('');
  empty.hidden = team.length > 0;
  summary.textContent = team.length
    ? `${team.length} ${team.length === 1 ? 'Priestess is' : 'Priestesses are'} tending the global field.`
    : 'The approved team field is waiting to be revealed.';
}

function renderFlowtelClock(now = new Date()){
  const timezone = 'America/Los_Angeles';
  flowtelClock.textContent = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(now);
  flowtelDate.textContent = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(now);
}

function startClocks(){
  const tick = () => {
    const now = new Date();
    renderFlowtelClock(now);
    render(now);
  };
  tick();
  if(clockTimer) window.clearInterval(clockTimer);
  clockTimer = window.setInterval(tick, 60_000);
}

async function init(){
  try{
    team = await listTimeAndSpaceTeam();
    gate.hidden = true;
    grid.hidden = false;
    render();
    startClocks();
  }catch(error){
    console.error(error);
    grid.hidden = true;
    empty.hidden = true;
    gate.hidden = false;
    gateMessage.textContent = error?.message || 'The Time + Space room could not verify your Concierge Team access.';
    message.textContent = '';
    renderFlowtelClock();
  }
}

init();
