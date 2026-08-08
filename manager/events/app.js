import { getCurrentProfile } from '/shared/profiles.js?v=0.10.83';
import {
  loadQueendomEventsAdmin,
  loadQueendomEventHostsAdmin,
  saveQueendomEventAdmin,
  cancelQueendomEventAdmin,
  uploadQueendomEventImage,
} from '/shared/queendom-events.js?v=0.10.83.1';
import { timezoneDisplayName } from '/shared/timezone-labels.js?v=0.10.83.1';

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

const fields={
  id:document.getElementById('eventId'),title:document.getElementById('eventTitle'),type:document.getElementById('eventType'),audience:document.getElementById('eventAudience'),date:document.getElementById('eventDate'),start:document.getElementById('eventStartTime'),end:document.getElementById('eventEndTime'),timezone:document.getElementById('eventTimezone'),host:document.getElementById('eventHost'),description:document.getElementById('eventDescription'),zoom:document.getElementById('eventZoomUrl'),passcode:document.getElementById('eventZoomPasscode'),status:document.getElementById('eventStatus'),imagePath:document.getElementById('eventImagePath'),imageUrl:document.getElementById('eventImageUrl'),imageFile:document.getElementById('eventImageFile'),
};
function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
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
function renderHostOptions(selected=''){
  fields.host.innerHTML='<option value="">Choose a Flow FM host</option>'+hosts.map(host=>`<option value="${esc(host.member_id)}">${esc(host.display_name||'Flow FM Priestess')}</option>`).join('');
  fields.host.value=selected||'';
}
function setPreview(url=''){
  if(imageObjectUrl){URL.revokeObjectURL(imageObjectUrl);imageObjectUrl='';}
  imagePreview.innerHTML=url?`<img src="${esc(url)}" alt="Event artwork preview">`:'<span>EVENT IMAGE</span>';
}
function resetForm(){
  form.reset();renderHostOptions('');fields.id.value='';fields.imagePath.value='';fields.imageUrl.value='';fields.timezone.value='America/Los_Angeles';fields.type.value='ceremony';fields.audience.value='queendom';fields.status.value='draft';fields.status.disabled=false;saveButton.disabled=false;cancelButton.hidden=true;message.textContent='';document.getElementById('eventEditorTitle').textContent='Create an event';setPreview('');
  const tomorrow=new Date(Date.now()+86400000);fields.date.value=tomorrow.toISOString().slice(0,10);
}
function editEvent(row){
  const cancelled=row.status==='cancelled';
  fields.id.value=row.event_id||'';fields.title.value=row.title||'';fields.type.value=row.event_type||'workshop';fields.audience.value=row.audience||'queendom';fields.date.value=row.event_date||'';fields.start.value=String(row.start_time||'').slice(0,5);fields.end.value=String(row.end_time||'').slice(0,5);fields.timezone.value=row.event_timezone||'America/Los_Angeles';renderHostOptions(row.host_member_id||'');fields.description.value=row.description||'';fields.zoom.value=row.zoom_url||'';fields.passcode.value=row.zoom_passcode||'';fields.status.value=row.status==='cancelled'?'cancelled':(row.status==='published'?'published':'draft');fields.imagePath.value=row.image_path||'';fields.imageUrl.value=row.image_url||'';fields.imageFile.value='';cancelButton.hidden=row.status!=='published';saveButton.disabled=cancelled;fields.status.disabled=cancelled;message.textContent=cancelled?'Cancelled events stay in history and are read-only. Create a new event if this gathering returns.':'';document.getElementById('eventEditorTitle').textContent=cancelled?'Cancelled event':'Edit event';setPreview(row.image_url||'');window.scrollTo({top:0,behavior:'smooth'});
}
function rowMarkup(row){
  const image=row.image_url?`<img src="${esc(row.image_url)}" alt="">`:'<div class="event-admin-placeholder">✦</div>';
  const cancelled=row.status==='cancelled';
  const host=row.host_name?`<p class="event-admin-host">Hosted by ${row.host_member_id?`<a href="${esc(hostProfileHref(row.host_member_id))}">${esc(row.host_name)}</a>`:esc(row.host_name)}</p>`:'';
  return `<article class="event-admin-row ${cancelled?'is-cancelled':''}" data-event-id="${esc(row.event_id)}"><div class="event-admin-art">${image}</div><div class="event-admin-copy"><p class="eyebrow">${esc(typeLabel(row.event_type))} · ${esc(audienceLabel(row.audience))}</p><h3>${esc(row.title)}</h3><p>${esc(eventDateLabel(row))}</p>${host}<div class="event-admin-chips"><span>${esc(String(row.registration_count||0))} saved ${Number(row.registration_count||0)===1?'seat':'seats'}</span><span>${row.zoom_url?'Zoom placed':'Zoom waiting'}</span><span>${esc(String(row.status||'draft').toUpperCase())}</span></div></div><div class="event-admin-actions"><button type="button" data-edit-event>Edit</button>${row.status==='published'?'<button type="button" class="quiet-button" data-cancel-event>Cancel</button>':''}</div></article>`;
}
function render(){
  count.textContent=`${rows.length} ${rows.length===1?'EVENT':'EVENTS'}`;
  list.innerHTML=rows.length?rows.map(rowMarkup).join(''):'<p class="events-empty">No events have been created yet.</p>';
  list.querySelectorAll('[data-edit-event]').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>item.event_id===button.closest('[data-event-id]').dataset.eventId);if(row)editEvent(row);}));
  list.querySelectorAll('[data-cancel-event]').forEach(button=>button.addEventListener('click',async()=>{const id=button.closest('[data-event-id]').dataset.eventId;if(!confirm('Cancel this event? Members who saved it will continue to see it marked Cancelled in My Calendar.'))return;button.disabled=true;try{await cancelQueendomEventAdmin(id);await refresh();if(fields.id.value===id)resetForm();}catch(error){button.disabled=false;alert(error?.message||'This event could not be cancelled.');}}));
}
async function refresh(){rows=await loadQueendomEventsAdmin();const today=new Date().toISOString().slice(0,10);rows.sort((a,b)=>{const af=String(a.event_date||'')>=today,bf=String(b.event_date||'')>=today;if(af!==bf)return af?-1:1;const ad=String(a.event_date||''),bd=String(b.event_date||'');if(ad!==bd)return af?ad.localeCompare(bd):bd.localeCompare(ad);return String(a.start_time||'').localeCompare(String(b.start_time||''));});render();}
function payload(){return{event_id:fields.id.value||null,title:fields.title.value,event_type:fields.type.value,description:fields.description.value,event_date:fields.date.value,start_time:fields.start.value,end_time:fields.end.value||null,timezone:fields.timezone.value,host_name:null,host_member_id:fields.host.value||null,audience:fields.audience.value,zoom_url:fields.zoom.value,zoom_passcode:fields.passcode.value,image_path:fields.imagePath.value,image_url:fields.imageUrl.value,status:fields.status.value};}
async function save(event){
  event.preventDefault();message.textContent='';saveButton.disabled=true;saveButton.textContent='SAVING…';
  try{
    let values=payload();
    const id=values.event_id||crypto.randomUUID();values.event_id=id;fields.id.value=id;

    // Persist the event before artwork so a Storage problem never loses the
    // owner's calendar entry.
    await saveQueendomEventAdmin(values);

    if(fields.imageFile.files?.[0]){
      try{
        message.textContent='Event saved. Placing the event artwork…';
        const uploaded=await uploadQueendomEventImage(id,fields.imageFile.files[0]);
        fields.imagePath.value=uploaded.image_path;fields.imageUrl.value=uploaded.image_url;
        values={...values,...uploaded};
        await saveQueendomEventAdmin(values);
      }catch(imageError){
        message.textContent=`Event saved, but the artwork could not be added. ${imageError?.message||'Try the image again after Storage is ready.'}`;
        await refresh();
        const row=rows.find(item=>item.event_id===id);if(row)editEvent(row);
        return;
      }
    }

    message.textContent=fields.status.value==='published'?'Published. The event is live everywhere Flowtel shows the Queendom Calendar.':'Draft saved.';
    await refresh();
    const row=rows.find(item=>item.event_id===id);if(row)editEvent(row);
  }catch(error){message.textContent=error?.message||'This event could not be saved.';}
  finally{saveButton.disabled=false;saveButton.textContent='SAVE EVENT';}
}
fields.imageFile.addEventListener('change',()=>{const file=fields.imageFile.files?.[0];if(!file){setPreview(fields.imageUrl.value);return;}if(imageObjectUrl)URL.revokeObjectURL(imageObjectUrl);imageObjectUrl=URL.createObjectURL(file);imagePreview.innerHTML=`<img src="${esc(imageObjectUrl)}" alt="Selected event artwork preview">`;});
form.addEventListener('submit',save);newButton.addEventListener('click',resetForm);cancelButton.addEventListener('click',async()=>{const id=fields.id.value;if(!id||!confirm('Cancel this event? Members who saved it will continue to see it marked Cancelled in My Calendar.'))return;cancelButton.disabled=true;try{await cancelQueendomEventAdmin(id);await refresh();resetForm();}catch(error){message.textContent=error?.message||'This event could not be cancelled.';}finally{cancelButton.disabled=false;}});

async function init(){
  try{
    const profile=await getCurrentProfile();
    if(!profile||!['owner','admin'].includes(String(profile.role||'').toLowerCase()))throw new Error('Only Flowtel administration may open this room.');
    hosts=await loadQueendomEventHostsAdmin();
    renderHostOptions('');
    await refresh();gate.hidden=true;workspace.hidden=false;resetForm();
  }catch(error){gate.innerHTML=`<p class="eyebrow">OWNER ADMINISTRATION</p><h2>Queendom Events could not open.</h2><p>${esc(error?.message||'Return through the Concierge Desk and try again.')}</p>`;}
}
init();
