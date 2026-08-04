import { loadFlowFmAvailabilityOwnerView } from '/shared/flow-fm-availability-admin.js?v=0.10.81.2';
import {
  FLOW_FM_INNER_SEASONS,
  FLOW_FM_WEEKDAYS,
  summarizeFlowFmAvailabilityDays,
} from '/shared/flow-fm-availability-core.js?v=0.10.81.2';
import { timezoneDisplayName, timezoneShortName } from '/shared/timezone-labels.js?v=0.10.81.2';

const summary=document.getElementById('availabilitySummary');
const toolbar=document.getElementById('availabilityToolbar');
const search=document.getElementById('availabilitySearch');
const filter=document.getElementById('availabilityFilter');
const message=document.getElementById('availabilityMessage');
const grid=document.getElementById('availabilityMemberGrid');
const gate=document.getElementById('availabilityGate');
let rows=[];

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const title=value=>String(value||'').replace(/^Inner\s+/,'');

function localParts(timezone,date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:timezone||'America/Los_Angeles',
      weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false,
    }).formatToParts(date);
    const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    const weekdayMap={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};
    return {weekday:weekdayMap[map.weekday]||0,time:`${map.hour==='24'?'00':map.hour}:${map.minute}`};
  }catch{return {weekday:0,time:''};}
}
function dayStateFor(row,season,weekday){
  return (row.day_states||[]).find(item=>item.inner_season===season&&Number(item.weekday)===Number(weekday))||null;
}
function isAvailableNow(row){
  const season=String(row.current_inner_season||'');
  if(!season)return false;
  const {weekday,time}=localParts(row.timezone);
  const state=dayStateFor(row,season,weekday);
  if(state&&state.is_available!==true)return false;
  return (row.windows||[]).some(window=>window.inner_season===season&&Number(window.weekday)===weekday&&String(window.starts_at)<=time&&String(window.ends_at)>time);
}
function isRecent(value){
  const stamp=new Date(value||0).getTime();
  return Number.isFinite(stamp)&&stamp>Date.now()-7*86400000;
}
function formatUpdated(value){
  if(!value)return 'No rhythm saved yet';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'Update date unavailable';
  return `Updated ${new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date)}`;
}
function membershipLabel(value){return String(value||'').toLowerCase()==='council'?'Council':'Flow FM';}
function seasonStatusFor(row,season){
  return (row.season_status||[]).find(item=>item.inner_season===season)||null;
}
function daysForSeason(row,season){
  const windows=(row.windows||[]).filter(item=>item.inner_season===season);
  return FLOW_FM_WEEKDAYS.map(day=>{
    const state=dayStateFor(row,season,day.weekday);
    const dayWindows=windows.filter(window=>Number(window.weekday)===day.weekday);
    return {
      weekday:day.weekday,
      available:state?state.is_available===true:dayWindows.length>0,
      windows:dayWindows.map(window=>({start:window.starts_at,end:window.ends_at})),
    };
  });
}
function seasonMarkup(row,season){
  const status=seasonStatusFor(row,season);
  const days=daysForSeason(row,season);
  const hasWindows=days.some(day=>day.available);
  let rhythm;
  let stateClass='';
  if(hasWindows){rhythm=summarizeFlowFmAvailabilityDays(days);}
  else if(status&&status.accepting_calls===false){rhythm={status:'Resting this season',detail:'No client calls'};stateClass='is-resting';}
  else{rhythm={status:'Not recorded',detail:'Return to Availability to save this season'};stateClass='is-incomplete';}
  return `<article class="availability-season ${stateClass}"><small>${escapeHtml(title(season))}</small><strong>${escapeHtml(rhythm.status)}</strong><span>${escapeHtml(rhythm.detail)}</span></article>`;
}
function memberCard(row){
  const photo=row.profile_photo_url||'/assets/flowtel-pinkrose.png';
  const zoneName=timezoneDisplayName(row.timezone,new Date());
  const short=timezoneShortName(row.timezone,new Date());
  const nowOpen=isAvailableNow(row);
  const complete=Number(row.completed_season_count||0);
  const current=row.current_inner_season?`${title(row.current_inner_season)}${row.current_cycle_day?` · Day ${row.current_cycle_day}`:''}`:'No recent check-in';
  return `<article class="availability-member-card">
    <header>
      <img src="${escapeHtml(photo)}" alt="" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'">
      <div><p class="eyebrow">${escapeHtml(membershipLabel(row.membership_type))}</p><h2>${escapeHtml(row.display_name||'Flow FM Member')}</h2><p>${escapeHtml(row.location||'Location not entered')}</p></div>
      <span class="availability-now ${nowOpen?'is-open':''}">${nowOpen?'Available Now':'Not in a saved window'}</span>
    </header>
    <div class="availability-member-meta">
      <span>${escapeHtml(zoneName||row.timezone||'Timezone not entered')}${short&&!String(zoneName||'').includes(`(${short})`)?` (${escapeHtml(short)})`:''}</span>
      <span>Current rhythm: ${escapeHtml(current)}</span>
      <span>${complete}/4 seasons saved</span>
      <span>${row.mentor_accepting_clients?'Accepting Clients':'Not Accepting Clients'}</span>
      <span>${row.concierge_access_enabled?'Concierge Team Access':'No Concierge Team Access'}</span>
      <span>${escapeHtml(formatUpdated(row.availability_updated_at))}</span>
    </div>
    <div class="availability-season-grid">${FLOW_FM_INNER_SEASONS.map(season=>seasonMarkup(row,season)).join('')}</div>
  </article>`;
}
function filteredRows(){
  const needle=String(search.value||'').trim().toLowerCase();
  const mode=filter.value;
  return rows.filter(row=>{
    if(needle&&!`${row.display_name||''} ${row.location||''} ${row.email||''}`.toLowerCase().includes(needle))return false;
    if(mode==='available_now'&&!isAvailableNow(row))return false;
    if(mode==='accepting_clients'&&row.mentor_accepting_clients!==true)return false;
    if(mode==='incomplete'&&Number(row.completed_season_count||0)>=4)return false;
    if(mode==='recently_updated'&&!isRecent(row.availability_updated_at))return false;
    return true;
  });
}
function render(){
  const visible=filteredRows();
  grid.innerHTML=visible.length?visible.map(memberCard).join(''):'<p class="availability-empty">No Priestesses match this view.</p>';
}
function renderSummary(){
  const started=rows.filter(row=>Number(row.completed_season_count||0)>0).length;
  const open=rows.filter(isAvailableNow).length;
  const recent=rows.filter(row=>isRecent(row.availability_updated_at)).length;
  summary.hidden=false;
  summary.innerHTML=`<article><small>FLOW FM + COUNCIL</small><strong>${rows.length}</strong><span>members</span></article><article><small>RHYTHMS STARTED</small><strong>${started}</strong><span>members</span></article><article><small>AVAILABLE NOW</small><strong>${open}</strong><span>in their current season</span></article><article><small>UPDATED THIS WEEK</small><strong>${recent}</strong><span>members</span></article>`;
}
async function init(){
  try{
    rows=await loadFlowFmAvailabilityOwnerView();
    message.textContent='';
    toolbar.hidden=false;
    renderSummary();
    render();
  }catch(error){
    message.textContent='';
    gate.hidden=false;
    gate.innerHTML=`<p class="eyebrow">OWNER ADMINISTRATION</p><h2>Availability could not be opened.</h2><p>${escapeHtml(error?.message||'Run migration 065, then return to this room.')}</p>`;
  }
}
search.addEventListener('input',render);
filter.addEventListener('change',render);
init();
