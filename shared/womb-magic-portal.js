import {
  loadWombMagicPortal,
  loadWombMagicPortalDates,
  loadWombMagicPortalTimes,
  bookWombMagicPortalSession,
  rescheduleWombMagicPortalSession,
  cancelWombMagicPortalSession,
} from '/shared/acuity-scheduling.js?v=0.10.87';
import { normalizeTimezone, timezoneDisplayName, timezoneShortName } from '/shared/timezone-labels.js?v=0.10.83';

function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function pad(value){return String(value).padStart(2,'0');}
function dateValue(item){return String(item?.date||item?.day||item||'').slice(0,10);}
function slotValue(item){return String(item?.time||item?.datetime||item?.value||item||'');}

export function mountWombMagicPortal(root=document.getElementById('wombMagicPortalCard')){
  if(!root)return {refresh:async()=>{}};
  if(root.__flowtelWombMagicPortal)return root.__flowtelWombMagicPortal;
  const toggle=root.querySelector('[data-wmp-toggle]');
  const panel=root.querySelector('[data-wmp-panel]');
  const close=root.querySelector('[data-wmp-close]');
  const status=root.querySelector('[data-wmp-status]');
  const summary=root.querySelector('[data-wmp-summary]');
  const providersEl=root.querySelector('[data-wmp-providers]');
  const month=root.querySelector('[data-wmp-month]');
  const datesEl=root.querySelector('[data-wmp-dates]');
  const consent=root.querySelector('[data-wmp-consent]');
  const consentCopy=root.querySelector('[data-wmp-consent-copy]');
  const consentCheck=root.querySelector('[data-wmp-consent-check]');
  const phone=root.querySelector('[data-wmp-phone]');
  const book=root.querySelector('[data-wmp-book]');
  let data=null,providerId='',selectedSlot=null,rescheduling=null,dateRequest=0,timeRequest=0;
  const now=new Date();
  if(month&&!month.value)month.value=`${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const zone=()=>normalizeTimezone(data?.member_timezone);
  const setStatus=(text='')=>{if(status)status.textContent=text;};
  function callTime(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value||'');return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:zone()}).format(d);}
  function timeOnly(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value||'');const t=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone()}).format(d);const z=timezoneShortName(zone(),d);return `${t}${z?` ${z}`:''}`;}
  function portalRemaining(){return Math.max(0,4-(data?.portal?.sessions||[]).filter(s=>['pending','scheduled','rescheduled','completed'].includes(String(s.status))).length);}
  function renderSummary(){
    if(!summary)return;
    const portal=data?.portal;
    if(!portal){summary.innerHTML='<p class="eyebrow">4-WEEK WOMB MAGIC PORTAL</p><h4>Choose one weekly time. Flowtel schedules all four calls.</h4><p>Four private 45-minute sessions with the same Flow FM Priestess across one 28-day Portal. If one week needs to move, that session can be rescheduled without changing the other three.</p>';return;}
    const sessions=portal.sessions||[];
    const end=new Date(portal.active_until);
    const endText=Number.isNaN(end.getTime())?'':new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:zone()}).format(end);
    const first=sessions.find(s=>['pending','scheduled','rescheduled','completed'].includes(String(s.status)));
    const standing=first?callTime(first.starts_at):'';
    summary.innerHTML=`<p class="eyebrow">YOUR 4-WEEK WOMB MAGIC PORTAL</p><h4>${esc(portal.practitioner_name||'Your Flow FM Priestess')}</h4><p>${sessions.filter(s=>['pending','scheduled','rescheduled','completed'].includes(String(s.status))).length} of 4 sessions scheduled · Portal open through ${esc(endText)}</p>${standing?`<p class="wmp-standing-time"><strong>Your standing weekly time began:</strong> ${esc(standing)}. Individual weeks can be rescheduled without moving the rest of the Portal.</p>`:''}<div class="wmp-session-list">${sessions.filter(s=>!['failed'].includes(String(s.status))).map(s=>`<article><span>SESSION ${esc(s.session_number)}</span><strong>${esc(callTime(s.starts_at))}</strong><em>${esc(String(s.status||'').toUpperCase())}</em><div>${s.meeting_url?`<a href="${esc(s.meeting_url)}" target="_blank" rel="noopener noreferrer">JOIN ZOOM</a>`:''}${['scheduled','rescheduled'].includes(String(s.status))?`<button type="button" data-wmp-reschedule="${esc(s.id)}">Reschedule</button><button type="button" data-wmp-cancel="${esc(s.id)}">Cancel</button>`:''}</div></article>`).join('')}</div>`;
    summary.querySelectorAll('[data-wmp-reschedule]').forEach(btn=>btn.addEventListener('click',()=>beginReschedule(sessions.find(s=>s.id===btn.dataset.wmpReschedule))));
    summary.querySelectorAll('[data-wmp-cancel]').forEach(btn=>btn.addEventListener('click',()=>cancelSession(btn.dataset.wmpCancel)));
  }
  function renderProviders(){
    if(!providersEl)return;
    const locked=data?.portal;
    const providers=data?.providers||[];
    if(locked){providersEl.innerHTML=`<div class="wmp-locked-priestess"><span>YOUR PRIESTESS FOR THIS PORTAL</span><strong>${esc(locked.practitioner_name||'Flowtel Priestess')}</strong><small>The same Priestess holds all four sessions.</small></div>`;providerId=locked.provider_id;return;}
    providersEl.innerHTML=providers.length?providers.map(p=>`<button type="button" class="wm-mentor-card ${providerId===p.provider_id?'active':''}" data-wmp-provider="${esc(p.provider_id)}"><img src="${esc(p.photo_url||'/assets/flowtel-pinkrose.png')}" alt=""><span class="wm-mentor-copy"><strong>${esc(p.display_name)}</strong>${p.location?`<small>${esc(p.location)}</small>`:''}<small>Available for one 4-week client</small></span></button>`).join(''):'<p class="wm-empty-copy">All currently mapped Priestesses are holding a Portal client right now. Please return when a Portal opens.</p>';
    providersEl.querySelectorAll('[data-wmp-provider]').forEach(btn=>btn.addEventListener('click',()=>{providerId=btn.dataset.wmpProvider;renderProviders();void loadDates();}));
  }
  function render(){
    renderSummary();renderProviders();
    const remaining=portalRemaining();
    if(toggle){toggle.hidden=Boolean(data?.portal&&remaining===0);toggle.textContent=data?.portal?'Schedule Replacement Session':'Choose My Weekly Portal Time';}
    if(data?.portal&&remaining===0)setStatus('All four Portal sessions are scheduled.');else setStatus('');
  }
  async function refresh({silent=false}={}){
    try{if(!silent)setStatus('Preparing your Portal…');data=await loadWombMagicPortal();providerId=data?.portal?.provider_id||'';render();return data;}catch(error){setStatus(error?.message||'The Womb Magic Portal could not be opened.');return null;}
  }
  async function open(){if(panel){panel.hidden=false;panel.setAttribute('aria-hidden','false');}toggle?.setAttribute('aria-expanded','true');if(!data)await refresh();renderProviders();if(providerId)await loadDates();panel?.scrollIntoView({behavior:'smooth',block:'nearest'});}
  function shut(){if(panel){panel.hidden=true;panel.setAttribute('aria-hidden','true');}toggle?.setAttribute('aria-expanded','false');selectedSlot=null;rescheduling=null;if(consent)consent.hidden=true;}
  async function loadDates(){
    if(!providerId||!month?.value)return;
    const request=++dateRequest;datesEl.innerHTML='<p class="wm-loading-copy">Gathering Portal dates…</p>';setStatus('');
    try{const result=await loadWombMagicPortalDates({month:month.value,provider_id:providerId,timezone:zone()});if(request!==dateRequest)return;const dates=[...new Set((result.dates||[]).map(dateValue).filter(Boolean))];datesEl.innerHTML=dates.length?dates.map(d=>`<article class="wm-date-option"><button type="button" class="wm-date-button" data-wmp-date="${esc(d)}">${esc(new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`)))}</button><section class="wm-date-detail" data-wmp-date-detail="${esc(d)}" hidden><div class="womb-magic-time-grid" data-wmp-times="${esc(d)}"></div></section></article>`).join(''):'<p class="wm-empty-copy">No Portal appointments are available in this month.</p>';datesEl.querySelectorAll('[data-wmp-date]').forEach(btn=>btn.addEventListener('click',()=>loadTimes(btn.dataset.wmpDate)));}catch(error){datesEl.innerHTML='';setStatus(error?.message||'Portal dates could not be opened.');}
  }
  async function loadTimes(date){
    const request=++timeRequest;datesEl.querySelectorAll('[data-wmp-date-detail]').forEach(el=>el.hidden=el.dataset.wmpDateDetail!==date);const target=datesEl.querySelector(`[data-wmp-times="${CSS.escape(date)}"]`);if(!target)return;target.innerHTML='<p class="wm-loading-copy">Finding times…</p>';
    try{const result=await loadWombMagicPortalTimes({date,provider_id:providerId,timezone:zone(),ignore_appointment_id:rescheduling?.acuity_appointment_id});if(request!==timeRequest)return;const slots=result.times||[];const initialSeries=!data?.portal&&!rescheduling;target.innerHTML=slots.length?slots.map((slot,i)=>`<button type="button" class="wm-time-button" data-wmp-slot="${i}"><strong>${esc(timeOnly(slotValue(slot)))}</strong>${initialSeries?'<small>Same time weekly · all 4 sessions</small>':''}</button>`).join(''):initialSeries?'<p class="wm-empty-copy">No same-time weekly Portal opening begins on this date. Try another date.</p>':'<p class="wm-empty-copy">No times remain on this date.</p>'; target.__slots=slots;target.querySelectorAll('[data-wmp-slot]').forEach(btn=>btn.addEventListener('click',()=>selectSlot(slots[Number(btn.dataset.wmpSlot)],btn,target)));}catch(error){target.innerHTML='';setStatus(error?.message||'Portal times could not be opened.');}
  }
  function selectSlot(slot,button,target){selectedSlot=slot;target.querySelectorAll('[data-wmp-slot]').forEach(el=>el.classList.toggle('active',el===button));if(consentCopy)consentCopy.textContent=data?.service?.consent_language||'';if(consent)consent.hidden=false;if(consentCheck)consentCheck.checked=false;if(book){book.disabled=true;book.textContent=rescheduling?'Confirm New Time':data?.portal?'Book Replacement Session':'Consent + Schedule All 4 Sessions';}consent?.scrollIntoView({behavior:'smooth',block:'nearest'});}
  async function submit(){if(!selectedSlot||!providerId)return;try{book.disabled=true;setStatus(rescheduling?'Rescheduling your Portal session…':data?.portal?'Booking your replacement Portal session…':'Scheduling all four weekly Portal sessions…');if(rescheduling)await rescheduleWombMagicPortalSession({appointment_id:rescheduling.id,datetime:slotValue(selectedSlot),timezone:zone()});else await bookWombMagicPortalSession({provider_id:providerId,datetime:slotValue(selectedSlot),timezone:zone(),phone:phone?.value||'',consent:true});selectedSlot=null;rescheduling=null;data=null;await refresh();shut();}catch(error){setStatus(error?.message||'This Portal session could not be booked.');book.disabled=false;}}
  function beginReschedule(session){if(!session)return;rescheduling=session;providerId=data?.portal?.provider_id||session.provider_id;open().then(()=>setStatus(`Choose a new time for Portal Session ${session.session_number}.`));}
  async function cancelSession(id){if(!window.confirm('Cancel this Portal session? Your four-week Portal will remain open and you can schedule a replacement session inside the same 28-day window.'))return;try{setStatus('Cancelling this Portal session…');await cancelWombMagicPortalSession(id);data=null;await refresh();}catch(error){setStatus(error?.message||'This Portal session could not be cancelled.');}}
  toggle?.addEventListener('click',()=>panel?.hidden?open():shut());close?.addEventListener('click',shut);month?.addEventListener('change',()=>void loadDates());consentCheck?.addEventListener('change',()=>{if(book)book.disabled=!consentCheck.checked;});book?.addEventListener('click',submit);
  const api={refresh,open,close:shut};root.__flowtelWombMagicPortal=api;return api;
}
