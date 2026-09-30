import { getCurrentProfile } from '/shared/profiles.js?v=0.10.90';
import { timezoneDisplayName } from '/shared/timezone-labels.js?v=0.10.90';
import { listQueendomEvents, listPublicQueendomEvents, setQueendomEventRegistration, getQueendomEventJoinDetails, enterQueendomEvent } from '/shared/queendom-events.js?v=0.10.90';
import { getMoonPhaseMarker } from '/shared/moon.js?v=0.10.90';

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
function activeOccurrence(event){return event?._calendar_occurrence||null;}
function eventTime(event){const occurrence=activeOccurrence(event);const start=occurrence?.start_time||event.start_time,end=occurrence?.end_time||event.end_time;return `${formatClock(start)}${end?`–${formatClock(end)}`:''}`;}
function eventTimezone(event){const dateValue=activeOccurrence(event)?.event_date||event?.event_date;const date=/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue||''))?new Date(`${dateValue}T12:00:00Z`):new Date();return timezoneDisplayName(event?.event_timezone||'America/Los_Angeles',date)||'Pacific Time';}
function hostLine(event){if(!event?.host_name)return'';const name=esc(event.host_name);if(memberMode&&!embed&&event.host_member_id)return `<span>Hosted by <a href="/flow-fm/team-map/profile/?member=${encodeURIComponent(event.host_member_id)}">${name}</a></span>`;return `<span>Hosted by ${name}</span>`;}
function eventsForDate(date){return events.flatMap(event=>{if(['series','recurring'].includes(event.event_format)&&Array.isArray(event.occurrences)){return event.occurrences.filter(occurrence=>occurrence.event_date===date&&occurrence.status!=='cancelled').map(occurrence=>({...event,_calendar_occurrence:occurrence}));}return event.event_date===date?[event]:[];});}
function eventTile(event){
  const image=event.image_url?`<img src="${esc(event.image_url)}" alt="">`:'<div class="event-tile-placeholder">✦</div>';const occurrence=activeOccurrence(event);const series=event.event_format==='series',recurring=event.event_format==='recurring';
  return `<button class="calendar-event-tile ${event.audience==='flowfm'?'is-flowfm':'is-queendom'} ${event.status==='cancelled'?'is-cancelled':''}" type="button" data-event-id="${esc(event.event_id)}" ${occurrence?`data-occurrence-id="${esc(occurrence.occurrence_id)}"`:''}><span class="calendar-event-image">${image}</span><span class="calendar-event-copy"><small>${series?`SESSION ${esc(occurrence?.occurrence_number||'')} OF ${esc(event.series_count||'')}`:recurring?'WEEKLY GATHERING':esc(audienceLabel(event.audience))}</small><strong>${esc(event.title)}</strong><em>${esc(eventTime(event))}</em></span></button>`;
}
function render(){
  monthTitle.textContent=monthLabel(cursor);
  const first=monthDate(cursor);const leading=(first.getUTCDay()+6)%7;const total=daysInMonth(cursor);const cells=[];
  for(let i=0;i<leading;i++)cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
  for(let day=1;day<=total;day++){
    const date=`${cursor.slice(0,8)}${String(day).padStart(2,'0')}`;const dayEvents=eventsForDate(date);const moon=getMoonPhaseMarker(date);
    cells.push(`<article class="calendar-day ${dayEvents.length?'has-events':''} ${moon?'has-moon-marker':''}"><div class="calendar-day-head"><span class="calendar-date-number">${day}</span>${moon?`<span class="calendar-moon-marker" title="Moon Day ${moon.moonDay}">${moon.emoji} ${esc(moon.label)}</span>`:''}</div><div class="calendar-day-events">${dayEvents.map(eventTile).join('')}</div></article>`);
  }
  const trailing=(7-(cells.length%7))%7;for(let i=0;i<trailing;i++)cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
  grid.innerHTML=cells.join('');
  grid.querySelectorAll('[data-event-id]').forEach(button=>button.addEventListener('click',()=>openEvent(button.dataset.eventId,button.dataset.occurrenceId||'')));
}
function detailDate(event){const d=monthDate(activeOccurrence(event)?.event_date||event.event_date);return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d);}
function occurrenceRegistered(event){const o=activeOccurrence(event);return event.event_format==='recurring'?Boolean(o?.is_registered):Boolean(event.is_registered);}
function publicClaimUrl(event){const url=new URL('/queendom-events/',window.location.origin);url.searchParams.set('saveEvent',event.event_id);const occurrence=activeOccurrence(event);if(occurrence)url.searchParams.set('occurrence',occurrence.occurrence_id);return url.toString();}
function actionMarkup(event){
  if(event.status==='cancelled')return '<div class="event-access-note">This event has been cancelled.</div>';
  const occurrence=activeOccurrence(event),registered=occurrenceRegistered(event);
  if(!memberMode||embed){
    const publicMode=event.public_access||'unavailable';
    if(publicMode==='included'||publicMode==='ticket')return `<a class="save-seat" href="${esc(publicClaimUrl(event))}" ${embed?'target="_top"':''}>${publicMode==='ticket'?'BUY / CLAIM TICKET':'CLAIM MY SEAT'}</a>`;
    if((event.queendom_access||'unavailable')!=='unavailable')return `<a class="save-seat" href="https://www.theidyllcollective.com/queendomhome" target="_top">JOIN THE QUEENDOM TO CLAIM YOUR SEAT</a>`;
    return '<div class="event-access-note">This gathering is visible publicly, but admission is reserved.</div>';
  }
  if(!event.can_join)return `<div class="event-access-note"><strong>Membership required</strong><span>This gathering is visible on the public Flowtel calendar, but your current access does not include admission.</span></div>`;
  if(event.event_format==='series'){
    if(registered)return `<div class="event-dialog-actions"><span class="save-seat is-saved">✓ VORTEX JOINED</span><button type="button" class="join-zoom" data-join-event>OPEN SESSION</button></div><p class="event-dialog-passcode" data-event-passcode></p>`;
    return `<div class="event-dialog-actions"><button type="button" class="save-seat" data-save-seat>CLAIM THE ${Number(event.series_count||0)===4&&Number(event.series_interval_days||7)===7?'4-WEEK VORTEX':`${esc(event.series_count||'')} SESSION SERIES`}</button></div>`;
  }
  return `<div class="event-dialog-actions"><button type="button" class="save-seat ${registered?'is-saved':''}" data-save-seat>${registered?'✓ SEAT CLAIMED':'CLAIM MY SEAT'}</button>${registered?'<button type="button" class="join-zoom" data-join-event>ENTER GATHERING</button>':''}</div><p class="event-dialog-passcode" data-event-passcode></p>`;
}
function renderDialog(event){
  const image=event.image_url?`<img class="event-dialog-image" src="${esc(event.image_url)}" alt="">`:'<div class="event-dialog-image event-dialog-placeholder">✦</div>';
  dialogContent.innerHTML=`${image}<section class="event-dialog-copy"><p class="eyebrow">${esc(eventTypeLabel(event.event_type))} · ${event.event_format==='series'?`SESSION ${esc(activeOccurrence(event)?.occurrence_number||'')} OF ${esc(event.series_count||'')}`:event.event_format==='recurring'?'RECURRING GATHERING':esc(audienceLabel(event.audience))}</p><h2>${esc(event.title)}</h2><p class="event-dialog-when"><strong>${esc(detailDate(event))}</strong><span>${esc(eventTime(event))} · ${esc(eventTimezone(event))}</span>${hostLine(event)}</p>${event.description?`<p class="event-dialog-description">${esc(event.description)}</p>`:''}${actionMarkup(event)}</section>`;
  dialogContent.querySelector('[data-save-seat]')?.addEventListener('click',()=>toggleRegistration(event));
  dialogContent.querySelector('[data-join-event]')?.addEventListener('click',button=>joinEvent(event,button));
}
function openEvent(id,occurrenceId=''){const base=events.find(item=>item.event_id===id);if(!base)return;const occurrence=['series','recurring'].includes(base.event_format)&&Array.isArray(base.occurrences)?base.occurrences.find(item=>String(item.occurrence_id)===String(occurrenceId)):null;const event=occurrence?{...base,_calendar_occurrence:occurrence}:base;currentEventId=id;renderDialog(event);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
async function toggleRegistration(event){
  const occurrence=activeOccurrence(event),target=!occurrenceRegistered(event);const button=dialogContent.querySelector('[data-save-seat]');if(button)button.disabled=true;
  try{
    if(!target)throw new Error('Acuity-linked cancellations are handled through the event/Front Desk so reminders and seats stay synchronized.');
    await setQueendomEventRegistration(event.event_id,true,event.event_format==='recurring'?occurrence?.occurrence_id:null);
    events=memberMode?await listQueendomEvents({monthStart:cursor,monthCount:1}):events;render();const base=events.find(item=>item.event_id===event.event_id);if(base)openEvent(base.event_id,occurrence?.occurrence_id||'');message.textContent='Your seat is confirmed in Flowtel and Acuity will send the configured reminders.';
  }catch(error){message.textContent=error?.message||'Your seat could not be updated.';if(button)button.disabled=false;}
}
async function joinEvent(event,button){
  const occurrence=activeOccurrence(event);button.disabled=true;button.textContent='OPENING…';
  try{
    const entry=await enterQueendomEvent(event.event_id,occurrence?.occurrence_id||null,null);
    if(entry?.requires_checkin){window.location.href=entry.checkin_url;return;}
    if(entry?.requires_event_cycle_day){throw new Error('Open this event from the full Event Room to share your current cycle day before entering.');}
    if(!entry?.ready||!entry?.meeting_url)throw new Error('The Zoom doorway is still syncing. Refresh in a moment.');
    const passcode=dialogContent.querySelector('[data-event-passcode]');if(passcode&&entry.zoom_passcode)passcode.textContent=`Zoom passcode: ${entry.zoom_passcode}`;
    window.open(entry.meeting_url,'_blank','noopener,noreferrer');
  }catch(error){message.textContent=error?.message||'The gathering could not open.';}
  finally{button.disabled=false;button.textContent=event.event_format==='series'?'OPEN SESSION':'ENTER GATHERING';}
}
async function load(){
  message.textContent='Opening the calendar…';
  try{
    if(memberMode&&!embed){
      try{events=await listQueendomEvents({monthStart:cursor,monthCount:1});}
      catch(error){
        // A signed-in limited identity (Complimentary Stay, public Event Pass, etc.)
        // should still be able to browse the public calendar. Membership remains
        // authoritative when CLAIM MY SEAT is evaluated.
        memberMode=false;
        events=await listPublicQueendomEvents({monthStart:cursor,monthCount:1});
      }
    }else events=await listPublicQueendomEvents({monthStart:cursor,monthCount:1});
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
