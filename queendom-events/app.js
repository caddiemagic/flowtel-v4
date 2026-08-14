import {
  getQueendomEventJoinDetails,
  listPublicQueendomEvents,
  listQueendomEvents,
  setQueendomEventRegistration,
  verifyQueendomEventTicket,
} from '/shared/queendom-events.js?v=0.10.85';
import { getCurrentProfile } from '/shared/profiles.js?v=0.10.85';
import { getMyProductAccess } from '/shared/product-access.js?v=0.10.85';
import {
  createAccountWithEmail,
  getCurrentUser,
  onAuthStateChange,
  sendPasswordResetEmail,
  signInWithEmail,
  updateCurrentPassword,
} from '/shared/auth.js?v=0.10.85';

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
let activeAccessEventId='';
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
function futureEvent(event){const end=event.ends_at||event.live_room_starts_at||event.starts_at;if(end){const stamp=new Date(end).getTime();if(Number.isFinite(stamp))return stamp>=Date.now()-3600000;}return String(event.event_date||'')>=new Date().toISOString().slice(0,10);}
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
function publicEventPageUrl(event,key='claimEvent'){const target=new URL('/queendom-events/',window.location.origin);target.searchParams.set(key,event.event_id);return target.toString();}
function flowtelRegistrationUrl(event){const target=new URL('/client/',window.location.origin);target.searchParams.set('lounge','1');target.searchParams.set('saveEvent',event.event_id);target.searchParams.set('eventReturn','1');target.hash='my-upcoming-events';return target.toString();}
function actionMarkup(event){
  if(event.status==='cancelled')return'<span class="agenda-cancelled">CANCELLED</span>';
  const access=isAuthenticated()?memberAccess(event):publicAccess(event);
  if(isAuthenticated()&&event.is_registered)return `<button type="button" class="agenda-seat is-saved" data-open-event="${esc(event.event_id)}">✓ SEAT SAVED · OPEN EVENT</button>`;
  if(access?.entitled||access?.mode==='included'){
    if(isAuthenticated())return `<button type="button" class="agenda-seat" data-save-event="${esc(event.event_id)}">SAVE MY SEAT</button>`;
    return `<a class="agenda-seat" href="${esc(flowtelRegistrationUrl(event))}" target="_top">SAVE MY SEAT</a>`;
  }
  if(access?.mode==='ticket'&&access?.ticket_url){
    const price=money(access.price,access.currency||event.access_currency);
    if(embed){return `<div class="agenda-ticket-actions"><a class="agenda-seat" href="${esc(access.ticket_url)}" target="_top">BUY TICKET${price?` · ${esc(price)}`:''}</a><a class="agenda-check-ticket agenda-access-ticket-link" href="${esc(publicEventPageUrl(event))}" target="_top">Already have a ticket? Access event</a></div>`;}
    return `<div class="agenda-ticket-actions"><a class="agenda-seat" href="${esc(access.ticket_url)}" target="_top" data-ticket-buy="${esc(event.event_id)}">BUY TICKET${price?` · ${esc(price)}`:''}</a>${isAuthenticated()?`<button type="button" class="agenda-check-ticket" data-check-ticket="${esc(event.event_id)}">Already purchased? Check my ticket</button>`:`<button type="button" class="agenda-check-ticket" data-access-event="${esc(event.event_id)}">Already have a ticket? Access event</button>`}</div>`;
  }
  return'<span class="agenda-unavailable">NOT INCLUDED WITH THIS ACCESS</span>';
}
function card(event,{featured=false,compact=false}={}){const image=event.image_url?`<img src="${esc(event.image_url)}" alt="">`:'<span class="agenda-art-placeholder" aria-hidden="true">✦</span>';const flowfm=event.audience==='flowfm',cancelled=event.status==='cancelled',description=event.description?`<p class="agenda-description">${esc(event.description)}</p>`:'';return `<article class="agenda-event ${flowfm?'is-flowfm':'is-queendom'} ${cancelled?'is-cancelled':''} ${featured?'is-featured':''} ${compact?'is-embed-compact':''}"><div class="agenda-date" aria-label="${esc(detailedDate(event.event_date))}"><span>${esc(monthAbbr(event.event_date))}</span><strong>${esc(dayNumber(event.event_date))}</strong></div><div class="agenda-art">${image}</div><div class="agenda-copy"><div class="agenda-chips"><span>${esc(eventType(event.event_type))}</span><span class="${flowfm?'flowfm-chip':''}">${esc(audienceLabel(event.audience))}</span></div><h2>${esc(event.title)}</h2><p class="agenda-when"><strong>${esc(detailedDate(event.event_date))}</strong></p>${timeStack(event)}${hostMarkup(event)}${description}</div><div class="agenda-actions">${actionMarkup(event)}</div></article>`;}
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

async function saveSeat(eventId){
  status.textContent='Saving your seat…';
  try{await setQueendomEventRegistration(eventId,true);await refreshEvents();render();status.textContent='Your seat is saved.';}catch(error){status.textContent=error?.message||'Your seat could not be saved.';}
}
async function checkTicket(eventId,{openAfter=true}={}){
  status.textContent='Checking your ticket…';
  const result=await verifyQueendomEventTicket(eventId);
  status.textContent=result.message||'Ticket checked.';
  if(result.paid){await refreshEvents();render();if(openAfter)await openEventRoom(eventId);}
  return result;
}
function attendeeHostLine(detail){const host=detail.host_name?esc(detail.host_name):'';const co=detail.co_host_name?esc(detail.co_host_name):'';return host||co?`<p class="agenda-event-room-host">Hosted by ${host}${host&&co?' + ':''}${co}</p>`:'';}
function eventRoomTimes(detail){const memberZone=viewerZone()&&viewerZone()!==FLOWTEL_ZONE?viewerZone():null;const start=detail.starts_at,live=detail.live_room_starts_at||start;const liveDiff=new Date(live).getTime()!==new Date(start).getTime();return `<div class="agenda-event-room-times"><div><span>FLOWTEL TIME</span><strong>${esc(timeInZone(start,FLOWTEL_ZONE,{includeDate:true}))}</strong>${memberZone?`<small>YOUR TIME — ${esc(timeInZone(start,memberZone,{includeDate:true}))}</small>`:''}</div>${liveDiff?`<div><span>LIVE ROOM OPENS</span><strong>${esc(timeInZone(live,FLOWTEL_ZONE,{includeDate:true}))}</strong>${memberZone?`<small>YOUR TIME — ${esc(timeInZone(live,memberZone,{includeDate:true}))}</small>`:''}</div>`:''}</div>`;}
async function openEventRoom(eventId){
  if(!isAuthenticated()){openAccessModal(eventId);return;}
  eventRoom.hidden=false;eventRoom.setAttribute('aria-hidden','false');document.body.classList.add('agenda-modal-open');eventRoomStatus.textContent='Opening your event room…';eventRoomContent.innerHTML='';
  try{
    const event=eventById(eventId);
    if(event?.access?.mode==='ticket'){const ticket=await verifyQueendomEventTicket(eventId);if(!ticket?.paid)throw new Error(ticket?.message||'Your paid ticket could not be confirmed.');}
    const detail=await getQueendomEventJoinDetails(eventId);const zoom=detail.zoom_url?`<a class="agenda-primary-action" href="${esc(detail.zoom_url)}" target="_blank" rel="noopener">JOIN ZOOM</a>${detail.zoom_passcode?`<p class="agenda-passcode"><b>Passcode:</b> ${esc(detail.zoom_passcode)}</p>`:''}`:'';const location=detail.private_location?`<section class="agenda-event-room-section"><p class="eyebrow">WHERE TO GO</p><p>${esc(detail.private_location).replace(/\n/g,'<br>')}</p></section>`:'';const guide=detail.attendee_guide_url?`<a class="agenda-secondary-action" href="${esc(detail.attendee_guide_url)}" target="_blank" rel="noopener">DOWNLOAD YOUR HOW TO PREPARE GUIDE</a>`:'';
    eventRoomContent.innerHTML=`<p class="eyebrow">YOUR REGISTERED EVENT</p><h2 id="agendaEventRoomTitle">${esc(detail.title)}</h2><p class="agenda-event-room-date">${esc(detailedDate(detail.event_date))}</p>${eventRoomTimes(detail)}${attendeeHostLine(detail)}<p class="agenda-recording"><b>Will this be recorded?</b> ${detail.will_be_recorded?'Yes':'No'}</p>${detail.description?`<p class="agenda-event-room-description">${esc(detail.description)}</p>`:''}<section class="agenda-event-room-section"><p class="eyebrow">HOW TO PREPARE</p><p>${esc(detail.how_to_prepare||'Find a private space. Light a candle + incense. Make tea. Grab a journal + pen.').replace(/\n/g,'<br>')}</p>${guide}</section>${location}<div class="agenda-event-room-actions">${zoom}</div>`;
    eventRoomStatus.textContent='';
  }catch(error){eventRoomStatus.textContent=error?.message||'This event room could not open just now.';}
}
function closeEventRoom(){eventRoom.hidden=true;eventRoom.setAttribute('aria-hidden','true');document.body.classList.remove('agenda-modal-open');}

function setAccessTab(name){
  document.querySelectorAll('[data-access-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.accessTab===name));
  signInForm.hidden=name!=='signin';createPassForm.hidden=name!=='create';recoveryForm.hidden=name!=='recovery';
}
function openAccessModal(eventId,{tab='signin',recovery=false}={}){
  activeAccessEventId=String(eventId||activeAccessEventId||'');const event=eventById(activeAccessEventId);const publicTicket=event?.public_access==='ticket';
  accessModal.hidden=false;accessModal.setAttribute('aria-hidden','false');document.body.classList.add('agenda-modal-open');accessTitle.textContent=event?`Access ${event.title}.`:'Access your event.';accessIntro.textContent=publicTicket?'Sign in with an existing Flowtel account, or create a limited Event Pass using the same email you used at checkout. Flowtel opens the private event room only after the paid Squarespace ticket is verified.':'Sign in with the Flowtel account connected to your membership.';accessStatus.textContent='';
  const createTab=document.querySelector('[data-access-tab="create"]');if(createTab)createTab.hidden=!publicTicket;
  setAccessTab(recovery?'recovery':tab);
}
function closeAccessModal(){accessModal.hidden=true;accessModal.setAttribute('aria-hidden','true');if(eventRoom.hidden)document.body.classList.remove('agenda-modal-open');}
async function finishAuthenticatedTicket(eventId){await refreshViewer();await checkTicket(eventId,{openAfter:true});updateNavigation();}

async function handleSignIn(event){
  event.preventDefault();const email=document.getElementById('agendaSignInEmail').value.trim().toLowerCase();const password=document.getElementById('agendaSignInPassword').value;
  accessStatus.textContent='Signing in…';
  try{await signInWithEmail(email,password);await refreshViewer();await refreshEvents();render();closeAccessModal();const selected=eventById(activeAccessEventId);if(selected?.access?.mode==='ticket'&&!selected?.access?.entitled)await checkTicket(activeAccessEventId,{openAfter:true});else if(selected?.access?.entitled||selected?.access?.mode==='included'){if(!selected.is_registered)await setQueendomEventRegistration(activeAccessEventId,true);await refreshEvents();render();await openEventRoom(activeAccessEventId);}updateNavigation();}
  catch(error){accessStatus.textContent=error?.message||'Flowtel could not sign you in.';}
}
async function handleCreatePass(event){
  event.preventDefault();const email=document.getElementById('agendaPassEmail').value.trim().toLowerCase();const password=document.getElementById('agendaPassPassword').value;const confirm=document.getElementById('agendaPassConfirm').value;
  if(password.length<10){accessStatus.textContent='Choose a password with at least 10 characters.';return;}if(password!==confirm){accessStatus.textContent='Those passwords do not match yet.';return;}
  accessStatus.textContent='Creating your private Event Pass…';
  try{
    const redirect=new URL('/queendom-events/',window.location.origin);redirect.searchParams.set('claimEvent',activeAccessEventId);
    const data=await createAccountWithEmail(email,password,{redirectTo:redirect.toString(),metadata:{source:'flowtel_event_pass',event_pass_only:true,event_id:activeAccessEventId,flowtel_password_chosen:true}});
    if(data?.session?.user){await finishAuthenticatedTicket(activeAccessEventId);closeAccessModal();return;}
    accessStatus.textContent='Check your email to confirm your Event Pass. After confirmation, Flowtel will verify the ticket purchased with this email and open the event when payment is confirmed.';
  }catch(error){accessStatus.textContent=error?.message||'Your Event Pass could not be created just now.';}
}
async function handleForgotPassword(){const email=document.getElementById('agendaSignInEmail').value.trim().toLowerCase();if(!email){accessStatus.textContent='Enter your email first, then choose Forgot your password?';return;}try{const redirect=new URL('/queendom-events/',window.location.origin);redirect.searchParams.set('eventPassRecovery','1');if(activeAccessEventId)redirect.searchParams.set('claimEvent',activeAccessEventId);await sendPasswordResetEmail(email,redirect.toString());accessStatus.textContent='Check your email for the Flowtel password reset link.';}catch(error){accessStatus.textContent=error?.message||'Flowtel could not send that reset email.';}}
async function handleRecovery(event){event.preventDefault();const password=document.getElementById('agendaRecoveryPassword').value,confirm=document.getElementById('agendaRecoveryConfirm').value;if(password.length<10){accessStatus.textContent='Choose a password with at least 10 characters.';return;}if(password!==confirm){accessStatus.textContent='Those passwords do not match yet.';return;}try{await updateCurrentPassword(password);recoveryMode=false;const url=new URL(window.location.href);url.searchParams.delete('eventPassRecovery');history.replaceState({},'',url);accessStatus.textContent='Your password is updated.';await refreshViewer();await refreshEvents();render();if(activeAccessEventId)await checkTicket(activeAccessEventId,{openAfter:true});closeAccessModal();}catch(error){accessStatus.textContent=error?.message||'Your password could not be updated.';}}

function bindActions(){
  list.querySelectorAll('[data-ticket-buy]').forEach(link=>link.addEventListener('click',()=>{try{localStorage.setItem('flowtel:pendingEventTicket',String(link.dataset.ticketBuy||''));}catch(_){ }}));
  list.querySelectorAll('[data-save-event]').forEach(button=>button.addEventListener('click',()=>saveSeat(button.dataset.saveEvent)));
  list.querySelectorAll('[data-open-event]').forEach(button=>button.addEventListener('click',()=>openEventRoom(button.dataset.openEvent)));
  list.querySelectorAll('[data-check-ticket]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;const original=button.textContent;button.textContent='Checking…';try{await checkTicket(button.dataset.checkTicket,{openAfter:true});}catch(error){status.textContent=error?.message||'Ticket could not be checked.';}finally{button.disabled=false;button.textContent=original;}}));
  list.querySelectorAll('[data-access-event]').forEach(button=>button.addEventListener('click',()=>openAccessModal(button.dataset.accessEvent)));
}
function render(){const rows=visibleEvents();renderLiveAlert();if(embed){renderEmbed(rows.slice(0,4));return;}renderMonths(rows);if(!rows.length){list.innerHTML='';status.textContent='The next gathering has not been placed yet.';return;}status.textContent='';const groups=new Map();for(const event of rows){const key=monthKey(event);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}list.innerHTML=[...groups.entries()].map(([key,monthEvents])=>`<section class="agenda-month" id="month-${esc(key)}"><header><p class="eyebrow">${esc(monthLabel(key))}</p></header><div class="agenda-month-events">${monthEvents.map(event=>card(event)).join('')}</div></section>`).join('');bindActions();}
function countdown(ms){const sec=Math.max(0,Math.floor(ms/1000)),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}
function joinEventLabel(event){return({workshop:'JOIN WORKSHOP',ceremony:'JOIN CEREMONY',call:'JOIN CALL',other:'OPEN EVENT'})[String(event?.event_type||'').toLowerCase()]||'OPEN EVENT';}
function renderLiveAlert(){
  if(embed||!isAuthenticated()||!liveAlert)return;
  const now=Date.now(),windowStart=now-5*60000,windowEnd=now+60*60000,candidates=[];
  events.filter(e=>e.is_registered&&e.status==='published').forEach(e=>{
    const startAt=new Date(e.starts_at).getTime(),liveAt=new Date(e.live_room_starts_at||e.starts_at).getTime();
    const separate=Number.isFinite(startAt)&&Number.isFinite(liveAt)&&Math.abs(liveAt-startAt)>=60000;
    if(separate&&startAt>=windowStart&&startAt<=windowEnd)candidates.push({e,at:startAt,phase:'event'});
    const roomAt=Number.isFinite(liveAt)?liveAt:startAt;
    if(Number.isFinite(roomAt)&&roomAt>=windowStart&&roomAt<=windowEnd)candidates.push({e,at:roomAt,phase:separate?'live':'event-live'});
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
  if(embed)return;const claimId=params.get('claimEvent')||'';const saveId=params.get('saveEvent')||'';const openId=params.get('openEvent')||'';const targetId=claimId||saveId||openId;
  if(recoveryMode){activeAccessEventId=targetId;openAccessModal(targetId,{recovery:true});return;}
  if(openId){if(isAuthenticated())await openEventRoom(openId);else openAccessModal(openId);return;}
  if(claimId){if(isAuthenticated()){try{await checkTicket(claimId,{openAfter:true});}catch(error){status.textContent=error?.message||'Your ticket could not be confirmed.';}}else openAccessModal(claimId);return;}
  if(saveId){const event=eventById(saveId);if(isAuthenticated()){try{if(event?.access?.mode==='ticket'&&!event?.access?.entitled)await checkTicket(saveId,{openAfter:true});else{await setQueendomEventRegistration(saveId,true);await refreshEvents();render();await openEventRoom(saveId);}}catch(error){status.textContent=error?.message||'Your seat could not be saved.';}}else if(event?.public_access==='ticket')openAccessModal(saveId);}
}
async function load(){status.textContent='Opening upcoming events…';try{await refreshViewer();await refreshEvents();updateNavigation();render();if(!embed){await verifyPendingAgendaTicket();countdownTimer=setInterval(renderLiveAlert,1000);await handlePendingDoorway();}}catch(error){events=[];render();status.textContent=error?.message||'Upcoming events could not open just now.';}}

signInForm?.addEventListener('submit',handleSignIn);createPassForm?.addEventListener('submit',handleCreatePass);recoveryForm?.addEventListener('submit',handleRecovery);document.getElementById('agendaForgotPassword')?.addEventListener('click',handleForgotPassword);
document.querySelectorAll('[data-access-tab]').forEach(button=>button.addEventListener('click',()=>setAccessTab(button.dataset.accessTab)));
document.querySelectorAll('[data-close-event-room]').forEach(node=>node.addEventListener('click',closeEventRoom));document.querySelectorAll('[data-close-access]').forEach(node=>node.addEventListener('click',closeAccessModal));
onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){viewerUser=session?.user||viewerUser;recoveryMode=true;window.setTimeout(()=>openAccessModal(params.get('claimEvent')||activeAccessEventId,{recovery:true}),0);}});
if(embed){document.body.classList.add('is-embed');hero.hidden=true;shell.classList.add('is-embed-shell');}
window.addEventListener('beforeunload',()=>{if(countdownTimer)clearInterval(countdownTimer);embedResizeObserver?.disconnect();});
load();
