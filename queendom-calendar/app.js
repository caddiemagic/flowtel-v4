import { getCurrentProfile } from '/shared/profiles.js?v=0.10.89';
import { timezoneDisplayName } from '/shared/timezone-labels.js?v=0.10.89';
import { ensureQueendomEventSeriesEnrollment, listQueendomEvents, listPublicQueendomEvents, setQueendomEventRegistration, getQueendomEventJoinDetails } from '/shared/queendom-events.js?v=0.10.89';

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
function eventsForDate(date){return events.flatMap(event=>{if(event.event_format==='series'&&Array.isArray(event.occurrences)){return event.occurrences.filter(occurrence=>occurrence.event_date===date&&occurrence.status!=='cancelled').map(occurrence=>({...event,_calendar_occurrence:occurrence}));}return event.event_date===date?[event]:[];});}
function eventTile(event){
  const image=event.image_url?`<img src="${esc(event.image_url)}" alt="">`:'<div class="event-tile-placeholder">✦</div>';const occurrence=activeOccurrence(event);const series=event.event_format==='series';
  return `<button class="calendar-event-tile ${event.audience==='flowfm'?'is-flowfm':'is-queendom'} ${event.status==='cancelled'?'is-cancelled':''}" type="button" data-event-id="${esc(event.event_id)}" ${occurrence?`data-occurrence-id="${esc(occurrence.occurrence_id)}"`:''}><span class="calendar-event-image">${image}</span><span class="calendar-event-copy"><small>${series?`SESSION ${esc(occurrence?.occurrence_number||'')} OF ${esc(event.series_count||'')}`:esc(audienceLabel(event.audience))}</small><strong>${esc(event.title)}</strong><em>${esc(eventTime(event))}</em></span></button>`;
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
  grid.querySelectorAll('[data-event-id]').forEach(button=>button.addEventListener('click',()=>openEvent(button.dataset.eventId,button.dataset.occurrenceId||'')));
}
function detailDate(event){const d=monthDate(activeOccurrence(event)?.event_date||event.event_date);return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d);}
function actionMarkup(event){
  if(!memberMode||embed)return event.audience==='flowfm'?'<div class="event-access-note">Inside Flow FM</div>':'';
  if(event.status==='cancelled')return '<div class="event-access-note">This event has been cancelled.</div>';
  if(!event.can_join)return '<div class="event-access-note"><strong>Inside Flow FM</strong><span>Flow FM members receive the Zoom doorway inside Flowtel.</span></div>';
  if(event.event_format==='series'){
    if(event.is_registered)return `<div class="event-dialog-actions"><span class="save-seat is-saved">✓ VORTEX JOINED</span><button type="button" class="join-zoom" data-join-event>OPEN SESSION</button></div><p class="event-dialog-passcode" data-event-passcode></p>`;
    return `<div class="event-dialog-actions"><button type="button" class="save-seat" data-save-seat>JOIN THE ${Number(event.series_count||0)===4&&Number(event.series_interval_days||7)===7?'4-WEEK VORTEX':`${esc(event.series_count||'')} SESSION SERIES`}</button></div>`;
  }
  return `<div class="event-dialog-actions"><button type="button" class="save-seat ${event.is_registered?'is-saved':''}" data-save-seat>${event.is_registered?'✓ SEAT SAVED':'SAVE MY SEAT'}</button>${event.zoom_ready?'<button type="button" class="join-zoom" data-join-event>JOIN ZOOM</button>':'<span class="event-access-note">Zoom room preparing</span>'}</div><p class="event-dialog-passcode" data-event-passcode></p>`;
}
function renderDialog(event){
  const image=event.image_url?`<img class="event-dialog-image" src="${esc(event.image_url)}" alt="">`:'<div class="event-dialog-image event-dialog-placeholder">✦</div>';
  dialogContent.innerHTML=`${image}<section class="event-dialog-copy"><p class="eyebrow">${esc(eventTypeLabel(event.event_type))} · ${event.event_format==='series'?`SESSION ${esc(activeOccurrence(event)?.occurrence_number||'')} OF ${esc(event.series_count||'')}`:esc(audienceLabel(event.audience))}</p><h2>${esc(event.title)}</h2><p class="event-dialog-when"><strong>${esc(detailDate(event))}</strong><span>${esc(eventTime(event))} · ${esc(eventTimezone(event))}</span>${hostLine(event)}</p>${event.description?`<p class="event-dialog-description">${esc(event.description)}</p>`:''}${actionMarkup(event)}</section>`;
  dialogContent.querySelector('[data-save-seat]')?.addEventListener('click',()=>toggleRegistration(event));
  dialogContent.querySelector('[data-join-event]')?.addEventListener('click',button=>joinEvent(event,button));
}
function openEvent(id,occurrenceId=''){const base=events.find(item=>item.event_id===id);if(!base)return;const occurrence=base.event_format==='series'&&Array.isArray(base.occurrences)?base.occurrences.find(item=>String(item.occurrence_id)===String(occurrenceId)):null;const event=occurrence?{...base,_calendar_occurrence:occurrence}:base;currentEventId=id;renderDialog(event);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
async function toggleRegistration(event){
  const target=!event.is_registered;const button=dialogContent.querySelector('[data-save-seat]');if(button)button.disabled=true;
  try{const result=await setQueendomEventRegistration(event.event_id,target);event.is_registered=target;render();renderDialog(event);if(result?.series_enrollment?.status==='active')message.textContent='You are registered for the full series. Acuity will send the configured reminders for each gathering.';else if(result?.series_enrollment?.error)message.textContent=`Your Flowtel registration is saved. ${result.series_enrollment.error}`;}
  catch(error){message.textContent=error?.message||'Your seat could not be updated.';if(button)button.disabled=false;}
}
async function joinEvent(event,button){
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;button.disabled=true;button.textContent='OPENING…';
  try{
    if(event.event_format==='series')await ensureQueendomEventSeriesEnrollment(event.event_id).catch(error=>console.warn('Series doorway sync pending.',error));
    const details=await getQueendomEventJoinDetails(event.event_id);let zoom=details.zoom_url||'',pass=details.zoom_passcode||'';
    if(event.event_format==='series'){
      const requested=activeOccurrence(event);const rows=Array.isArray(details.occurrences)?details.occurrences:[];const session=(requested&&rows.find(item=>String(item.occurrence_id)===String(requested.occurrence_id)))||rows.find(item=>new Date(item.ends_at||item.starts_at).getTime()>=Date.now()-3600000)||rows[0];
      zoom=session?.meeting_url||'';pass=session?.zoom_passcode||pass;if(!zoom)throw new Error('This session is registered, but its Acuity Zoom doorway is still syncing. Open it again in a moment.');
    }
    const passcode=dialogContent.querySelector('[data-event-passcode]');if(passcode&&pass)passcode.textContent=`Zoom passcode: ${pass}`;
    if(popup)popup.location.href=zoom;else window.open(zoom,'_blank','noopener,noreferrer');
    button.disabled=false;button.textContent=event.event_format==='series'?'OPEN SESSION':'JOIN ZOOM';
  }catch(error){if(popup)popup.close();button.disabled=false;button.textContent=event.event_format==='series'?'OPEN SESSION':'JOIN ZOOM';message.textContent=error?.message||'The Zoom room could not open.';}
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
