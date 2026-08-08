import {
  loadWombMagicScheduling,
  loadWombMagicDates,
  loadWombMagicTimes,
  bookWombMagicCall,
  rescheduleWombMagicCall,
  cancelWombMagicCall,
} from '/shared/acuity-scheduling.js?v=0.10.83';
import { normalizeTimezone, timezoneDisplayName, timezoneShortName } from '/shared/timezone-labels.js?v=0.10.83';

function escapeHtml(value){
  return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}

function pad(value){return String(value).padStart(2,'0');}
function dateValue(item){return String(item?.date||item?.day||item||'').slice(0,10);}
function slotValue(item){return String(item?.time||item?.datetime||item?.value||item||'');}
function activeAppointment(appointments=[]){
  const now=Date.now();
  return appointments.find(item=>['pending','scheduled','rescheduled'].includes(String(item?.status||'')) && new Date(item?.ends_at||item?.starts_at).getTime()>now)||null;
}

export function mountWombMagicBooking(root=document.getElementById('wombMagicSuiteCard')){
  if(!root) return {refresh:async()=>{},open:async()=>{},close:()=>{}};
  if(root.__flowtelWombMagic) return root.__flowtelWombMagic;

  const toggle=root.querySelector('[data-wm-toggle]');
  const summary=root.querySelector('[data-wm-summary]');
  const panel=root.querySelector('[data-wm-panel]');
  const closeButton=root.querySelector('[data-wm-close]');
  const message=root.querySelector('[data-wm-message]');
  const currentCall=root.querySelector('[data-wm-current-call]');
  const experience=root.querySelector('[data-wm-experience]');
  const gate=root.querySelector('[data-wm-gate]');
  const mentorGrid=root.querySelector('[data-wm-mentor-grid]');
  const monthInput=root.querySelector('[data-wm-month]');
  const dateGrid=root.querySelector('[data-wm-date-grid]');
  const consentCard=root.querySelector('[data-wm-consent]');
  const consentCopy=root.querySelector('[data-wm-consent-copy]');
  const consentInput=root.querySelector('[data-wm-consent-input]');
  const bookButton=root.querySelector('[data-wm-book]');
  const firstAvailableButton=root.querySelector('[data-wm-first-available]');
  const choosePriestessButton=root.querySelector('[data-wm-choose-priestess]');
  const phoneInput=root.querySelector('[data-wm-phone]');

  let data=null;
  let providerId='';
  let selectedSlot=null;
  let selectedDate='';
  let rescheduling=null;
  let loadingPromise=null;
  let autoOpened=false;
  let datesRequest=0;
  let timesRequest=0;
  let refreshTimer=null;

  const now=new Date();
  if(monthInput&&!monthInput.value) monthInput.value=`${now.getFullYear()}-${pad(now.getMonth()+1)}`;

  function setMessage(text=''){if(message)message.textContent=text;}
  function memberTimezone(){return normalizeTimezone(data?.member_timezone);}
  function formatDate(value,{withTime=true,weekday=true,long=false}={}){
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return String(value||'');
    const options=withTime
      ? {month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:memberTimezone(),...(weekday?{weekday:'long'}:{})}
      : {month:long?'long':'short',day:'numeric',timeZone:'UTC',...(weekday?{weekday:long?'long':'short'}:{})};
    return new Intl.DateTimeFormat('en-US',options).format(date);
  }
  function formatCallTime(value){
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    const zone=memberTimezone();
    const dateLine=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:zone}).format(date);
    const timeLine=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone}).format(date);
    const short=timezoneShortName(zone,date);
    return {dateLine,timeLine:`${timeLine}${short?` ${short}`:''}`};
  }
  function formatTimeOnly(value){
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value||'');
    const zone=memberTimezone();
    const time=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone}).format(date);
    const short=timezoneShortName(zone,date);
    return `${time}${short?` ${short}`:''}`;
  }
  function meetingAction(call,label='Join Zoom'){
    if(!call?.meeting_url)return '';
    return `<a class="wm-enter-womb-magic" href="${escapeHtml(call.meeting_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  }
  function providerForSlot(item){
    if(item?.provider_id) return data?.providers?.find(provider=>provider.provider_id===item.provider_id)||null;
    const calendar=String(item?.calendarID||item?.calendar_id||'');
    return data?.providers?.find(provider=>String(provider.calendar_id)===calendar)||data?.providers?.find(provider=>provider.provider_id===providerId)||null;
  }
  function returnConsentCard(){
    const home=root.querySelector('[data-wm-consent-home]');
    if(home&&consentCard&&consentCard.parentElement!==home)home.appendChild(consentCard);
  }
  function clearSlotSelection(){
    selectedSlot=null;
    if(consentCard)consentCard.hidden=true;
    if(consentInput)consentInput.checked=false;
    if(bookButton)bookButton.disabled=true;
  }
  function resetSelection({clearDates=true}={}){
    selectedDate='';
    clearSlotSelection();
    returnConsentCard();
    if(clearDates&&dateGrid)dateGrid.innerHTML='';
  }
  function providerMeta(provider){
    const listedZone=provider.listed_timezone||'';
    return {
      location:String(provider.location||'').trim(),
      timezone:timezoneDisplayName(listedZone,new Date()),
    };
  }
  function renderMentors(){
    if(!mentorGrid||!data)return;
    mentorGrid.innerHTML=data.providers.map(provider=>{
      const meta=providerMeta(provider);
      const image=provider.photo_url||'/assets/flowtel-pinkrose.png';
      return `<button class="wm-mentor-card ${providerId===provider.provider_id?'active':''}" data-wm-provider-id="${escapeHtml(provider.provider_id)}" type="button" aria-pressed="${providerId===provider.provider_id?'true':'false'}">
        <img src="${escapeHtml(image)}" alt="" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'">
        <span class="wm-mentor-copy">
          <strong>${escapeHtml(provider.display_name)}</strong>
          ${meta.location?`<small class="wm-mentor-location">${escapeHtml(meta.location)}</small>`:''}
          ${meta.timezone?`<small class="wm-mentor-timezone">${escapeHtml(meta.timezone)}</small>`:''}
        </span>
      </button>`;
    }).join('');
    mentorGrid.querySelectorAll('[data-wm-provider-id]').forEach(button=>button.addEventListener('click',async()=>{
      providerId=button.dataset.wmProviderId||'';
      firstAvailableButton?.classList.remove('active');
      choosePriestessButton?.classList.add('active');
      renderMentors();
      await loadDates();
    }));
  }
  function renderSummary(call){
    if(!summary||!toggle)return;
    if(!call){
      if(data&&!data.eligible){
        summary.hidden=false;
        toggle.hidden=true;
        summary.innerHTML='<div class="wm-suite-summary-copy"><p class="eyebrow">WOMB MAGIC</p><strong>Your call has been received for this month.</strong><span>Your next complimentary call opens with the next calendar month.</span></div>';
      }else{
        summary.hidden=true;
        summary.innerHTML='';
        toggle.hidden=false;
        toggle.textContent='Schedule Womb Magic';
      }
      return;
    }
    const time=formatCallTime(call.starts_at);
    summary.hidden=false;
    toggle.hidden=true;
    summary.innerHTML=`<div class="wm-suite-summary-copy"><p class="eyebrow">YOUR WOMB MAGIC CALL</p><strong>${escapeHtml(time.dateLine)}</strong><span>${escapeHtml(time.timeLine)} · With ${escapeHtml(call.practitioner_name||'a Flow FM Priestess')}</span></div><div class="wm-suite-summary-actions">${meetingAction(call)}<button type="button" class="secondary" data-wm-view>View Details</button><button type="button" class="secondary" data-wm-reschedule>Reschedule</button><button type="button" class="secondary" data-wm-cancel>Cancel</button></div>`;
    summary.querySelector('[data-wm-view]')?.addEventListener('click',()=>open());
    summary.querySelector('[data-wm-reschedule]')?.addEventListener('click',()=>beginReschedule(call));
    summary.querySelector('[data-wm-cancel]')?.addEventListener('click',()=>cancelCall(call));
  }
  function renderCurrent(call){
    if(!currentCall)return;
    if(!call){currentCall.hidden=true;currentCall.innerHTML='';return;}
    const time=formatCallTime(call.starts_at);
    currentCall.hidden=false;
    const meeting=meetingAction(call);
    const meetingPending=meeting?'':'<p class="wm-meeting-pending">Your Zoom room will appear here as soon as Acuity finishes preparing it.</p>';
    currentCall.innerHTML=`<header><div><p class="eyebrow">YOUR UPCOMING CALL</p><h4>Womb Magic with ${escapeHtml(call.practitioner_name||'a Flow FM Priestess')}</h4></div><span class="wm-call-status">${escapeHtml(String(call.status||'scheduled').toUpperCase())}</span></header><div class="wm-current-call-time"><strong>${escapeHtml(time.dateLine)}</strong><span>${escapeHtml(time.timeLine)}</span></div><div class="wm-call-meta"><span>45 minutes</span><span>${escapeHtml(timezoneDisplayName(memberTimezone(),new Date(call.starts_at)))}</span></div>${meetingPending}<div class="wm-call-actions">${meeting}<button type="button" class="secondary" data-wm-reschedule-current>Reschedule</button><button type="button" class="secondary" data-wm-cancel-current>Cancel Call</button></div>`;
    currentCall.querySelector('[data-wm-reschedule-current]')?.addEventListener('click',()=>beginReschedule(call));
    currentCall.querySelector('[data-wm-cancel-current]')?.addEventListener('click',()=>cancelCall(call));
  }
  function renderState(){
    if(!data)return;
    const call=activeAppointment([data.consuming_appointment,...(data.appointments||[])]);
    renderSummary(call);
    renderCurrent(call);
    if(!data.providers.length){
      if(experience)experience.hidden=true;
      if(gate){gate.hidden=false;gate.innerHTML='<h4>Womb Magic is being prepared</h4><p>No Priestess calendars are mapped yet. Please return soon.</p>';}
      return;
    }
    if(gate)gate.hidden=true;
    if(experience)experience.hidden=!data.eligible&&!rescheduling;
    renderMentors();
    if(!data.eligible&&!rescheduling)setMessage('Your complimentary call for this month is already scheduled.');
    else setMessage('');
  }
  async function refresh({silent=false}={}){
    if(loadingPromise)return loadingPromise;
    loadingPromise=(async()=>{
      try{
        if(!silent)setMessage('Preparing Womb Magic…');
        data=await loadWombMagicScheduling();
        renderState();
        if(!autoOpened&&new URLSearchParams(window.location.search).get('wombMagic')==='1'){
          autoOpened=true;
          await open({skipRefresh:true});
        }
        return data;
      }catch(error){
        if(!silent)setMessage(error?.message||'Womb Magic could not be opened just now.');
        if(experience)experience.hidden=true;
        if(gate&&panel&&!panel.hidden){gate.hidden=false;gate.innerHTML=`<h4>The scheduling room is not open yet</h4><p>${escapeHtml(error?.message||'Please return soon.')}</p>`;}
        return null;
      }finally{loadingPromise=null;}
    })();
    return loadingPromise;
  }
  async function open({skipRefresh=false}={}){
    if(panel){panel.hidden=false;panel.setAttribute('aria-hidden','false');}
    if(toggle)toggle.setAttribute('aria-expanded','true');
    if(!skipRefresh||!data)await refresh();
    if(data?.eligible||rescheduling)await loadDates();
    panel?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function close(){
    if(panel){panel.hidden=true;panel.setAttribute('aria-hidden','true');}
    if(toggle)toggle.setAttribute('aria-expanded','false');
    rescheduling=null;
    resetSelection();
    if(data)renderState();
  }
  function beginReschedule(call){
    rescheduling=call;
    open().then(()=>{
      if(experience)experience.hidden=false;
      setMessage('Choose a new date and time for this call.');
      experience?.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
  }
  async function cancelCall(call){
    if(!window.confirm('Cancel this Womb Magic call? Your monthly booking will become available again.'))return;
    try{
      setMessage('Cancelling your call…');
      await cancelWombMagicCall(call.id);
      rescheduling=null;
      data=null;
      await refresh();
      close();
    }catch(error){setMessage(error?.message||'This call could not be cancelled.');}
  }
  function queueDateRefresh(delay=120){
    window.clearTimeout(refreshTimer);
    refreshTimer=window.setTimeout(()=>{void loadDates();},delay);
  }
  async function loadDates(){
    if(!data||!monthInput?.value||(!data.eligible&&!rescheduling))return;
    const request=++datesRequest;
    try{
      setMessage('Gathering available dates…');
      resetSelection();
      dateGrid.innerHTML='<p class="wm-loading-copy">Gathering available dates…</p>';
      const result=await loadWombMagicDates({month:monthInput.value,provider_id:providerId,timezone:memberTimezone()});
      if(request!==datesRequest)return;
      const dates=[...new Set((result.dates||[]).map(dateValue).filter(Boolean))];
      dateGrid.innerHTML=dates.length?dates.map(date=>`
        <article class="wm-date-option" data-wm-date-option="${escapeHtml(date)}">
          <button type="button" class="wm-date-button" data-wm-date="${escapeHtml(date)}" aria-expanded="false">${escapeHtml(formatDate(`${date}T12:00:00Z`,{withTime:false}))}</button>
          <section class="wm-date-detail" data-wm-date-detail hidden>
            <h4>Available times for ${escapeHtml(formatDate(`${date}T12:00:00Z`,{withTime:false,long:true}))}</h4>
            <div class="womb-magic-time-grid" data-wm-time-grid></div>
            <div data-wm-consent-host></div>
          </section>
        </article>`).join(''):'<p class="wm-empty-copy">No Womb Magic appointments are available this month. Choose another month or Priestess.</p>';
      dateGrid.querySelectorAll('[data-wm-date]').forEach(button=>button.addEventListener('click',()=>loadTimes(button.dataset.wmDate,button)));
      setMessage('');
    }catch(error){
      if(request!==datesRequest)return;
      dateGrid.innerHTML='';
      setMessage(error?.message||'Available dates could not be opened.');
    }
  }
  async function loadTimes(date,button){
    const request=++timesRequest;
    selectedDate=date;
    clearSlotSelection();
    returnConsentCard();
    dateGrid.querySelectorAll('[data-wm-date-option]').forEach(option=>{
      const active=option.dataset.wmDateOption===date;
      option.classList.toggle('active',active);
      const dateButton=option.querySelector('[data-wm-date]');
      const detail=option.querySelector('[data-wm-date-detail]');
      if(dateButton){dateButton.classList.toggle('active',active);dateButton.setAttribute('aria-expanded',String(active));}
      if(detail)detail.hidden=!active;
    });
    const option=button.closest('[data-wm-date-option]');
    const detail=option?.querySelector('[data-wm-date-detail]');
    const timeGrid=option?.querySelector('[data-wm-time-grid]');
    if(!timeGrid)return;
    try{
      setMessage('Finding available times…');
      timeGrid.innerHTML='<p class="wm-loading-copy">Finding available times…</p>';
      const result=await loadWombMagicTimes({date,provider_id:providerId,timezone:memberTimezone(),ignore_appointment_id:rescheduling?.acuity_appointment_id});
      if(request!==timesRequest||selectedDate!==date)return;
      const slots=result.times||[];
      timeGrid.innerHTML=slots.length?slots.map((slot,index)=>{
        const provider=providerForSlot(slot);
        const providerLine=!providerId&&provider?.display_name?`<small>${escapeHtml(provider.display_name)}</small>`:'';
        return `<button type="button" class="wm-time-button" data-wm-slot="${index}"><strong>${escapeHtml(formatTimeOnly(slotValue(slot)))}</strong>${providerLine}</button>`;
      }).join(''):'<p class="wm-empty-copy">No times remain on this date.</p>';
      timeGrid.querySelectorAll('[data-wm-slot]').forEach(item=>item.addEventListener('click',()=>selectSlot(slots[Number(item.dataset.wmSlot)],item,detail)));
      timeGrid.__slots=slots;
      setMessage('');
      option?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(error){
      if(request!==timesRequest)return;
      timeGrid.innerHTML='';
      setMessage(error?.message||'Available times could not be opened.');
    }
  }
  function selectSlot(slot,button,detail){
    selectedSlot=slot;
    detail?.querySelectorAll('[data-wm-slot]').forEach(item=>item.classList.toggle('active',item===button));
    const provider=providerForSlot(slot);
    if(provider){providerId=provider.provider_id;renderMentors();}
    if(consentCopy)consentCopy.textContent=data.service.consent_language;
    const host=detail?.querySelector('[data-wm-consent-host]');
    if(host&&consentCard)host.appendChild(consentCard);
    if(consentCard)consentCard.hidden=false;
    if(consentInput)consentInput.checked=false;
    if(bookButton){bookButton.disabled=true;bookButton.textContent=rescheduling?'Confirm New Time':'Consent + Book My Call';}
    consentCard?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function submitBooking(){
    const provider=providerForSlot(selectedSlot);
    if(!provider){setMessage('Choose a Priestess for this appointment time.');return;}
    try{
      bookButton.disabled=true;
      setMessage(rescheduling?'Rescheduling your call…':'Preparing your Womb Magic call…');
      if(rescheduling){
        await rescheduleWombMagicCall({appointment_id:rescheduling.id,datetime:slotValue(selectedSlot),timezone:memberTimezone()});
      }else{
        await bookWombMagicCall({provider_id:provider.provider_id,datetime:slotValue(selectedSlot),timezone:memberTimezone(),consent:true,phone:phoneInput?.value||''});
      }
      rescheduling=null;
      data=null;
      await refresh();
      close();
    }catch(error){setMessage(error?.message||'This call could not be booked.');bookButton.disabled=false;}
  }

  toggle?.addEventListener('click',()=>panel?.hidden?open():close());
  closeButton?.addEventListener('click',close);
  firstAvailableButton?.addEventListener('click',async()=>{
    providerId='';
    mentorGrid.hidden=true;
    firstAvailableButton.classList.add('active');
    choosePriestessButton?.classList.remove('active');
    renderMentors();
    await loadDates();
  });
  choosePriestessButton?.addEventListener('click',()=>{
    mentorGrid.hidden=false;
    firstAvailableButton?.classList.remove('active');
    choosePriestessButton.classList.add('active');
    renderMentors();
    if(providerId)queueDateRefresh(0);
    else{
      resetSelection();
      setMessage('Choose a Priestess to see her available dates.');
    }
  });
  monthInput?.addEventListener('change',()=>queueDateRefresh(0));
  consentInput?.addEventListener('change',()=>{if(bookButton)bookButton.disabled=!consentInput.checked;});
  bookButton?.addEventListener('click',submitBooking);

  const api={refresh,open,close};
  root.__flowtelWombMagic=api;
  return api;
}
