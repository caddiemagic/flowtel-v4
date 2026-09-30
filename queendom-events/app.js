import {
  getQueendomEventJoinDetails,
  enterQueendomEvent,
  getQueendomEventFlowMap,
  listPublicQueendomEvents,
  listQueendomEvents,
  setQueendomEventRegistration,
  verifyQueendomEventTicket,
} from '/shared/queendom-events.js?v=0.10.90';
import { getCurrentProfile } from '/shared/profiles.js?v=0.10.90';
import { getMyProductAccess } from '/shared/product-access.js?v=0.10.90';
import {
  createAccountWithEmail,
  getCurrentUser,
  onAuthStateChange,
  sendPasswordResetEmail,
  signInWithEmail,
  updateCurrentPassword,
} from '/shared/auth.js?v=0.10.90';

const FLOWTEL_ZONE='America/Los_Angeles';
const shell=document.getElementById('agendaShell');
const hero=document.getElementById('agendaHero');
const filters=document.getElementById('agendaFilters');
const monthNav=document.getElementById('agendaMonths');
const list=document.getElementById('agendaList');
const status=document.getElementById('agendaStatus');
const liveAlert=document.getElementById('agendaLiveAlert');
const eventRoom=document.getElementById('agendaEventRoom');
const eventRoomContent=document.getElementById('agendaEventRoomContent');
const eventRoomStatus=document.getElementById('agendaEventRoomStatus');
const accessModal=document.getElementById('agendaAccessModal');
const accessTitle=document.getElementById('agendaAccessTitle');
const accessIntro=document.getElementById('agendaAccessIntro');
const accessStatus=document.getElementById('agendaAccessStatus');
const signInForm=document.getElementById('agendaSignInForm');
const createPassForm=document.getElementById('agendaCreatePassForm');
const recoveryForm=document.getElementById('agendaRecoveryForm');
const params=new URLSearchParams(window.location.search);
const embed=params.get('embed')==='1';
let events=[];
let audience='all';
let profile=null;
let viewerUser=null;
let viewerAccess=null;
let embedResizeObserver=null;
let countdownTimer=null;
let activeAccessEventId='',activeAccessOccurrenceId='';
let recoveryMode=params.get('eventPassRecovery')==='1';

function notifyEmbedHeight(){if(!embed||window.parent===window)return;const height=Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,shell?.scrollHeight||0));window.parent.postMessage({type:'flowtel:queendom-events-height',height},'*');}
function watchEmbedHeight(){if(!embed)return;notifyEmbedHeight();if('ResizeObserver'in window){embedResizeObserver?.disconnect();embedResizeObserver=new ResizeObserver(()=>notifyEmbedHeight());embedResizeObserver.observe(shell);}list.querySelectorAll('img').forEach(image=>image.addEventListener('load',notifyEmbedHeight,{once:true}));}
function esc(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));}
function eventDate(value){return new Date(`${value}T12:00:00Z`);}
function eventType(value){return({workshop:'WORKSHOP',ceremony:'CEREMONY',call:'CALL',other:'EVENT'})[String(value||'').toLowerCase()]||'EVENT';}
function audienceLabel(value){return value==='flowfm'?'FLOW FM':'QUEENDOM';}
function monthKey(event){return String(event.event_date||'').slice(0,7);}
function monthLabel(key){const[y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1)));}
function shortMonthLabel(key){const[y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1))).toUpperCase();}
function detailedDate(value){return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(eventDate(value));}
function dayNumber(value){return String(Number(String(value||'').slice(-2))||'');}
function monthAbbr(value){return new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(eventDate(value)).toUpperCase();}
function eventOccurrences(event){return ['series','recurring'].includes(event?.event_format)&&Array.isArray(event.occurrences)?event.occurrences.filter(item=>item?.status!=='cancelled'):[];}
function seriesOccurrences(event){return event?.event_format==='series'?eventOccurrences(event):[];}
function futureEvent(event){const occurrences=eventOccurrences(event);const last=occurrences[occurrences.length-1];const end=last?.ends_at||last?.live_room_starts_at||last?.starts_at||event.ends_at||event.live_room_starts_at||event.starts_at;if(end){const stamp=new Date(end).getTime();if(Number.isFinite(stamp))return stamp>=Date.now()-3600000;}return String(last?.event_date||event.event_date||'')>=new Date().toISOString().slice(0,10);}
function nextOccurrence(event){const occurrences=eventOccurrences(event);if(!occurrences.length)return null;const now=Date.now()-60*60000;return occurrences.find(item=>new Date(item.ends_at||item.live_room_starts_at||item.starts_at).getTime()>=now)||occurrences[occurrences.length-1];}
function nextRegisteredOccurrence(event){const rows=eventOccurrences(event).filter(item=>item.is_registered);if(!rows.length)return null;const now=Date.now()-60*60000;return rows.find(item=>new Date(item.ends_at||item.live_room_starts_at||item.starts_at).getTime()>=now)||rows[rows.length-1];}
function seriesLabel(event){const count=Number(event?.series_count||seriesOccurrences(event).length||0);return event?.event_format==='series'?(count===4&&Number(event?.series_interval_days||7)===7?'4-WEEK VORTEX':`${count}-SESSION SERIES`):'';}
function viewerZone(){return profile?.timezone||viewerUser?.user_metadata?.timezone||'';}
function timeInZone(timestamp,zone,{includeDate=false}={}){const date=new Date(timestamp);if(Number.isNaN(date.getTime())||!zone)return'';try{return new Intl.DateTimeFormat('en-US',{...(includeDate?{weekday:'short',month:'short',day:'numeric'}:{}),hour:'numeric',minute:'2-digit',timeZone:zone,timeZoneName:'short'}).format(date);}catch{return'';}}
function timeStack(event){const start=event.starts_at,memberZone=viewerZone()&&viewerZone()!==FLOWTEL_ZONE?viewerZone():null;const flow=`<span><b>FLOWTEL TIME</b> — ${esc(timeInZone(start,FLOWTEL_ZONE))}</span>`;const mine=memberZone?`<span><b>YOUR TIME</b> — ${esc(timeInZone(start,memberZone))}</span>`:'';let live='';if(event.live_room_starts_at&&new Date(event.live_room_starts_at).getTime()!==new Date(start).getTime()){live=`<p class="agenda-live-time"><b>LIVE GATHERING</b> — ${esc(timeInZone(event.live_room_starts_at,FLOWTEL_ZONE))}${memberZone?` · ${esc(timeInZone(event.live_room_starts_at,memberZone))} your time`:''}</p>`;}return `<div class="agenda-time-stack">${flow}${mine}</div>${live}`;}
function profileHref(id){return id?`/flow-fm/team-map/profile/?member=${encodeURIComponent(id)}`:'';}
function localNow(zone){if(!zone)return'';try{return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone,timeZoneName:'short'}).format(new Date());}catch{return'';}}
function hostMarkup(event){if(!event.host_name&&!event.co_host_name)return'';const host=event.host_name?(event.host_member_id?`<a href="${esc(profileHref(event.host_member_id))}">${esc(event.host_name)}</a>`:esc(event.host_name)):'';const co=event.co_host_name?(event.co_host_member_id?`<a href="${esc(profileHref(event.co_host_member_id))}">${esc(event.co_host_name)}</a>`:esc(event.co_host_name)):'';const hostTime=event.host_timezone?`<span class="agenda-host-time">${esc(event.host_name)}’s local time: ${esc(localNow(event.host_timezone))}</span>`:'';const coTime=event.co_host_timezone?`<span class="agenda-host-time">${esc(event.co_host_name)}’s local time: ${esc(localNow(event.co_host_timezone))}</span>`:'';return `<p class="agenda-host">Hosted by ${host}${host&&co?' + ':''}${co}${hostTime}${coTime}</p>`;}
function money(value,currency='USD'){if(value==null||value==='')return'';try{return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:Number(value)%1?2:0}).format(Number(value));}catch{return `$${Number(value)}`;}}
function publicAccess(event){return{mode:event.public_access||'unavailable',price:event.public_price,currency:event.access_currency||'USD',ticket_url:event.ticket_url};}
function memberAccess(event){return event.access||publicAccess(event);}
function isAuthenticated(){return Boolean(viewerUser?.id);}
function isEventPass(){return viewerAccess?.access_role==='event_pass'&&!viewerAccess?.flowtel_access;}
function canHostEvent(event){const role=String(profile?.role||'').toLowerCase();return ['owner','admin'].includes(role)||String(event?.host_member_id||'')===String(viewerUser?.id||'')||String(event?.co_host_member_id||'')===String(viewerUser?.id||'');}
function publicEventPageUrl(event,key='claimEvent',occurrenceId=''){const target=new URL('/queendom-events/',window.location.origin);target.searchParams.set(key,event.event_id);if(occurrenceId)target.searchParams.set('occurrence',occurrenceId);return target.toString();}
function flowtelRegistrationUrl(event){const target=new URL('/client/',window.location.origin);target.searchParams.set('lounge','1');target.searchParams.set('saveEvent',event.event_id);target.searchParams.set('eventReturn','1');target.hash='my-upcoming-events';return target.toString();}
function nextRecurringOccurrence(event){return event.event_format==='recurring'?nextOccurrence(event):null;}
function actionMarkup(event){
  if(event.status==='cancelled')return'<span class="agenda-cancelled">CANCELLED</span>';
  const access=isAuthenticated()?memberAccess(event):publicAccess(event),occurrence=nextRecurringOccurrence(event),occurrenceId=occurrence?.occurrence_id||'';
  const registered=event.event_format==='recurring'?Boolean(occurrence?.is_registered):Boolean(event.is_registered);
  if(isAuthenticated()&&canHostEvent(event)&&!registered)return `<button type="button" class="agenda-seat is-host-view" data-open-event="${esc(event.event_id)}" ${occurrenceId?`data-occurrence-id="${esc(occurrenceId)}"`:''}>OPEN HOST FLOW MAP</button>`;
  if(isAuthenticated()&&registered)return `<button type="button" class="agenda-seat is-saved" data-open-event="${esc(event.event_id)}" ${occurrenceId?`data-occurrence-id="${esc(occurrenceId)}"`:''}>${event.event_format==='series'?'✓ VORTEX JOINED · OPEN SERIES':event.event_format==='recurring'?'✓ NEXT GATHERING CLAIMED · OPEN EVENT':'✓ SEAT CLAIMED · OPEN EVENT'}</button>`;
  if(access?.entitled||access?.mode==='included'){
    if(isAuthenticated())return `<button type="button" class="agenda-seat" data-save-event="${esc(event.event_id)}" ${occurrenceId?`data-occurrence-id="${esc(occurrenceId)}"`:''}>${event.event_format==='series'?`JOIN THE ${esc(seriesLabel(event))}`:'CLAIM MY SEAT'}</button>`;
    if((event.public_access||'unavailable')==='included')return `<button type="button" class="agenda-seat" data-access-event="${esc(event.event_id)}" ${occurrenceId?`data-occurrence-id="${esc(occurrenceId)}"`:''}>CLAIM MY SEAT</button>`;
  }
  if(access?.mode==='ticket'&&access?.ticket_url){
    const price=money(access.price,access.currency||event.access_currency);
    if(embed)return `<div class="agenda-ticket-actions"><a class="agenda-seat" href="${esc(access.ticket_url)}" target="_top">BUY TICKET${price?` · ${esc(price)}`:''}</a><a class="agenda-check-ticket agenda-access-ticket-link" href="${esc(publicEventPageUrl(event,'claimEvent',occurrenceId))}" target="_top">Already have a ticket? Access event</a></div>`;
    return `<div class="agenda-ticket-actions"><a class="agenda-seat" href="${esc(access.ticket_url)}" target="_top" data-ticket-buy="${esc(event.event_id)}">BUY TICKET${price?` · ${esc(price)}`:''}</a>${isAuthenticated()?`<button type="button" class="agenda-check-ticket" data-check-ticket="${esc(event.event_id)}" ${occurrenceId?`data-occurrence-id="${esc(occurrenceId)}"`:''}>Already purchased? Check my ticket</button>`:`<button type="button" class="agenda-check-ticket" data-access-event="${esc(event.event_id)}" ${occurrenceId?`data-occurrence-id="${esc(occurrenceId)}"`:''}>Already have a ticket? Access event</button>`}</div>`;
  }
  if((event.queendom_access||'unavailable')!=='unavailable')return `<a class="agenda-seat agenda-join-queendom" href="https://www.theidyllcollective.com/queendomhome" target="_top">JOIN THE QUEENDOM TO CLAIM YOUR SEAT</a>`;
  return'<span class="agenda-unavailable">THIS GATHERING IS NOT OPEN WITH YOUR CURRENT ACCESS</span>';
}
function card(event,{featured=false,compact=false}={}){
  const image=event.image_url?`<img src="${esc(event.image_url)}" alt="">`:'<span class="agenda-art-placeholder" aria-hidden="true">✦</span>';
  const flowfm=event.audience==='flowfm',cancelled=event.status==='cancelled',description=event.description?`<p class="agenda-description">${esc(event.description)}</p>`:'';
  const occurrences=eventOccurrences(event),last=occurrences[occurrences.length-1],series=event.event_format==='series',recurring=event.event_format==='recurring',next=recurring?nextOccurrence(event):null;
  const when=series&&last?`${detailedDate(event.event_date)} – ${detailedDate(last.event_date)}`:recurring&&next?`${detailedDate(next.event_date)} · next weekly gathering`:detailedDate(event.event_date);
  const chip=series?`<span class="agenda-series-chip">${esc(seriesLabel(event))}</span>`:recurring?'<span class="agenda-series-chip">RECURRING · CLAIM EACH GATHERING</span>':'';
  return `<article class="agenda-event ${flowfm?'is-flowfm':'is-queendom'} ${cancelled?'is-cancelled':''} ${featured?'is-featured':''} ${compact?'is-embed-compact':''}"><div class="agenda-date" aria-label="${esc(when)}"><span>${esc(monthAbbr(event.event_date))}</span><strong>${esc(dayNumber(event.event_date))}</strong></div><div class="agenda-art">${image}</div><div class="agenda-copy"><div class="agenda-chips"><span>${esc(eventType(event.event_type))}</span><span class="${flowfm?'flowfm-chip':''}">${esc(audienceLabel(event.audience))}</span>${chip}</div><h2>${esc(event.title)}</h2><p class="agenda-when"><strong>${esc(when)}</strong></p>${timeStack(event)}${hostMarkup(event)}${description}</div><div class="agenda-actions">${actionMarkup(event)}</div></article>`;
}
function visibleEvents(){return events.filter(event=>futureEvent(event)&&event.status!=='draft'&&(audience==='all'||event.audience===audience));}
function renderMonths(rows){const keys=[...new Set(rows.map(monthKey).filter(Boolean))];monthNav.innerHTML=keys.map(key=>`<a href="#month-${esc(key)}">${esc(shortMonthLabel(key))}</a>`).join('');monthNav.hidden=keys.length<2;}
function renderEmbed(rows){monthNav.hidden=true;filters.closest('.agenda-tools')?.setAttribute('hidden','');if(!rows.length){list.innerHTML='';status.textContent='The next gathering has not been placed yet.';requestAnimationFrame(notifyEmbedHeight);return;}status.textContent='';const featured=rows[0],upcoming=rows.slice(1,4);list.innerHTML=`<section class="agenda-embed-feed"><header class="agenda-embed-heading"><p class="eyebrow">UPCOMING EVENTS IN THE QUEENDOM</p><h2>There is always something happening here.</h2></header><div class="agenda-embed-featured">${card(featured,{featured:true})}</div>${upcoming.length?`<div class="agenda-embed-coming"><p class="eyebrow">COMING UP</p>${upcoming.map(event=>card(event,{compact:true})).join('')}</div>`:''}<a class="agenda-view-all" href="/queendom-events/" target="_top">VIEW ALL UPCOMING EVENTS</a></section>`;requestAnimationFrame(watchEmbedHeight);}
function eventById(id){return events.find(event=>String(event.event_id)===String(id))||null;}

async function refreshViewer(){
  viewerUser=await getCurrentUser().catch(()=>null);profile=null;viewerAccess=null;
  if(!viewerUser)return;
  const [profileResult,accessResult]=await Promise.allSettled([getCurrentProfile(),getMyProductAccess()]);
  if(profileResult.status==='fulfilled')profile=profileResult.value;
  if(accessResult.status==='fulfilled')viewerAccess=accessResult.value;
}
async function refreshEvents(){
  if(isAuthenticated()){
    try{events=await listQueendomEvents({monthCount:12});return;}catch(error){if(isEventPass())throw error;console.warn('Authenticated calendar feed unavailable; using sanitized public feed.',error);}
  }
  events=await listPublicQueendomEvents({monthCount:12});
}
function updateNavigation(){document.querySelectorAll('.agenda-flowtel-nav').forEach(nav=>{nav.hidden=isEventPass();});}

async function saveSeat(eventId,occurrenceId=''){
  const selected=eventById(eventId);status.textContent=selected?.event_format==='series'?'Joining the full vortex…':'Claiming your seat in Flowtel + Acuity…';
  try{
    await setQueendomEventRegistration(eventId,true,occurrenceId||null);await refreshEvents();render();status.textContent=selected?.event_format==='series'?'Your full vortex is confirmed. Acuity will send the configured reminders.':'Your seat is confirmed. Acuity will send the configured confirmation/reminder emails.';
    return true;
  }catch(error){status.textContent=error?.message||'Your seat could not be claimed.';throw error;}
}
async function checkTicket(eventId,{openAfter=true,occurrenceId=''}={}){
  status.textContent='Checking your ticket…';
  const result=await verifyQueendomEventTicket(eventId);
  status.textContent=result.message||'Ticket checked.';
  if(result.paid){await refreshEvents();await saveSeat(eventId,occurrenceId);await refreshEvents();render();if(openAfter)await openEventRoom(eventId,occurrenceId);}
  return result;
}
function attendeeHostLine(detail){const host=detail.host_name?esc(detail.host_name):'';const co=detail.co_host_name?esc(detail.co_host_name):'';return host||co?`<p class="agenda-event-room-host">Hosted by ${host}${host&&co?' + ':''}${co}</p>`:'';}
function eventRoomTimes(detail){const memberZone=viewerZone()&&viewerZone()!==FLOWTEL_ZONE?viewerZone():null;const start=detail.starts_at,live=detail.live_room_starts_at||start;const liveDiff=new Date(live).getTime()!==new Date(start).getTime();return `<div class="agenda-event-room-times"><div><span>FLOWTEL TIME</span><strong>${esc(timeInZone(start,FLOWTEL_ZONE,{includeDate:true}))}</strong>${memberZone?`<small>YOUR TIME — ${esc(timeInZone(start,memberZone,{includeDate:true}))}</small>`:''}</div>${liveDiff?`<div><span>LIVE ROOM OPENS</span><strong>${esc(timeInZone(live,FLOWTEL_ZONE,{includeDate:true}))}</strong>${memberZone?`<small>YOUR TIME — ${esc(timeInZone(live,memberZone,{includeDate:true}))}</small>`:''}</div>`:''}</div>`;}
function protectedOccurrences(detail){return Array.isArray(detail?.occurrences)?detail.occurrences.filter(item=>item?.status!=='cancelled'):[];}
function protectedSeriesOccurrences(detail){return detail?.event_format==='series'?protectedOccurrences(detail):[];}
function currentOccurrence(detail,requestedId=''){const rows=protectedOccurrences(detail);if(!rows.length)return null;if(requestedId){const requested=rows.find(item=>String(item.occurrence_id)===String(requestedId));if(requested)return requested;}const now=Date.now()-60*60000;return rows.find(item=>new Date(item.ends_at||item.live_room_starts_at||item.starts_at).getTime()>=now)||rows[rows.length-1];}
function currentSeriesOccurrence(detail){return currentOccurrence(detail);}
function occurrenceItinerary(detail,current){const rows=protectedOccurrences(detail);if(!rows.length)return'';const memberZone=viewerZone()&&viewerZone()!==FLOWTEL_ZONE?viewerZone():null;return `<section class="agenda-event-room-section agenda-series-room"><p class="eyebrow">${detail.event_format==='series'?esc(seriesLabel(detail)):'UPCOMING GATHERINGS'}</p><h3>${detail.event_format==='series'?'Your vortex':'Choose each weekly gathering independently'}</h3><ol>${rows.map(item=>`<li class="${item.occurrence_id===current?.occurrence_id?'is-next-session':''}"><span>${detail.event_format==='series'?`SESSION ${esc(item.occurrence_number)} OF ${esc(detail.series_count||rows.length)}`:`GATHERING ${esc(item.occurrence_number)}`}</span><strong>${esc(timeInZone(item.starts_at,FLOWTEL_ZONE,{includeDate:true}))}</strong>${memberZone?`<small>YOUR TIME — ${esc(timeInZone(item.starts_at,memberZone,{includeDate:true}))}</small>`:''}${item.is_registered?'<em>SEAT CLAIMED</em>':''}</li>`).join('')}</ol></section>`;}
function eventFlowMapMarkup(data){
  const joined=Array.isArray(data?.joined)?data.joined:[],claimed=Array.isArray(data?.claimed)?data.claimed:[];
  const chambers=[['Inner Autumn','NORTH · INNER AUTUMN'],['Inner Summer','EAST · INNER SUMMER'],['Inner Winter','WEST · INNER WINTER'],['Inner Spring','SOUTH · INNER SPRING']];
  const avatar=item=>item.profile_photo_url?`<img src="${esc(item.profile_photo_url)}" alt="">`:`<span>${esc(String(item.display_name||'?').slice(0,1).toUpperCase())}</span>`;
  return `<section class="event-flow-map"><header><div><p class="eyebrow">EVENT FLOW MAP</p><h3>The cyclical weather of the room</h3></div><div class="event-flow-stats"><strong>${esc(data?.claimed_count||0)} CLAIMED SEATS</strong><strong>${esc(data?.joined_count||0)} IN THE ROOM</strong><button type="button" data-refresh-flow-map>REFRESH</button></div></header><div class="event-flow-chambers">${chambers.map(([season,label])=>{const people=joined.filter(item=>item.inner_season===season);return `<article class="event-flow-chamber"><div class="event-flow-chamber-head"><strong>${esc(label)}</strong><span>${people.length}</span></div><div class="event-flow-people">${people.length?people.map(item=>`<div class="event-flow-person"><div class="event-flow-avatar">${avatar(item)}</div><div><strong>${esc(item.display_name)}</strong><span>CYCLE DAY ${esc(item.cycle_day||'—')}</span><small>ENTERED ${esc(timeInZone(item.joined_at,FLOWTEL_ZONE))}</small></div></div>`).join(''):'<p class="event-flow-quiet">This chamber is quiet.</p>'}</div></article>`;}).join('')}</div><details class="event-claimed-seats"><summary>CLAIMED SEATS · ${claimed.length}</summary>${claimed.map(item=>`<p><strong>${esc(item.display_name)}</strong><span>${item.joined?'In the room':'Not entered yet'}</span></p>`).join('')}</details></section>`;
}
async function refreshEventFlowMap(detail,occurrence){
  if(!detail?.can_view_flow_map)return;
  const holder=eventRoomContent.querySelector('[data-event-flow-map]');if(!holder)return;
  const map=await getQueendomEventFlowMap(detail.event_id,occurrence?.occurrence_id||null);holder.innerHTML=eventFlowMapMarkup(map);
  holder.querySelector('[data-refresh-flow-map]')?.addEventListener('click',button=>{button.disabled=true;refreshEventFlowMap(detail,occurrence).catch(error=>{eventRoomStatus.textContent=error?.message||'The Event Flow Map could not refresh.';}).finally(()=>{button.disabled=false;});});
}
async function launchGathering(detail,occurrence,button){
  button.disabled=true;button.textContent='OPENING…';
  try{
    let entry=await enterQueendomEvent(detail.event_id,occurrence?.occurrence_id||null,null);
    if(entry?.requires_checkin){window.location.href=entry.checkin_url;return;}
    if(entry?.requires_event_cycle_day){
      const raw=window.prompt('What cycle day are you on today? Enter a number so the host can see your Inner Season on the Event Flow Map.');if(!raw)return;
      entry=await enterQueendomEvent(detail.event_id,occurrence?.occurrence_id||null,Number(raw));
    }
    if(!entry?.ready||!entry?.meeting_url)throw new Error('Your Zoom doorway is still syncing from Acuity. Refresh in a moment.');
    window.open(entry.meeting_url,'_blank','noopener,noreferrer');
    if(detail.can_view_flow_map)await refreshEventFlowMap(detail,occurrence);
  }catch(error){eventRoomStatus.textContent=error?.message||'The gathering could not open.';}
  finally{button.disabled=false;button.textContent=detail.event_format==='series'?`JOIN ZOOM · SESSION ${occurrence?.occurrence_number||''}`:'JOIN ZOOM';}
}
async function openEventRoom(eventId,requestedOccurrenceId=''){
  if(!isAuthenticated()){openAccessModal(eventId,{occurrenceId:requestedOccurrenceId});return;}
  eventRoom.hidden=false;eventRoom.setAttribute('aria-hidden','false');document.body.classList.add('agenda-modal-open');eventRoomStatus.textContent='Opening your event room…';eventRoomContent.innerHTML='';
  try{
    const event=eventById(eventId),occurrenceId=requestedOccurrenceId||params.get('occurrence')||'';
    if(event?.access?.mode==='ticket'&&!event?.access?.entitled){const ticket=await verifyQueendomEventTicket(eventId);if(!ticket?.paid)throw new Error(ticket?.message||'Your paid ticket could not be confirmed.');await saveSeat(eventId,occurrenceId);}
    const detail=await getQueendomEventJoinDetails(eventId),current=currentOccurrence(detail,occurrenceId);
    const timeDetail=current?{...detail,starts_at:current.starts_at,live_room_starts_at:current.live_room_starts_at||current.starts_at}:detail;
    const dateCopy=detail.event_format==='series'?`${seriesLabel(detail)} · ${detail.series_count||protectedOccurrences(detail).length} GATHERINGS`:current?detailedDate(current.event_date):detailedDate(detail.event_date);
    const location=detail.private_location?`<section class="agenda-event-room-section"><p class="eyebrow">WHERE TO GO</p><p>${esc(detail.private_location).replace(/\n/g,'<br>')}</p></section>`:'';
    const guide=detail.attendee_guide_url?`<a class="agenda-secondary-action" href="${esc(detail.attendee_guide_url)}" target="_blank" rel="noopener">DOWNLOAD YOUR HOW TO PREPARE GUIDE</a>`:'';
    const canEnter=detail.event_format==='recurring'?Boolean(current?.is_registered):Boolean(detail.is_registered);const roomEyebrow=detail.is_operational_host&&!detail.is_registered?'HOST EVENT VIEW':'YOUR REGISTERED EVENT';
    eventRoomContent.innerHTML=`<p class="eyebrow">${esc(roomEyebrow)}</p><h2 id="agendaEventRoomTitle">${esc(detail.title)}</h2><p class="agenda-event-room-date">${esc(dateCopy)}</p>${eventRoomTimes(timeDetail)}${attendeeHostLine(detail)}<p class="agenda-recording"><b>Will this be recorded?</b> ${detail.will_be_recorded?'Yes':'No'}</p>${detail.description?`<p class="agenda-event-room-description">${esc(detail.description)}</p>`:''}${occurrenceItinerary(detail,current)}<section class="agenda-event-room-section"><p class="eyebrow">HOW TO PREPARE</p><p>${esc(detail.how_to_prepare||'Find a private space. Light a candle + incense. Make tea. Grab a journal + pen.').replace(/\n/g,'<br>')}</p>${guide}</section>${location}<p class="event-cycle-disclosure">When you enter this gathering, your current Cycle Day and Inner Season are shared with the event host to support the group experience.</p><div class="agenda-event-room-actions">${canEnter?`<button type="button" class="agenda-primary-action" data-enter-gathering>${detail.event_format==='series'?`JOIN ZOOM · SESSION ${esc(current?.occurrence_number||'')}`:'JOIN ZOOM'}</button>`:detail.is_operational_host?'<p class="event-host-view-note">Host view is open. Attendee Zoom entry appears after you claim a seat; the Event Flow Map remains available here.</p>':'<p>Claim this specific recurring gathering before entering.</p>'}</div>${detail.can_view_flow_map?'<div data-event-flow-map></div>':''}`;
    eventRoomContent.querySelector('[data-enter-gathering]')?.addEventListener('click',button=>launchGathering(detail,current,button));
    if(detail.can_view_flow_map)await refreshEventFlowMap(detail,current);
    eventRoomStatus.textContent='';
  }catch(error){eventRoomStatus.textContent=error?.message||'This event room could not open just now.';}
}
function closeEventRoom(){eventRoom.hidden=true;eventRoom.setAttribute('aria-hidden','true');document.body.classList.remove('agenda-modal-open');}

function setAccessTab(name){
  document.querySelectorAll('[data-access-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.accessTab===name));
  signInForm.hidden=name!=='signin';createPassForm.hidden=name!=='create';recoveryForm.hidden=name!=='recovery';
}
function openAccessModal(eventId,{tab='signin',recovery=false,occurrenceId=''}={}){
  activeAccessEventId=String(eventId||activeAccessEventId||'');activeAccessOccurrenceId=String(occurrenceId||'');const event=eventById(activeAccessEventId);const publicMode=event?.public_access||'unavailable';const publicTicket=publicMode==='ticket',publicPass=publicMode==='ticket'||publicMode==='included';
  accessModal.hidden=false;accessModal.setAttribute('aria-hidden','false');document.body.classList.add('agenda-modal-open');accessTitle.textContent=event?`Access ${event.title}.`:'Access your event.';accessIntro.textContent=publicTicket?'Sign in with an existing Flowtel account, or create a limited Event Pass using the same email you used at checkout. Flowtel verifies payment before claiming the Acuity seat.':publicMode==='included'?'Sign in, or create a limited Event Pass for this public gathering. The Event Pass opens only this event; it does not grant Queendom or Suite access.':'Sign in with the Flowtel account connected to your Queendom membership.';accessStatus.textContent='';
  const createTab=document.querySelector('[data-access-tab="create"]');if(createTab)createTab.hidden=!publicPass;
  setAccessTab(recovery?'recovery':tab);
}
function closeAccessModal(){accessModal.hidden=true;accessModal.setAttribute('aria-hidden','true');if(eventRoom.hidden)document.body.classList.remove('agenda-modal-open');}
async function finishAuthenticatedAccess(eventId){await refreshViewer();await refreshEvents();const selected=eventById(eventId),occurrenceId=activeAccessOccurrenceId||params.get('occurrence')||'';if(selected?.access?.mode==='ticket'&&!selected?.access?.entitled)await checkTicket(eventId,{openAfter:true,occurrenceId});else{await saveSeat(eventId,occurrenceId);await openEventRoom(eventId,occurrenceId);}updateNavigation();}

async function handleSignIn(event){
  event.preventDefault();const email=document.getElementById('agendaSignInEmail').value.trim().toLowerCase();const password=document.getElementById('agendaSignInPassword').value;
  accessStatus.textContent='Signing in…';
  try{await signInWithEmail(email,password);await refreshViewer();await refreshEvents();render();closeAccessModal();await finishAuthenticatedAccess(activeAccessEventId);}
  catch(error){accessStatus.textContent=error?.message||'Flowtel could not sign you in.';}
}
async function handleCreatePass(event){
  event.preventDefault();const email=document.getElementById('agendaPassEmail').value.trim().toLowerCase();const password=document.getElementById('agendaPassPassword').value;const confirm=document.getElementById('agendaPassConfirm').value;
  if(password.length<10){accessStatus.textContent='Choose a password with at least 10 characters.';return;}if(password!==confirm){accessStatus.textContent='Those passwords do not match yet.';return;}
  accessStatus.textContent='Creating your private Event Pass…';
  try{
    const redirect=new URL('/queendom-events/',window.location.origin);redirect.searchParams.set('claimEvent',activeAccessEventId);if(activeAccessOccurrenceId)redirect.searchParams.set('occurrence',activeAccessOccurrenceId);
    const data=await createAccountWithEmail(email,password,{redirectTo:redirect.toString(),metadata:{source:'flowtel_event_pass',event_pass_only:true,event_id:activeAccessEventId,flowtel_password_chosen:true}});
    if(data?.session?.user){await finishAuthenticatedAccess(activeAccessEventId);closeAccessModal();return;}
    accessStatus.textContent='Check your email to confirm your Event Pass. After confirmation, return here and Flowtel will claim the event seat through Acuity.';
  }catch(error){accessStatus.textContent=error?.message||'Your Event Pass could not be created just now.';}
}
async function handleForgotPassword(){const email=document.getElementById('agendaSignInEmail').value.trim().toLowerCase();if(!email){accessStatus.textContent='Enter your email first, then choose Forgot your password?';return;}try{const redirect=new URL('/queendom-events/',window.location.origin);redirect.searchParams.set('eventPassRecovery','1');if(activeAccessEventId)redirect.searchParams.set('claimEvent',activeAccessEventId);if(activeAccessOccurrenceId)redirect.searchParams.set('occurrence',activeAccessOccurrenceId);await sendPasswordResetEmail(email,redirect.toString());accessStatus.textContent='Check your email for the Flowtel password reset link.';}catch(error){accessStatus.textContent=error?.message||'Flowtel could not send that reset email.';}}
async function handleRecovery(event){event.preventDefault();const password=document.getElementById('agendaRecoveryPassword').value,confirm=document.getElementById('agendaRecoveryConfirm').value;if(password.length<10){accessStatus.textContent='Choose a password with at least 10 characters.';return;}if(password!==confirm){accessStatus.textContent='Those passwords do not match yet.';return;}try{await updateCurrentPassword(password);recoveryMode=false;const url=new URL(window.location.href);url.searchParams.delete('eventPassRecovery');history.replaceState({},'',url);accessStatus.textContent='Your password is updated.';await refreshViewer();await refreshEvents();render();if(activeAccessEventId){const selected=eventById(activeAccessEventId);if(selected?.access?.mode==='ticket'&&!selected?.access?.entitled)await checkTicket(activeAccessEventId,{openAfter:true,occurrenceId:activeAccessOccurrenceId||params.get('occurrence')||''});else await finishAuthenticatedAccess(activeAccessEventId);}closeAccessModal();}catch(error){accessStatus.textContent=error?.message||'Your password could not be updated.';}}

function bindActions(){
  list.querySelectorAll('[data-ticket-buy]').forEach(link=>link.addEventListener('click',()=>{try{localStorage.setItem('flowtel:pendingEventTicket',String(link.dataset.ticketBuy||''));}catch(_){ }}));
  list.querySelectorAll('[data-save-event]').forEach(button=>button.addEventListener('click',()=>saveSeat(button.dataset.saveEvent,button.dataset.occurrenceId||'')));
  list.querySelectorAll('[data-open-event]').forEach(button=>button.addEventListener('click',()=>openEventRoom(button.dataset.openEvent,button.dataset.occurrenceId||'')));
  list.querySelectorAll('[data-check-ticket]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;const original=button.textContent;button.textContent='Checking…';try{await checkTicket(button.dataset.checkTicket,{openAfter:true,occurrenceId:button.dataset.occurrenceId||''});}catch(error){status.textContent=error?.message||'Ticket could not be checked.';}finally{button.disabled=false;button.textContent=original;}}));
  list.querySelectorAll('[data-access-event]').forEach(button=>button.addEventListener('click',()=>openAccessModal(button.dataset.accessEvent,{occurrenceId:button.dataset.occurrenceId||''})));
}
function render(){const rows=visibleEvents();renderLiveAlert();if(embed){renderEmbed(rows.slice(0,4));return;}renderMonths(rows);if(!rows.length){list.innerHTML='';status.textContent='The next gathering has not been placed yet.';return;}status.textContent='';const groups=new Map();for(const event of rows){const key=monthKey(event);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}list.innerHTML=[...groups.entries()].map(([key,monthEvents])=>`<section class="agenda-month" id="month-${esc(key)}"><header><p class="eyebrow">${esc(monthLabel(key))}</p></header><div class="agenda-month-events">${monthEvents.map(event=>card(event)).join('')}</div></section>`).join('');bindActions();}
function countdown(ms){const sec=Math.max(0,Math.floor(ms/1000)),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}
function joinEventLabel(event){return({workshop:'JOIN WORKSHOP',ceremony:'JOIN CEREMONY',call:'JOIN CALL',other:'OPEN EVENT'})[String(event?.event_type||'').toLowerCase()]||'OPEN EVENT';}
function renderLiveAlert(){
  if(embed||!isAuthenticated()||!liveAlert)return;
  const now=Date.now(),windowStart=now-5*60000,windowEnd=now+60*60000,candidates=[];
  events.filter(e=>e.is_registered&&e.status==='published').forEach(e=>{
    const moments=e.event_format==='recurring'?eventOccurrences(e).filter(item=>item.is_registered):e.event_format==='series'?eventOccurrences(e):[e];
    moments.forEach(occurrence=>{const startAt=new Date(occurrence.starts_at).getTime(),liveAt=new Date(occurrence.live_room_starts_at||occurrence.starts_at).getTime();const separate=Number.isFinite(startAt)&&Number.isFinite(liveAt)&&Math.abs(liveAt-startAt)>=60000;if(separate&&startAt>=windowStart&&startAt<=windowEnd)candidates.push({e,occurrence,at:startAt,phase:'event'});const roomAt=Number.isFinite(liveAt)?liveAt:startAt;if(Number.isFinite(roomAt)&&roomAt>=windowStart&&roomAt<=windowEnd)candidates.push({e,occurrence,at:roomAt,phase:separate?'live':'event-live'});});
  });
  const next=candidates.sort((a,b)=>a.at-b.at)[0];
  if(!next){liveAlert.hidden=true;return;}
  const remaining=next.at-now,started=remaining<=0,isLive=next.phase==='live'||next.phase==='event-live';
  const action=isLive?joinEventLabel(next.e):'OPEN EVENT';
  const statusCopy=next.phase==='live'?'live gathering': 'event';
  liveAlert.hidden=false;
  liveAlert.innerHTML=`<div><strong>${esc(next.e.title)} ${started?`${esc(statusCopy)} is starting now.`:`${esc(statusCopy)} starts in <span data-event-countdown>${esc(countdown(remaining))}</span>`}</strong><span>Your registered event room is ready.</span></div><button type="button" data-live-open-event="${esc(next.e.event_id)}">${esc(action)}</button>`;
  liveAlert.querySelector('[data-live-open-event]')?.addEventListener('click',()=>openEventRoom(next.e.event_id));
}
function setAudience(value){audience=value;filters.querySelectorAll('[data-audience]').forEach(button=>button.classList.toggle('is-active',button.dataset.audience===value));render();}
filters.querySelectorAll('[data-audience]').forEach(button=>button.addEventListener('click',()=>setAudience(button.dataset.audience)));

async function verifyPendingAgendaTicket(){
  if(!isAuthenticated())return null;let eventId='';try{eventId=String(localStorage.getItem('flowtel:pendingEventTicket')||'').trim();}catch(_){return null;}
  if(!eventId)return null;const event=eventById(eventId);if(!event||memberAccess(event)?.mode!=='ticket'||memberAccess(event)?.entitled){try{localStorage.removeItem('flowtel:pendingEventTicket');}catch(_){ }return null;}
  try{const result=await checkTicket(eventId,{openAfter:false});if(result?.paid||result?.revoked){try{localStorage.removeItem('flowtel:pendingEventTicket');}catch(_){ }}return result;}catch(error){console.warn('Pending event ticket could not be verified yet.',error);return null;}
}
async function handlePendingDoorway(){
  if(embed)return;const claimId=params.get('claimEvent')||'',saveId=params.get('saveEvent')||'',openId=params.get('openEvent')||'',occurrenceId=params.get('occurrence')||'',targetId=claimId||saveId||openId;
  if(params.get('enter')==='1'&&isAuthenticated()&&!targetId){const candidates=events.filter(e=>e.is_registered||eventOccurrences(e).some(o=>o.is_registered)).map(e=>({event:e,occurrence:e.event_format==='recurring'?nextRegisteredOccurrence(e):nextOccurrence(e)})).sort((a,b)=>new Date(a.occurrence?.starts_at||a.event.starts_at)-new Date(b.occurrence?.starts_at||b.event.starts_at));if(candidates[0]){await openEventRoom(candidates[0].event.event_id,candidates[0].occurrence?.occurrence_id||'');return;}}
  if(recoveryMode){activeAccessEventId=targetId;openAccessModal(targetId,{recovery:true,occurrenceId});return;}
  if(openId){if(isAuthenticated())await openEventRoom(openId,occurrenceId);else openAccessModal(openId,{occurrenceId});return;}
  if(claimId||saveId){const id=claimId||saveId,event=eventById(id);if(isAuthenticated()){try{if(event?.access?.mode==='ticket'&&!event?.access?.entitled)await checkTicket(id,{openAfter:true,occurrenceId});else{await saveSeat(id,occurrenceId);await openEventRoom(id,occurrenceId);}}catch(error){status.textContent=error?.message||'Your seat could not be claimed.';}}else openAccessModal(id,{occurrenceId});}
}
async function load(){status.textContent='Opening upcoming events…';try{await refreshViewer();await refreshEvents();updateNavigation();render();if(!embed){await verifyPendingAgendaTicket();countdownTimer=setInterval(renderLiveAlert,1000);await handlePendingDoorway();}}catch(error){events=[];render();status.textContent=error?.message||'Upcoming events could not open just now.';}}

signInForm?.addEventListener('submit',handleSignIn);createPassForm?.addEventListener('submit',handleCreatePass);recoveryForm?.addEventListener('submit',handleRecovery);document.getElementById('agendaForgotPassword')?.addEventListener('click',handleForgotPassword);
document.querySelectorAll('[data-access-tab]').forEach(button=>button.addEventListener('click',()=>setAccessTab(button.dataset.accessTab)));
document.querySelectorAll('[data-close-event-room]').forEach(node=>node.addEventListener('click',closeEventRoom));document.querySelectorAll('[data-close-access]').forEach(node=>node.addEventListener('click',closeAccessModal));
onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){viewerUser=session?.user||viewerUser;recoveryMode=true;window.setTimeout(()=>openAccessModal(params.get('claimEvent')||activeAccessEventId,{recovery:true,occurrenceId:params.get('occurrence')||activeAccessOccurrenceId||''}),0);}});
if(embed){document.body.classList.add('is-embed');hero.hidden=true;shell.classList.add('is-embed-shell');}
window.addEventListener('beforeunload',()=>{if(countdownTimer)clearInterval(countdownTimer);embedResizeObserver?.disconnect();});
load();
