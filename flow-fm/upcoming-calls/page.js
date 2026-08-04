import { renderTopNav,escapeHtml } from '/flow-fm/ui.js?v=0.10.81.1';
import { loadUpcomingServiceCalls } from '/shared/acuity-scheduling.js?v=0.10.81.1';
import { browserTimezone,normalizeTimezone,timezoneDisplayName,timezoneShortName } from '/shared/timezone-labels.js?v=0.10.81.1';

const nav=document.getElementById('topNav');
const list=document.getElementById('callsList');
const message=document.getElementById('callsMessage');
const gate=document.getElementById('callsGate');
const providerTimezone=browserTimezone();
nav.innerHTML=renderTopNav('upcoming-calls');

function activeUpcomingCalls(calls=[]){
  const now=Date.now();
  return calls
    .filter(call=>['pending','scheduled','rescheduled'].includes(String(call?.status||'')) && new Date(call?.ends_at||call?.starts_at).getTime()>now)
    .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
}
function startOfWeek(date){
  const value=new Date(date);
  value.setHours(0,0,0,0);
  const day=value.getDay();
  const mondayOffset=day===0?-6:1-day;
  value.setDate(value.getDate()+mondayOffset);
  return value;
}
function groupsForCalls(calls){
  const thisWeekStart=startOfWeek(new Date());
  const nextWeekStart=new Date(thisWeekStart);nextWeekStart.setDate(nextWeekStart.getDate()+7);
  const laterStart=new Date(nextWeekStart);laterStart.setDate(laterStart.getDate()+7);
  return [
    {key:'this-week',label:'This Week',calls:calls.filter(call=>new Date(call.starts_at)<nextWeekStart)},
    {key:'next-week',label:'Next Week',calls:calls.filter(call=>new Date(call.starts_at)>=nextWeekStart&&new Date(call.starts_at)<laterStart)},
    {key:'later',label:'Later',calls:calls.filter(call=>new Date(call.starts_at)>=laterStart)},
  ].filter(group=>group.calls.length);
}
function dateParts(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return {day:'—',month:'',weekday:'',time:'—'};
  return {
    day:new Intl.DateTimeFormat('en-US',{day:'numeric',timeZone:providerTimezone}).format(date),
    month:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:providerTimezone}).format(date),
    weekday:new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:providerTimezone}).format(date),
    time:`${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:providerTimezone}).format(date)} ${timezoneShortName(providerTimezone,date)}`.trim(),
  };
}
function accessCloseLabel(value){
  if(!value)return '—';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '—';
  const dateLine=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:providerTimezone}).format(date);
  const timeLine=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:providerTimezone}).format(date);
  return `${dateLine} at ${timeLine} ${timezoneShortName(providerTimezone,date)}`.trim();
}
function clientTimezoneLabel(call){
  const zone=normalizeTimezone(call?.client_timezone,{allowBlank:true});
  return timezoneDisplayName(zone,new Date(call?.starts_at))||'Flowtel Time';
}
function callCard(call){
  const parts=dateParts(call.starts_at);
  return `<article class="call-card">
    <div class="call-date-focus" aria-label="${escapeHtml(`${parts.weekday}, ${parts.month} ${parts.day}`)}">
      <span>${escapeHtml(parts.month)}</span>
      <strong>${escapeHtml(parts.day)}</strong>
      <small>${escapeHtml(parts.weekday)}</small>
    </div>
    <div class="call-card-body">
      <header>
        <div><p class="eyebrow">${escapeHtml(call.service_name||'WOMB MAGIC')}</p><h2>${escapeHtml(call.client_name||'Flowtel Guest')}</h2></div>
        <span class="status">${escapeHtml(String(call.status||'scheduled').toUpperCase())}</span>
      </header>
      <p class="call-time">${escapeHtml(parts.time)}</p>
      <div class="call-details">
        <div><small>Client timezone</small><strong>${escapeHtml(clientTimezoneLabel(call))}</strong></div>
        <div><small>Access closes</small><strong>${escapeHtml(accessCloseLabel(call.access_until))}</strong></div>
      </div>
      <div class="call-actions"><a href="/cycle-data/?client=${encodeURIComponent(call.client_id)}">Open Client Snapshot</a><a href="/flow-map/?client=${encodeURIComponent(call.client_id)}">Open Flow Map</a></div>
    </div>
  </article>`;
}
function renderCalls(calls){
  if(!calls.length){
    list.innerHTML='<article class="call-card empty"><div class="call-card-body"><p class="eyebrow">YOUR CALENDAR IS CLEAR</p><h2>No upcoming calls</h2><p>Calls will appear here after a member books with you.</p></div></article>';
    return;
  }
  list.innerHTML=groupsForCalls(calls).map(group=>`<section class="call-group" data-call-group="${group.key}"><header class="call-group-heading"><div><p class="eyebrow">PRIORITY</p><h2>${escapeHtml(group.label)}</h2></div><span>${group.calls.length} ${group.calls.length===1?'call':'calls'}</span></header><div class="call-group-list">${group.calls.map(callCard).join('')}</div></section>`).join('');
}

async function init(){
  try{
    message.textContent='Opening your upcoming calls…';
    const result=await loadUpcomingServiceCalls();
    renderCalls(activeUpcomingCalls(result.calls||[]));
    message.textContent='';
  }catch(error){
    message.textContent='';
    gate.hidden=false;
    gate.innerHTML=`<h2>This room is not open</h2><p>${escapeHtml(error?.message||'Upcoming calls could not be opened.')}</p>`;
    list.innerHTML='';
  }
}
init();
