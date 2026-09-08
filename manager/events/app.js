import { getCurrentProfile } from '/shared/profiles.js?v=0.10.89';
import {
  loadQueendomEventsAdmin,
  loadQueendomEventHostsAdmin,
  saveQueendomEventAdmin,
  configureQueendomEventSeriesAdmin,
  loadQueendomEventSeriesAcuitySetupAdmin,
  cancelQueendomEventAdmin,
  uploadQueendomEventImage,
} from '/shared/queendom-events.js?v=0.10.89';
import { timezoneDisplayName } from '/shared/timezone-labels.js?v=0.10.89';

const gate=document.getElementById('eventsAdminGate');
const workspace=document.getElementById('eventsAdminWorkspace');
const form=document.getElementById('eventEditorForm');
const list=document.getElementById('eventAdminList');
const count=document.getElementById('eventCount');
const message=document.getElementById('eventFormMessage');
const saveButton=document.getElementById('saveEventButton');
const cancelButton=document.getElementById('cancelEventButton');
const newButton=document.getElementById('newEventButton');
const imagePreview=document.getElementById('eventImagePreview');
let rows=[];
let hosts=[];
let imageObjectUrl='';
let acuitySeries=[];
let acuityCalendars=[];
let acuityConnected=false;

const fields={
  id:document.getElementById('eventId'),title:document.getElementById('eventTitle'),type:document.getElementById('eventType'),audience:document.getElementById('eventAudience'),date:document.getElementById('eventDate'),start:document.getElementById('eventStartTime'),end:document.getElementById('eventEndTime'),timezone:document.getElementById('eventTimezone'),host:document.getElementById('eventHost'),coHost:document.getElementById('eventCoHost'),description:document.getElementById('eventDescription'),howToPrepare:document.getElementById('eventHowToPrepare'),guideUrl:document.getElementById('eventGuideUrl'),recorded:document.getElementById('eventRecorded'),locationType:document.getElementById('eventLocationType'),privateLocation:document.getElementById('eventPrivateLocation'),zoom:document.getElementById('eventZoomUrl'),passcode:document.getElementById('eventZoomPasscode'),status:document.getElementById('eventStatus'),imagePath:document.getElementById('eventImagePath'),imageUrl:document.getElementById('eventImageUrl'),imageFile:document.getElementById('eventImageFile'),
  startHour:document.getElementById('eventStartHour'),startMinute:document.getElementById('eventStartMinute'),startPeriod:document.getElementById('eventStartPeriod'),
  endHour:document.getElementById('eventEndHour'),endMinute:document.getElementById('eventEndMinute'),endPeriod:document.getElementById('eventEndPeriod'),
  live:document.getElementById('eventLiveTime'),liveHour:document.getElementById('eventLiveHour'),liveMinute:document.getElementById('eventLiveMinute'),livePeriod:document.getElementById('eventLivePeriod'),
  publicAccess:document.getElementById('eventPublicAccess'),queendomAccess:document.getElementById('eventQueendomAccess'),flowfmAccess:document.getElementById('eventFlowfmAccess'),publicPrice:document.getElementById('eventPublicPrice'),queendomPrice:document.getElementById('eventQueendomPrice'),flowfmPrice:document.getElementById('eventFlowfmPrice'),currency:document.getElementById('eventCurrency'),ticketUrl:document.getElementById('eventTicketUrl'),productId:document.getElementById('eventProductId'),
  format:document.getElementById('eventFormat'),seriesCount:document.getElementById('eventSeriesCount'),seriesInterval:document.getElementById('eventSeriesInterval'),acuitySeries:document.getElementById('eventAcuitySeries'),acuityCalendar:document.getElementById('eventAcuityCalendar'),seriesPreview:document.getElementById('eventSeriesPreview'),seriesMessage:document.getElementById('eventSeriesSetupMessage'),
};
function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function renderHourOptions(select,{optional=false}={}){
  select.innerHTML=`<option value="">${optional?'No end time':'Hour'}</option>`+Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
}
function timeParts(kind){if(kind==='start')return{hour:fields.startHour,minute:fields.startMinute,period:fields.startPeriod,hidden:fields.start};if(kind==='live')return{hour:fields.liveHour,minute:fields.liveMinute,period:fields.livePeriod,hidden:fields.live};return{hour:fields.endHour,minute:fields.endMinute,period:fields.endPeriod,hidden:fields.end};}
function syncTime(kind){
  const parts=timeParts(kind);
  if(!parts.hour.value){parts.hidden.value='';if(kind==='end'||kind==='live'){parts.minute.disabled=true;parts.period.disabled=true;}return '';}
  parts.minute.disabled=false;parts.period.disabled=false;
  let hour=Number(parts.hour.value);if(parts.period.value==='AM'&&hour===12)hour=0;if(parts.period.value==='PM'&&hour!==12)hour+=12;
  const value=`${String(hour).padStart(2,'0')}:${parts.minute.value}`;parts.hidden.value=value;return value;
}
function setTime(kind,value=''){
  const parts=timeParts(kind);const m=/^(\d{2}):(\d{2})/.exec(String(value||''));
  if(!m){parts.hour.value='';parts.minute.value='00';parts.period.value='AM';syncTime(kind);return;}
  const hour24=Number(m[1]);parts.hour.value=String(hour24%12||12);parts.minute.value=['00','15','30','45'].includes(m[2])?m[2]:'00';parts.period.value=hour24>=12?'PM':'AM';syncTime(kind);
}
function typeLabel(value){return ({ceremony:'CEREMONY',workshop:'WORKSHOP',call:'CALL',other:'EVENT'})[value]||'EVENT';}
function audienceLabel(value){return value==='flowfm'?'FLOW FM':'QUEENDOM';}
function formatClock(value){
  const m=/^(\d{2}):(\d{2})/.exec(String(value||''));if(!m)return String(value||'');
  const d=new Date(Date.UTC(2026,0,1,Number(m[1]),Number(m[2])));
  return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(d);
}
function timezoneDate(row){return /^\d{4}-\d{2}-\d{2}$/.test(String(row?.event_date||''))?new Date(`${row.event_date}T12:00:00Z`):new Date();}
function eventTimezoneLabel(row){return timezoneDisplayName(row?.event_timezone||'America/Los_Angeles',timezoneDate(row))||'Pacific Time';}
function eventDateLabel(row){
  const date=new Date(`${row.event_date}T12:00:00Z`);
  const day=Number.isNaN(date.getTime())?row.event_date:new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
  const start=formatClock(row.start_time);const end=row.end_time?formatClock(row.end_time):'';
  return `${day} · ${start}${end?`–${end}`:''} · ${eventTimezoneLabel(row)}`;
}
function hostProfileHref(memberId){return memberId?`/flow-fm/team-map/profile/?member=${encodeURIComponent(memberId)}`:'';}
function renderHostOptions(selected='',coSelected=''){
  const options=hosts.map(host=>`<option value="${esc(host.member_id)}">${esc(host.display_name||'Flow FM Priestess')}</option>`).join('');
  fields.host.innerHTML='<option value="">Choose a Flow FM host</option>'+options;fields.coHost.innerHTML='<option value="">No co-host</option>'+options;
  fields.host.value=selected||'';fields.coHost.value=coSelected||'';
}
function formatSeriesDate(value){
  const date=new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())?String(value||''):new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
}
function seriesDates(){
  if(fields.format.value!=='series'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fields.date.value))return [];
  const count=Math.max(2,Math.min(Number(fields.seriesCount.value)||4,12));
  const interval=Math.max(1,Math.min(Number(fields.seriesInterval.value)||7,90));
  const base=new Date(`${fields.date.value}T12:00:00Z`);
  return Array.from({length:count},(_,index)=>{const date=new Date(base.getTime()+index*interval*86400000);return date.toISOString().slice(0,10);});
}
function renderSeriesPreview(){
  const dates=seriesDates();
  if(!dates.length){fields.seriesPreview.hidden=true;fields.seriesPreview.innerHTML='';return;}
  fields.seriesPreview.hidden=false;
  fields.seriesPreview.innerHTML=`<strong>${dates.length}-SESSION ITINERARY</strong><ol>${dates.map((date,index)=>`<li>Session ${index+1} · ${esc(formatSeriesDate(date))}</li>`).join('')}</ol>`;
}
function selectedSeries(){return acuitySeries.find(item=>String(item.id)===String(fields.acuitySeries.value));}
function renderCalendarOptions(selected=''){
  const type=selectedSeries();
  const allowed=Array.isArray(type?.calendarIDs)&&type.calendarIDs.length?new Set(type.calendarIDs.map(String)):null;
  const options=acuityCalendars.filter(item=>!allowed||allowed.has(String(item.id))).map(item=>`<option value="${esc(item.id)}">${esc(item.name||`Calendar ${item.id}`)}</option>`).join('');
  fields.acuityCalendar.innerHTML='<option value="">Choose the Acuity calendar</option>'+options;
  if(selected&&!Array.from(fields.acuityCalendar.options).some(option=>option.value===String(selected))){fields.acuityCalendar.insertAdjacentHTML('beforeend',`<option value="${esc(selected)}">Mapped calendar #${esc(selected)}</option>`);}
  fields.acuityCalendar.value=selected||'';
}
function renderAcuitySeriesOptions(selectedSeriesId='',selectedCalendarId=''){
  const options=acuitySeries.map(item=>`<option value="${esc(item.id)}">${esc(item.name||`Series ${item.id}`)}${item.classSize?` · ${esc(item.classSize)} seats`:''}</option>`).join('');
  fields.acuitySeries.innerHTML='<option value="">Choose the Acuity series</option>'+options;
  if(selectedSeriesId&&!Array.from(fields.acuitySeries.options).some(option=>option.value===String(selectedSeriesId))){fields.acuitySeries.insertAdjacentHTML('beforeend',`<option value="${esc(selectedSeriesId)}">Mapped Acuity series #${esc(selectedSeriesId)}</option>`);}
  fields.acuitySeries.value=selectedSeriesId||'';
  renderCalendarOptions(selectedCalendarId);
}
function syncSeriesFields(){
  const active=fields.format.value==='series';
  document.querySelectorAll('[data-series-field]').forEach(element=>{element.hidden=!active;});
  fields.seriesCount.required=active;fields.seriesInterval.required=active;fields.acuitySeries.required=active;fields.acuityCalendar.required=active;
  if(active){
    fields.seriesMessage.textContent=acuityConnected?'Acuity is connected. Flowtel will register an eligible member into this full group series when she joins the vortex.':'Connect Acuity before publishing this series. Single events remain available.';
  }
  renderSeriesPreview();
}
async function loadAcuitySeriesSetup(){
  try{
    const data=await loadQueendomEventSeriesAcuitySetupAdmin();
    acuitySeries=Array.isArray(data.series)?data.series:[];acuityCalendars=Array.isArray(data.calendars)?data.calendars:[];acuityConnected=true;
    renderAcuitySeriesOptions(fields.acuitySeries.value,fields.acuityCalendar.value);
    fields.seriesMessage.textContent=acuitySeries.length?'Acuity is connected. Choose the group series that matches this Flowtel vortex.':'Acuity is connected, but no appointment type of type “series” was found. Create the group series in Acuity first.';
  }catch(error){
    acuityConnected=false;acuitySeries=[];acuityCalendars=[];renderAcuitySeriesOptions(fields.acuitySeries.value,fields.acuityCalendar.value);
    fields.seriesMessage.textContent=error?.message||'Flowtel could not load Acuity series setup. Single events still work normally.';
  }
  syncSeriesFields();
}
function setPreview(url=''){
  if(imageObjectUrl){URL.revokeObjectURL(imageObjectUrl);imageObjectUrl='';}
  imagePreview.innerHTML=url?`<img src="${esc(url)}" alt="Event artwork preview">`:'<span>EVENT IMAGE</span>';
}
function resetForm(){
  form.reset();renderHostOptions('','');fields.id.value='';fields.imagePath.value='';fields.imageUrl.value='';fields.timezone.value='America/Los_Angeles';fields.type.value='ceremony';fields.audience.value='queendom';fields.status.value='draft';fields.howToPrepare.value='Find a private space. Light a candle + incense. Make tea. Grab a journal + pen. Arrive a few minutes early and let yourself settle in.';fields.locationType.value='zoom';fields.recorded.value='false';fields.publicAccess.value='unavailable';fields.queendomAccess.value='included';fields.flowfmAccess.value='included';fields.currency.value='USD';fields.format.value='single';fields.seriesCount.value='4';fields.seriesInterval.value='7';renderAcuitySeriesOptions('','');fields.status.disabled=false;saveButton.disabled=false;cancelButton.hidden=true;message.textContent='';document.getElementById('eventEditorTitle').textContent='Create an event';setPreview('');
  setTime('start','');setTime('end','');setTime('live','');syncSeriesFields();
  const tomorrow=new Date(Date.now()+86400000);fields.date.value=tomorrow.toISOString().slice(0,10);
}
function editEvent(row){
  const cancelled=row.status==='cancelled';
  fields.id.value=row.event_id||'';fields.title.value=row.title||'';fields.type.value=row.event_type||'workshop';fields.audience.value=row.audience||'queendom';fields.date.value=row.event_date||'';setTime('start',String(row.start_time||'').slice(0,5));setTime('end',String(row.end_time||'').slice(0,5));setTime('live',String(row.live_room_time||row.start_time||'').slice(0,5));fields.timezone.value=row.event_timezone||'America/Los_Angeles';renderHostOptions(row.host_member_id||'',row.co_host_member_id||'');fields.description.value=row.description||'';fields.howToPrepare.value=row.how_to_prepare||'';fields.guideUrl.value=row.attendee_guide_url||'';fields.recorded.value=String(Boolean(row.will_be_recorded));fields.locationType.value=row.location_type||'zoom';fields.privateLocation.value=row.private_location||'';fields.zoom.value=row.zoom_url||'';fields.passcode.value=row.zoom_passcode||'';fields.publicAccess.value=row.public_access||'unavailable';fields.queendomAccess.value=row.queendom_access||'included';fields.flowfmAccess.value=row.flowfm_access||'included';fields.publicPrice.value=row.public_price??'';fields.queendomPrice.value=row.queendom_price??'';fields.flowfmPrice.value=row.flowfm_price??'';fields.currency.value=row.access_currency||'USD';fields.ticketUrl.value=row.ticket_url||'';fields.productId.value=row.squarespace_product_id||'';fields.format.value=row.event_format||'single';fields.seriesCount.value=String(row.series_count||4);fields.seriesInterval.value=String(row.series_interval_days||7);renderAcuitySeriesOptions(row.acuity_appointment_type_id||'',row.acuity_calendar_id||'');syncSeriesFields();fields.status.value=row.status==='cancelled'?'cancelled':(row.status==='published'?'published':'draft');fields.imagePath.value=row.image_path||'';fields.imageUrl.value=row.image_url||'';fields.imageFile.value='';cancelButton.hidden=row.status!=='published';saveButton.disabled=cancelled;fields.status.disabled=cancelled;message.textContent=cancelled?'Cancelled events stay in history and are read-only. Create a new event if this gathering returns.':'';document.getElementById('eventEditorTitle').textContent=cancelled?'Cancelled event':'Edit event';setPreview(row.image_url||'');window.scrollTo({top:0,behavior:'smooth'});
}
function rowMarkup(row){
  const image=row.image_url?`<img src="${esc(row.image_url)}" alt="">`:'<div class="event-admin-placeholder">✦</div>';
  const cancelled=row.status==='cancelled';
  const host=row.host_name?`<p class="event-admin-host">Hosted by ${row.host_member_id?`<a href="${esc(hostProfileHref(row.host_member_id))}">${esc(row.host_name)}</a>`:esc(row.host_name)}${row.co_host_name?` + ${row.co_host_member_id?`<a href="${esc(hostProfileHref(row.co_host_member_id))}">${esc(row.co_host_name)}</a>`:esc(row.co_host_name)}`:''}</p>`:'';
  const series=row.event_format==='series';const seriesChip=series?`<span class="series-chip">${esc(String(row.series_count||0))} SESSION SERIES · ${esc(String(row.series_enrollment_count||0))} ACUITY ENROLLED</span>`:'';
  return `<article class="event-admin-row ${cancelled?'is-cancelled':''}" data-event-id="${esc(row.event_id)}"><div class="event-admin-art">${image}</div><div class="event-admin-copy"><p class="eyebrow">${esc(typeLabel(row.event_type))} · ${esc(audienceLabel(row.audience))}</p><h3>${esc(row.title)}</h3><p>${esc(series&&Array.isArray(row.occurrences)&&row.occurrences.length?`${eventDateLabel(row)} · ${row.series_count} sessions`:eventDateLabel(row))}</p>${host}<div class="event-admin-chips"><span>${esc(String(row.registration_count||0))} saved ${Number(row.registration_count||0)===1?'seat':'seats'}</span>${seriesChip}<span>${series?(row.acuity_appointment_type_id?'Acuity mapped':'Acuity waiting'):(row.zoom_url?'Zoom placed':'Zoom waiting')}</span><span>${esc(String(row.status||'draft').toUpperCase())}</span></div></div><div class="event-admin-actions"><button type="button" data-edit-event>Edit</button>${row.status==='published'?'<button type="button" class="quiet-button" data-cancel-event>Cancel</button>':''}</div></article>`;
}
function render(){
  count.textContent=`${rows.length} ${rows.length===1?'EVENT':'EVENTS'}`;
  list.innerHTML=rows.length?rows.map(rowMarkup).join(''):'<p class="events-empty">No events have been created yet.</p>';
  list.querySelectorAll('[data-edit-event]').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>item.event_id===button.closest('[data-event-id]').dataset.eventId);if(row)editEvent(row);}));
  list.querySelectorAll('[data-cancel-event]').forEach(button=>button.addEventListener('click',async()=>{const id=button.closest('[data-event-id]').dataset.eventId;if(!confirm('Cancel this event? Members who saved it will continue to see it marked Cancelled in My Calendar.'))return;button.disabled=true;try{await cancelQueendomEventAdmin(id);await refresh();if(fields.id.value===id)resetForm();}catch(error){button.disabled=false;alert(error?.message||'This event could not be cancelled.');}}));
}
async function refresh(){rows=await loadQueendomEventsAdmin();const today=new Date().toISOString().slice(0,10);rows.sort((a,b)=>{const af=String(a.event_date||'')>=today,bf=String(b.event_date||'')>=today;if(af!==bf)return af?-1:1;const ad=String(a.event_date||''),bd=String(b.event_date||'');if(ad!==bd)return af?ad.localeCompare(bd):bd.localeCompare(ad);return String(a.start_time||'').localeCompare(String(b.start_time||''));});render();}
function payload(){syncTime('start');syncTime('end');syncTime('live');return{event_id:fields.id.value||null,title:fields.title.value,event_type:fields.type.value,description:fields.description.value,event_date:fields.date.value,start_time:fields.start.value,end_time:fields.end.value||null,live_room_time:fields.live.value||null,timezone:fields.timezone.value,host_name:null,host_member_id:fields.host.value||null,co_host_member_id:fields.coHost.value||null,audience:fields.audience.value,how_to_prepare:fields.howToPrepare.value,attendee_guide_url:fields.guideUrl.value,will_be_recorded:fields.recorded.value==='true',location_type:fields.locationType.value,private_location:fields.privateLocation.value,zoom_url:fields.zoom.value,zoom_passcode:fields.passcode.value,public_access:fields.publicAccess.value,queendom_access:fields.queendomAccess.value,flowfm_access:fields.flowfmAccess.value,public_price:fields.publicPrice.value,queendom_price:fields.queendomPrice.value,flowfm_price:fields.flowfmPrice.value,access_currency:fields.currency.value,ticket_url:fields.ticketUrl.value,squarespace_product_id:fields.productId.value,image_path:fields.imagePath.value,image_url:fields.imageUrl.value,status:fields.status.value,event_format:fields.format.value,series_count:Number(fields.seriesCount.value)||1,series_interval_days:Number(fields.seriesInterval.value)||7,acuity_appointment_type_id:fields.acuitySeries.value||null,acuity_calendar_id:fields.acuityCalendar.value||null};}

async function save(event){
  event.preventDefault();message.textContent='';saveButton.disabled=true;saveButton.textContent='SAVING…';
  try{
    let values=payload();
    if(!values.start_time)throw new Error('Choose a start time.');
    const isSeries=values.event_format==='series';
    if(isSeries&&(values.series_count<2||values.series_count>12))throw new Error('Choose between 2 and 12 sessions.');
    if(isSeries&&(values.series_interval_days<1||values.series_interval_days>90))throw new Error('Choose between 1 and 90 days between sessions.');
    if(isSeries&&values.status==='published'&&(!values.acuity_appointment_type_id||!values.acuity_calendar_id))throw new Error('Choose the Acuity group series and calendar before publishing.');
    if(isSeries&&!acuityConnected&&values.status==='published')throw new Error('Flowtel could not verify Acuity. Reconnect Acuity before publishing this series.');
    const selected=selectedSeries();
    if(isSeries&&selected&&String(selected.type||'').toLowerCase()!=='series')throw new Error('Choose an Acuity appointment type configured as a series.');
    const id=values.event_id||crypto.randomUUID();values.event_id=id;fields.id.value=id;
    const existing=rows.find(item=>item.event_id===id);
    const stageAsDraft=isSeries&&values.status==='published'&&existing?.event_format!=='series';
    const desiredStatus=values.status;
    const baseValues={...values,status:stageAsDraft?'draft':desiredStatus};

    await saveQueendomEventAdmin(baseValues);
    await configureQueendomEventSeriesAdmin(baseValues);

    let imageWarning='';
    if(fields.imageFile.files?.[0]){
      try{
        message.textContent='Event saved. Placing the event artwork…';
        const uploaded=await uploadQueendomEventImage(id,fields.imageFile.files[0]);
        fields.imagePath.value=uploaded.image_path;fields.imageUrl.value=uploaded.image_url;
        values={...values,...uploaded};
        await saveQueendomEventAdmin({...values,status:stageAsDraft?'draft':desiredStatus});
      }catch(imageError){imageWarning=` Artwork could not be added: ${imageError?.message||'try the image again later.'}`;}
    }

    if(stageAsDraft){
      await saveQueendomEventAdmin({...values,status:desiredStatus});
      await configureQueendomEventSeriesAdmin({...values,status:desiredStatus});
    }

    message.textContent=desiredStatus==='published'?(isSeries?`Published. Flowtel will treat this as one ${values.series_count}-session vortex and Acuity will own the class-series enrollment + reminder emails.`:'Published. The event is live everywhere Flowtel shows the Queendom Calendar.'):'Draft saved.';
    if(imageWarning)message.textContent+=imageWarning;
    await refresh();
    const row=rows.find(item=>item.event_id===id);if(row)editEvent(row);
  }catch(error){message.textContent=error?.message||'This event could not be saved.';}
  finally{saveButton.disabled=false;saveButton.textContent='SAVE EVENT';}
}

[fields.startHour,fields.startMinute,fields.startPeriod].forEach(control=>control.addEventListener('change',()=>syncTime('start')));
[fields.endHour,fields.endMinute,fields.endPeriod].forEach(control=>control.addEventListener('change',()=>syncTime('end')));[fields.liveHour,fields.liveMinute,fields.livePeriod].forEach(control=>control.addEventListener('change',()=>syncTime('live')));
fields.format.addEventListener('change',syncSeriesFields);fields.seriesCount.addEventListener('input',renderSeriesPreview);fields.seriesInterval.addEventListener('input',renderSeriesPreview);fields.date.addEventListener('change',renderSeriesPreview);fields.acuitySeries.addEventListener('change',()=>renderCalendarOptions(''));
fields.imageFile.addEventListener('change',()=>{const file=fields.imageFile.files?.[0];if(!file){setPreview(fields.imageUrl.value);return;}if(imageObjectUrl)URL.revokeObjectURL(imageObjectUrl);imageObjectUrl=URL.createObjectURL(file);imagePreview.innerHTML=`<img src="${esc(imageObjectUrl)}" alt="Selected event artwork preview">`;});
form.addEventListener('submit',save);newButton.addEventListener('click',resetForm);cancelButton.addEventListener('click',async()=>{const id=fields.id.value;if(!id||!confirm('Cancel this event? Members who saved it will continue to see it marked Cancelled in My Calendar.'))return;cancelButton.disabled=true;try{await cancelQueendomEventAdmin(id);await refresh();resetForm();}catch(error){message.textContent=error?.message||'This event could not be cancelled.';}finally{cancelButton.disabled=false;}});

async function init(){
  try{
    renderHourOptions(fields.startHour);renderHourOptions(fields.endHour,{optional:true});renderHourOptions(fields.liveHour,{optional:true});syncTime('end');syncTime('live');
    const profile=await getCurrentProfile();
    if(!profile||!['owner','admin'].includes(String(profile.role||'').toLowerCase()))throw new Error('Only Flowtel administration may open this room.');
    hosts=await loadQueendomEventHostsAdmin();
    renderHostOptions('');
    await refresh();gate.hidden=true;workspace.hidden=false;resetForm();
    await loadAcuitySeriesSetup();
  }catch(error){gate.innerHTML=`<p class="eyebrow">OWNER ADMINISTRATION</p><h2>Queendom Events could not open.</h2><p>${esc(error?.message||'Return through the Concierge Desk and try again.')}</p>`;}
}
init();
