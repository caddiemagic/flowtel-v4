import { getCurrentProfile } from '/shared/flowtel.js?v=0.10.77';
import { effectiveFlowFmRank } from '/shared/rollout.js?v=0.10.64';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js?v=0.10.77';
import { loadFlowFmAvailability, saveFlowFmAvailabilitySeason } from '/shared/flow-fm-availability.js?v=0.10.77';
import { FLOW_FM_INNER_SEASONS, FLOW_FM_WEEKDAYS } from '/shared/flow-fm-availability-core.js?v=0.10.77';

const topNav=document.getElementById('topNav');
const experience=document.getElementById('availabilityExperience');
const gate=document.getElementById('availabilityGate');
const grid=document.getElementById('availabilityGrid');
const anchorCopy=document.getElementById('availabilityAnchorCopy');
const message=document.getElementById('availabilityMessage');
let state=null;

const SEASON_INVITATIONS={
  'Inner Winter':'Keep only the call windows that support rest and lower output.',
  'Inner Spring':'Choose the windows that support new ideas and lighter connection.',
  'Inner Summer':'Choose the windows that support visibility and client connection.',
  'Inner Autumn':'Choose the windows that support completion, review, and refinement.',
};

function windowsFor(season,weekday){
  return (Array.isArray(state?.windows)?state.windows:[])
    .filter(item=>item.inner_season===season && Number(item.weekday)===Number(weekday))
    .sort((a,b)=>Number(a.window_order)-Number(b.window_order))
    .map(item=>({start:String(item.starts_at||'').slice(0,5),end:String(item.ends_at||'').slice(0,5)}));
}
function isAvailable(season,weekday,savedWindows){
  const day=(Array.isArray(state?.weekly_days)?state.weekly_days:[])
    .find(item=>item.inner_season===season && Number(item.weekday)===Number(weekday));
  return day ? Boolean(day.is_available) : savedWindows.length>0;
}
function windowRow(window={start:'09:00',end:'10:00'}){
  return `<div class="availability-window"><label><span>From</span><input type="time" name="start" value="${escapeHtml(window.start)}" /></label><label><span>To</span><input type="time" name="end" value="${escapeHtml(window.end)}" /></label><button type="button" class="remove-window" aria-label="Remove this time window">Remove</button></div>`;
}
function resetRemoveButtons(day){
  const rows=[...day.querySelectorAll('.availability-window')];
  rows.forEach(row=>{const button=row.querySelector('.remove-window');if(button)button.hidden=rows.length===1;});
}
function bindDay(day){
  const toggle=day.querySelector('[data-availability-toggle]');
  const panel=day.querySelector('.availability-times');
  const add=day.querySelector('.add-window');
  toggle.addEventListener('change',()=>{
    day.classList.toggle('is-open',toggle.checked);
    panel.hidden=!toggle.checked;
    toggle.setAttribute('aria-expanded',String(toggle.checked));
  });
  add.addEventListener('click',()=>{
    day.querySelector('.availability-windows').insertAdjacentHTML('beforeend',windowRow());
    bindRemove(day);resetRemoveButtons(day);
  });
  bindRemove(day);resetRemoveButtons(day);
}
function bindRemove(day){
  day.querySelectorAll('.remove-window:not([data-bound])').forEach(button=>{
    button.dataset.bound='true';
    button.addEventListener('click',()=>{button.closest('.availability-window')?.remove();resetRemoveButtons(day);});
  });
}
function render(){
  anchorCopy.textContent=`Times are shown in ${state?.timezone||'your saved profile timezone'}. Closing a day hides it from your current preference while preserving its saved time windows.`;
  grid.innerHTML=FLOW_FM_INNER_SEASONS.map(season=>`<section class="availability-season" data-season="${escapeHtml(season)}"><header><div><p class="eyebrow">${escapeHtml(season)}</p><h3>${escapeHtml(SEASON_INVITATIONS[season])}</h3></div><span>MONDAY–SUNDAY</span></header><div class="availability-week">${FLOW_FM_WEEKDAYS.map(day=>{
    const saved=windowsFor(season,day.weekday);
    const open=isAvailable(season,day.weekday,saved);
    return `<article class="availability-day ${open?'is-open':''}" data-weekday="${day.weekday}"><div class="availability-day-head"><strong>${escapeHtml(day.label)}</strong><label class="availability-switch"><input data-availability-toggle type="checkbox" aria-expanded="${open}" ${open?'checked':''}/><span>Available</span></label></div><div class="availability-times" ${open?'':'hidden'}><div class="availability-windows">${(saved.length?saved:[{start:'09:00',end:'10:00'}]).map(windowRow).join('')}</div><button type="button" class="add-window">Add another time window</button></div></article>`;
  }).join('')}</div><button type="button" class="save-season">Save ${escapeHtml(season)} Availability</button><p class="season-message" role="status"></p></section>`).join('');
  grid.querySelectorAll('.availability-day').forEach(bindDay);
  grid.querySelectorAll('.save-season').forEach(button=>button.addEventListener('click',saveSeason));
}
function collectSeason(section){
  return [...section.querySelectorAll('.availability-day')].map(day=>({
    weekday:Number(day.dataset.weekday),
    available:day.querySelector('[data-availability-toggle]').checked,
    windows:[...day.querySelectorAll('.availability-window')].map(row=>({
      start:row.querySelector('[name="start"]').value,
      end:row.querySelector('[name="end"]').value,
    })),
  }));
}
async function saveSeason(event){
  const section=event.currentTarget.closest('[data-season]');
  const output=section.querySelector('.season-message');
  const button=event.currentTarget;
  button.disabled=true;button.textContent='SAVING…';output.textContent='';
  try{
    state=await saveFlowFmAvailabilitySeason({innerSeason:section.dataset.season,days:collectSeason(section)});
    message.textContent='Availability saved.';
    render();
  }catch(error){
    button.disabled=false;
    button.textContent=`SAVE ${section.dataset.season.toUpperCase()} AVAILABILITY`;
    output.textContent=error?.message||'This season could not be saved.';
  }
}
async function init(){
  topNav.innerHTML=renderTopNav('availability');
  try{
    const profile=await getCurrentProfile();
    if(!profile||effectiveFlowFmRank(profile)<2){
      gate.hidden=false;
      gate.innerHTML='<p class="eyebrow">PRIVATE FLOW FM ROOM</p><h1>Availability is available inside Flow FM.</h1><a class="availability-link" href="/client/">Enter through the Flowtel</a>';
      return;
    }
    state=await loadFlowFmAvailability();
    experience.hidden=false;
    render();
  }catch(error){
    gate.hidden=false;
    gate.innerHTML=`<p class="eyebrow">AVAILABILITY</p><h1>This room could not open yet.</h1><p>${escapeHtml(error?.message||'Please return through the Flowtel and try again.')}</p>`;
  }
}
init();
