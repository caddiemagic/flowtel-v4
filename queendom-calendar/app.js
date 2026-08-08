import { getCurrentProfile } from '/shared/profiles.js?v=0.10.83';
import { timezoneDisplayName } from '/shared/timezone-labels.js?v=0.10.83.1';
import { listQueendomEvents, listPublicQueendomEvents, setQueendomEventRegistration, getQueendomEventJoinDetails } from '/shared/queendom-events.js?v=0.10.83.1';

const shell=document.getElementById('calendarShell');
const nav=document.getElementById('calendarNav');
const hero=document.getElementById('calendarHero');
const grid=document.getElementById('calendarGrid');
const monthTitle=document.getElementById('calendarMonth');
const message=document.getElementById('calendarMessage');
const previous=document.getElementById('previousMonth');
const next=document.getElementById('nextMonth');
const dialog=document.getElementById('eventDialog');
const dialogContent=document.getElementById('eventDialogContent');
const embed=new URLSearchParams(location.search).get('embed')==='1';
let memberMode=false;
let profile=null;
let events=[];
let cursor=monthStart(new Date());
let currentEventId='';

function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function monthStart(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;}
function monthDate(value){return new Date(`${value}T12:00:00Z`);}
function shiftMonth(value,amount){const d=monthDate(value);d.setUTCMonth(d.getUTCMonth()+amount,1);return d.toISOString().slice(0,10);}
function monthLabel(value){return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(monthDate(value));}
function daysInMonth(value){const d=monthDate(value);return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();}
function formatClock(value){const m=/^(\d{2}):(\d{2})/.exec(String(value||''));if(!m)return'';const d=new Date(Date.UTC(2026,0,1,Number(m[1]),Number(m[2])));return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(d);}
function eventTypeLabel(value){return ({workshop:'WORKSHOP',ceremony:'CEREMONY',call:'CALL',other:'EVENT'})[value]||'EVENT';}
function audienceLabel(value){return value==='flowfm'?'FLOW FM':'QUEENDOM';}
function eventTime(event){return `${formatClock(event.start_time)}${event.end_time?`–${formatClock(event.end_time)}`:''}`;}
function eventTimezone(event){const date=/^\d{4}-\d{2}-\d{2}$/.test(String(event?.event_date||''))?new Date(`${event.event_date}T12:00:00Z`):new Date();return timezoneDisplayName(event?.event_timezone||'America/Los_Angeles',date)||'Pacific Time';}
function hostLine(event){if(!event?.host_name)return'';const name=esc(event.host_name);if(memberMode&&!embed&&event.host_member_id)return `<span>Hosted by <a href="/flow-fm/team-map/profile/?member=${encodeURIComponent(event.host_member_id)}">${name}</a></span>`;return `<span>Hosted by ${name}</span>`;}
function eventsForDate(date){return events.filter(event=>event.event_date===date);}
function eventTile(event){
  const image=event.image_url?`<img src="${esc(event.image_url)}" alt="">`:'<div class="event-tile-placeholder">✦</div>';
  return `<button class="calendar-event-tile ${event.audience==='flowfm'?'is-flowfm':'is-queendom'} ${event.status==='cancelled'?'is-cancelled':''}" type="button" data-event-id="${esc(event.event_id)}"><span class="calendar-event-image">${image}</span><span class="calendar-event-copy"><small>${esc(audienceLabel(event.audience))}</small><strong>${esc(event.title)}</strong><em>${esc(eventTime(event))}</em></span></button>`;
}
function render(){
  monthTitle.textContent=monthLabel(cursor);
  const first=monthDate(cursor);const leading=(first.getUTCDay()+6)%7;const total=daysInMonth(cursor);const cells=[];
  for(let i=0;i<leading;i++)cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
  for(let day=1;day<=total;day++){
    const date=`${cursor.slice(0,8)}${String(day).padStart(2,'0')}`;const dayEvents=eventsForDate(date);
    cells.push(`<article class="calendar-day ${dayEvents.length?'has-events':''}"><span class="calendar-date-number">${day}</span><div class="calendar-day-events">${dayEvents.map(eventTile).join('')}</div></article>`);
  }
  const trailing=(7-(cells.length%7))%7;for(let i=0;i<trailing;i++)cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
  grid.innerHTML=cells.join('');
  grid.querySelectorAll('[data-event-id]').forEach(button=>button.addEventListener('click',()=>openEvent(button.dataset.eventId)));
}
function detailDate(event){const d=monthDate(event.event_date);return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d);}
function actionMarkup(event){
  if(!memberMode||embed)return event.audience==='flowfm'?'<div class="event-access-note">Inside Flow FM</div>':'';
  if(event.status==='cancelled')return '<div class="event-access-note">This event has been cancelled.</div>';
  if(!event.can_join)return '<div class="event-access-note"><strong>Inside Flow FM</strong><span>Flow FM members receive the Zoom doorway inside Flowtel.</span></div>';
  return `<div class="event-dialog-actions"><button type="button" class="save-seat ${event.is_registered?'is-saved':''}" data-save-seat>${event.is_registered?'✓ SEAT SAVED':'SAVE MY SEAT'}</button>${event.zoom_ready?'<button type="button" class="join-zoom" data-join-event>JOIN ZOOM</button>':'<span class="event-access-note">Zoom room preparing</span>'}</div><p class="event-dialog-passcode" data-event-passcode></p>`;
}
function renderDialog(event){
  const image=event.image_url?`<img class="event-dialog-image" src="${esc(event.image_url)}" alt="">`:'<div class="event-dialog-image event-dialog-placeholder">✦</div>';
  dialogContent.innerHTML=`${image}<section class="event-dialog-copy"><p class="eyebrow">${esc(eventTypeLabel(event.event_type))} · ${esc(audienceLabel(event.audience))}</p><h2>${esc(event.title)}</h2><p class="event-dialog-when"><strong>${esc(detailDate(event))}</strong><span>${esc(eventTime(event))} · ${esc(eventTimezone(event))}</span>${hostLine(event)}</p>${event.description?`<p class="event-dialog-description">${esc(event.description)}</p>`:''}${actionMarkup(event)}</section>`;
  dialogContent.querySelector('[data-save-seat]')?.addEventListener('click',()=>toggleRegistration(event));
  dialogContent.querySelector('[data-join-event]')?.addEventListener('click',button=>joinEvent(event,button));
}
function openEvent(id){const event=events.find(item=>item.event_id===id);if(!event)return;currentEventId=id;renderDialog(event);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
async function toggleRegistration(event){
  const target=!event.is_registered;const button=dialogContent.querySelector('[data-save-seat]');if(button)button.disabled=true;
  try{await setQueendomEventRegistration(event.event_id,target);event.is_registered=target;render();renderDialog(event);}
  catch(error){message.textContent=error?.message||'Your seat could not be updated.';if(button)button.disabled=false;}
}
async function joinEvent(event,button){
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;button.disabled=true;button.textContent='OPENING…';
  try{
    const details=await getQueendomEventJoinDetails(event.event_id);
    const passcode=dialogContent.querySelector('[data-event-passcode]');if(passcode&&details?.zoom_passcode)passcode.textContent=`Zoom passcode: ${details.zoom_passcode}`;
    if(popup)popup.location.href=details.zoom_url;else window.open(details.zoom_url,'_blank','noopener,noreferrer');
    button.disabled=false;button.textContent='JOIN ZOOM';
  }catch(error){if(popup)popup.close();button.disabled=false;button.textContent='JOIN ZOOM';message.textContent=error?.message||'The Zoom room could not open.';}
}
async function load(){
  message.textContent='Opening the calendar…';
  try{
    events=memberMode&&!embed?await listQueendomEvents({monthStart:cursor,monthCount:1}):await listPublicQueendomEvents({monthStart:cursor,monthCount:1});
    message.textContent=events.length?'':'No events have been placed in this month yet.';render();
    if(currentEventId&&dialog.open){const current=events.find(item=>item.event_id===currentEventId);if(current)renderDialog(current);else dialog.close();}
  }catch(error){events=[];render();message.textContent=error?.message||'The calendar could not open just now.';}
}
previous.addEventListener('click',()=>{cursor=shiftMonth(cursor,-1);load();});next.addEventListener('click',()=>{cursor=shiftMonth(cursor,1);load();});
dialog.querySelector('[data-close-event]').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
async function init(){
  if(embed){document.body.classList.add('is-embed');nav.hidden=true;hero.hidden=true;}
  if(!embed){try{profile=await getCurrentProfile();memberMode=Boolean(profile);}catch{memberMode=false;}}
  await load();
}
init();
