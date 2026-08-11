import { listPublicQueendomEvents } from '/shared/queendom-events.js?v=0.10.84';
import { timezoneDisplayName } from '/shared/timezone-labels.js?v=0.10.83.1';

const shell=document.getElementById('agendaShell');
const hero=document.getElementById('agendaHero');
const filters=document.getElementById('agendaFilters');
const monthNav=document.getElementById('agendaMonths');
const list=document.getElementById('agendaList');
const status=document.getElementById('agendaStatus');
const params=new URLSearchParams(window.location.search);
const embed=params.get('embed')==='1';
let events=[];
let audience='all';
let embedResizeObserver=null;

function notifyEmbedHeight(){
  if(!embed||window.parent===window) return;
  const height=Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,shell?.scrollHeight||0));
  window.parent.postMessage({type:'flowtel:queendom-events-height',height},'*');
}
function watchEmbedHeight(){
  if(!embed) return;
  notifyEmbedHeight();
  if('ResizeObserver' in window){
    embedResizeObserver?.disconnect();
    embedResizeObserver=new ResizeObserver(()=>notifyEmbedHeight());
    embedResizeObserver.observe(shell);
  }
  list.querySelectorAll('img').forEach(image=>image.addEventListener('load',notifyEmbedHeight,{once:true}));
}

function esc(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));}
function eventDate(value){return new Date(`${value}T12:00:00Z`);}
function eventType(value){return ({workshop:'WORKSHOP',ceremony:'CEREMONY',call:'CALL',other:'EVENT'})[String(value||'').toLowerCase()]||'EVENT';}
function audienceLabel(value){return value==='flowfm'?'FLOW FM':'QUEENDOM';}
function formatClock(value){const match=/^(\d{2}):(\d{2})/.exec(String(value||''));if(!match)return'';const date=new Date(Date.UTC(2026,0,1,Number(match[1]),Number(match[2])));return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(date);}
function timeLabel(event){const start=formatClock(event.start_time);const end=formatClock(event.end_time);return end?`${start}–${end}`:start;}
function timezoneLabel(event){const date=/^\d{4}-\d{2}-\d{2}$/.test(String(event.event_date||''))?eventDate(event.event_date):new Date();return timezoneDisplayName(event.event_timezone||'America/Los_Angeles',date)||'Pacific Time';}
function monthKey(event){return String(event.event_date||'').slice(0,7);}
function monthLabel(key){const [year,month]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));}
function shortMonthLabel(key){const [year,month]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1))).toUpperCase();}
function detailedDate(value){return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(eventDate(value));}
function dayNumber(value){return String(Number(String(value||'').slice(-2))||'');}
function monthAbbr(value){return new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(eventDate(value)).toUpperCase();}
function futureEvent(event){const end=event.ends_at||event.starts_at;if(end){const timestamp=new Date(end).getTime();if(Number.isFinite(timestamp))return timestamp>=Date.now()-60*60*1000;}const today=new Date().toISOString().slice(0,10);return String(event.event_date||'')>=today;}
function eventRegistrationUrl(event){const target=new URL('/client/',window.location.origin);target.searchParams.set('membership','queendom');target.searchParams.set('lounge','1');target.searchParams.set('saveEvent',event.event_id);target.searchParams.set('eventReturn','1');target.hash='my-upcoming-events';return target.toString();}
function card(event,{featured=false,compact=false}={}){
  const image=event.image_url?`<img src="${esc(event.image_url)}" alt="">`:'<span class="agenda-art-placeholder" aria-hidden="true">✦</span>';
  const flowfm=event.audience==='flowfm';
  const cancelled=event.status==='cancelled';
  const description=event.description?`<p class="agenda-description">${esc(event.description)}</p>`:'';
  const host=event.host_name?`<p class="agenda-host">Hosted by ${esc(event.host_name)}</p>`:'';
  const action=cancelled
    ?'<span class="agenda-cancelled">CANCELLED</span>'
    :`<a class="agenda-seat" href="${esc(eventRegistrationUrl(event))}" target="_top">SAVE MY SEAT</a>`;
  return `<article class="agenda-event ${flowfm?'is-flowfm':'is-queendom'} ${cancelled?'is-cancelled':''} ${featured?'is-featured':''} ${compact?'is-embed-compact':''}">
    <div class="agenda-date" aria-label="${esc(detailedDate(event.event_date))}"><span>${esc(monthAbbr(event.event_date))}</span><strong>${esc(dayNumber(event.event_date))}</strong></div>
    <div class="agenda-art">${image}</div>
    <div class="agenda-copy">
      <div class="agenda-chips"><span>${esc(eventType(event.event_type))}</span><span class="${flowfm?'flowfm-chip':''}">${esc(audienceLabel(event.audience))}</span></div>
      <h2>${esc(event.title)}</h2>
      <p class="agenda-when"><strong>${esc(detailedDate(event.event_date))}</strong><span>${esc(timeLabel(event))} · ${esc(timezoneLabel(event))}</span></p>
      ${host}${description}
    </div>
    <div class="agenda-actions">${action}${flowfm&&!cancelled?'<small>Flow FM membership is required to enter the room.</small>':''}</div>
  </article>`;
}
function visibleEvents(){return events.filter(event=>futureEvent(event)&&event.status!=='draft'&&(audience==='all'||event.audience===audience));}
function renderMonths(rows){
  const keys=[...new Set(rows.map(monthKey).filter(Boolean))];
  monthNav.innerHTML=keys.map(key=>`<a href="#month-${esc(key)}">${esc(shortMonthLabel(key))}</a>`).join('');
  monthNav.hidden=keys.length<2;
}
function renderEmbed(rows){
  monthNav.hidden=true;filters.closest('.agenda-tools')?.setAttribute('hidden','');
  if(!rows.length){list.innerHTML='';status.textContent='The next gathering has not been placed yet.';window.requestAnimationFrame(notifyEmbedHeight);return;}
  status.textContent='';
  const featured=rows[0],upcoming=rows.slice(1,4);
  list.innerHTML=`<section class="agenda-embed-feed">
    <header class="agenda-embed-heading"><p class="eyebrow">UPCOMING EVENTS IN THE QUEENDOM</p><h2>There is always something happening here.</h2></header>
    <div class="agenda-embed-featured">${card(featured,{featured:true})}</div>
    ${upcoming.length?`<div class="agenda-embed-coming"><p class="eyebrow">COMING UP</p>${upcoming.map(event=>card(event,{compact:true})).join('')}</div>`:''}
    <a class="agenda-view-all" href="/queendom-events/" target="_top">VIEW ALL UPCOMING EVENTS</a>
  </section>`;
  window.requestAnimationFrame(watchEmbedHeight);
}
function render(){
  const rows=visibleEvents();
  if(embed){renderEmbed(rows.slice(0,4));return;}
  renderMonths(rows);
  if(!rows.length){list.innerHTML='';status.textContent='The next gathering has not been placed yet.';return;}
  status.textContent='';
  const groups=new Map();for(const event of rows){const key=monthKey(event);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}
  list.innerHTML=[...groups.entries()].map(([key,monthEvents])=>`<section class="agenda-month" id="month-${esc(key)}"><header><p class="eyebrow">${esc(monthLabel(key))}</p></header><div class="agenda-month-events">${monthEvents.map(event=>card(event)).join('')}</div></section>`).join('');
}
function setAudience(value){audience=value;filters.querySelectorAll('[data-audience]').forEach(button=>button.classList.toggle('is-active',button.dataset.audience===value));render();}
filters.querySelectorAll('[data-audience]').forEach(button=>button.addEventListener('click',()=>setAudience(button.dataset.audience)));
async function load(){
  status.textContent='Opening upcoming events…';
  try{events=await listPublicQueendomEvents({monthCount:12});render();}
  catch(error){events=[];render();status.textContent=error?.message||'Upcoming events could not open just now.';}
}
if(embed){document.body.classList.add('is-embed');hero.hidden=true;shell.classList.add('is-embed-shell');}
load();
