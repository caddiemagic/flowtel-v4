import { getCurrentProfile } from '/shared/flowtel.js';
import { effectiveFlowFmRank } from '/shared/rollout.js?v=0.10.64';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js?v=0.10.67';
import { loadFlowFmAvailability, saveFlowFmAvailabilityDay } from '/shared/flow-fm-availability.js?v=0.10.67';

const topNav=document.getElementById('topNav');
const experience=document.getElementById('availabilityExperience');
const gate=document.getElementById('availabilityGate');
const grid=document.getElementById('availabilityGrid');
const anchorCopy=document.getElementById('availabilityAnchorCopy');
const message=document.getElementById('availabilityMessage');
let state=null;
const SEASON_ORDER=['Inner Winter','Inner Spring','Inner Summer','Inner Autumn'];
const SEASON_INVITATIONS={
  'Inner Winter':'Rest, retreat, receive, and keep spacious.',
  'Inner Spring':'Explore, play, learn, and begin.',
  'Inner Summer':'Be seen, serve, gather, and receive.',
  'Inner Autumn':'Refine, complete, simplify, and prepare.',
};
function formatDate(value){const [y,m,d]=String(value||'').slice(0,10).split('-').map(Number);return y?new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d))):'—';}
function render(){
  const days=Array.isArray(state?.days)?state.days:[];
  anchorCopy.textContent=state?.anchor_source==='planning_reference'
    ? `This first map begins on ${formatDate(state?.anchor_date)} as a gentle planning reference. It will realign when Flowtel has cycle data to anchor it.`
    : `This map begins on ${formatDate(state?.anchor_date)} using your remembered Flowtel cycle path.`;
  grid.innerHTML=SEASON_ORDER.map(season=>{
    const rows=days.filter(day=>day.availability_season===season).slice(0,7);
    return `<section class="availability-season"><header><div><p class="eyebrow">${escapeHtml(season)}</p><h3>${escapeHtml(SEASON_INVITATIONS[season])}</h3></div><span>${rows.length} DAYS</span></header><div class="availability-week">${rows.map(day=>`<article class="availability-day ${day.is_available?'is-open':''}" data-cycle-day="${day.cycle_day}">
      <div class="availability-day-head"><strong>Day ${day.cycle_day}</strong><small>${escapeHtml(day.weekday_planet)}</small></div>
      <small>${escapeHtml(formatDate(day.calendar_date))}<br>${escapeHtml(day.moon_phase)} · Moon Day ${escapeHtml(day.moon_day)}</small>
      <label><input type="checkbox" ${day.is_available?'checked':''}/> Open to clients</label>
      <textarea maxlength="500" placeholder="Optional note">${escapeHtml(day.availability_note||'')}</textarea>
      <button type="button">Save Day</button><p role="status"></p>
    </article>`).join('')}</div></section>`;
  }).join('');
  grid.querySelectorAll('[data-cycle-day] button').forEach(button=>button.addEventListener('click',saveDay));
}
async function saveDay(event){
  const card=event.currentTarget.closest('[data-cycle-day]');const output=card.querySelector('p');const button=event.currentTarget;button.disabled=true;button.textContent='SAVING…';output.textContent='';
  try{state=await saveFlowFmAvailabilityDay({cycleDay:card.dataset.cycleDay,isAvailable:card.querySelector('input').checked,note:card.querySelector('textarea').value});render();const restored=grid.querySelector(`[data-cycle-day="${card.dataset.cycleDay}"] p`);if(restored)restored.textContent='Saved.';}
  catch(error){button.disabled=false;button.textContent='SAVE DAY';output.textContent=error?.message||'This day could not be saved.';}
}
async function init(){
  topNav.innerHTML=renderTopNav('availability');
  try{const profile=await getCurrentProfile();if(!profile||effectiveFlowFmRank(profile)<2){gate.hidden=false;gate.innerHTML='<p class="eyebrow">PRIVATE FLOW FM ROOM</p><h1>Your availability room is waiting inside Flow FM.</h1><a class="availability-link" href="/client/">Enter through the Flowtel</a>';return;}state=await loadFlowFmAvailability();experience.hidden=false;render();}
  catch(error){gate.hidden=false;gate.innerHTML=`<p class="eyebrow">AVAILABILITY ROOM</p><h1>This room could not open yet.</h1><p>${escapeHtml(error?.message||'Please return through the Flowtel and try again.')}</p>`;}
}
init();
