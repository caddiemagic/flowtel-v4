import {dashboardModel,timeLabel,dateLabel,kindLabel,replayLibrary} from '../dashboard-model.mjs';

import {supabase} from '../../shared/supabase.js';
import {flowtelTodayISO} from '../../shared/flowtel-date.js';
import {recordingUpload} from '../recording-upload.mjs';
import {pacificTimestamp} from '../pacific-time.mjs';
const $=id=>document.getElementById(id);
let token=null,offerings=[],enrollments=[],selected=null;
let emailVersion=0,profileVersion=0;
let profileData=null;
let focusVersion=0,focusKey=null;const focusDrafts=new Map();
function msg(id,message,isError=false){const node=$(id);node.textContent=message;node.className=isError?'error':'success'}
async function request(method='GET',body=null,query=''){
 const {data:auth,error:authError}=await supabase.auth.getSession();if(authError)throw authError;token=auth.session?.access_token;
 if(!token)throw Error('Sign in to Flowtel as the owner first.');
 const response=await fetch('/api/caddie-acuity?mentorship=owner'+query,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(response.status===401?'Your session expired. Sign in again.':response.status===403?'This Flowtel account does not have Concierge owner access.':data.error||'Request failed ('+response.status+')');
 return data;
}
async function connect(){
 const selectedId=selected?.id||new URLSearchParams(location.search).get('client');
 token=null;profileVersion++;clearProfile();$('detail').hidden=true;$('verificationPanel').hidden=true;$('save').disabled=true;$('session').textContent='Checking your Flowtel session…';$('enrollments').textContent='Checking…';
 try{
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  if(!data.session?.access_token){$('session').textContent='Not signed in. Use the Flowtel sign-in link above.';$('enrollments').textContent='Sign in to view enrollments.';return}
  token=data.session.access_token;
  const result=await request('GET',null,$('clientView').value==='archived'?'&enrollmentView=archived':'');offerings=result.offerings||[];enrollments=result.enrollments||[];
  $('verificationPanel').hidden=!result.developmentVerification;
  $('session').textContent='Owner session verified. Connected to Flowtel.';
  $('save').disabled=false;
  const dropdown=$('offering');dropdown.replaceChildren(new Option('Select an offering…',''));
  for(const o of offerings)dropdown.add(new Option(o.title+' · $'+(o.price_cents/100).toLocaleString('en-US'),o.id));
  render();
  if(selectedId){const current=enrollments.find(item=>item.id===selectedId);if(current)open(current);else{$('detail').hidden=true;selected=null}}
  $('welcomeSpace').hidden=Boolean(selected);msg('status','Your circle is ready.');
 }catch(error){$('session').textContent='Unable to connect to the Concierge API.';$('enrollments').textContent='No enrollment data loaded.';msg('status',error.message,true)}
}
function render(){
 const root=$('enrollments');root.replaceChildren();
 const search=$('search').value.trim().toLowerCase();
 const visible=enrollments.filter(item=>{const offering=offerings.find(o=>o.id===item.offering_id);return !search||[item.invited_email,item.status,offering?.title].some(value=>String(value||'').toLowerCase().includes(search))});
 if(!visible.length){root.textContent=search?'No matching enrollments.':'No saved mentorship enrollments yet.';return}
 for(const item of visible){
  const div=document.createElement('div');div.className='entry';
  const caption=document.createElement('p');caption.textContent=item.invited_email||'Linked client';caption.className='client-email';
  const offering=offerings.find(o=>o.id===item.offering_id);
  const summary=document.createElement('p');summary.className='small';summary.textContent=(offering?.title||'Offering')+' · '+item.status+' · '+(item.starts_on?'Starts '+item.starts_on:'Start not set')+(item.ends_on?' · Ends '+item.ends_on:'');
  const choose=document.createElement('button');choose.className='secondary';choose.textContent='Open her space';choose.type='button';choose.onclick=()=>open(item);
  div.append(caption,summary,choose);root.append(div);
 }
}
function refreshEnd(){if(!selected)return;const offer=offerings.find(o=>o.id===selected.offering_id);const start=$('starts').value;let text='Set a start date';if(offer&&start){const base=new Date(start+'T12:00:00Z');if(Number.isFinite(base.getTime())&&base.toISOString().slice(0,10)===start){if(offer.duration_months>0){const t=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+offer.duration_months,1,12));const last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0,12)).getUTCDate();t.setUTCDate(Math.min(base.getUTCDate(),last));text=t.toISOString().slice(0,10)}else if(offer.duration_days>0){base.setUTCDate(base.getUTCDate()+offer.duration_days);text=base.toISOString().slice(0,10)}else{text='No fixed expiration for this package'}}} $('ends').textContent=text;}
$('starts').addEventListener('change',refreshEnd);
$('search').addEventListener('input',render);
$('clientView').addEventListener('change',()=>{profileVersion++;profileData=null;clearProfile();selected=null;$('detail').hidden=true;emailVersion++;focusVersion++;connect();});
function open(item){$('quickReplayUpload').replaceChildren();$('quickReplayUpload').dataset.sessionId='';$('replaySessionChoice').replaceChildren(new Option('Choose her session…',''));selected=item;profileVersion++;profileData=null;$('welcomeSpace').hidden=true;$('profileTitle').textContent=item.invited_email?.split('@')[0]||'Your client';$('profileProgram').textContent='';$('profileStatus').textContent=item.status;loadProfile(item.id);$('archiveClient').hidden=item.status==='archived';$('restoreClient').hidden=item.status!=='archived';$('archiveStatus').textContent='';$('archiveNote').textContent=item.status==='archived'?'History and recordings are preserved. Restoring a linked client returns the mentorship as paused; unclaimed mentorships return to draft and must have access prepared again.':'Archiving removes this mentorship from the current list and stops client access. Session history and recordings are preserved. Their Flowtel account and other memberships are unchanged. Already issued playback links can remain valid for up to five minutes; booked appointments are unchanged.';loadAccessEmail(item);$('detail').hidden=false;$('selected').textContent=item.invited_email||'Linked Flowtel client';
 $('starts').value=item.starts_on||'';refreshEnd();
 $('saveDates').disabled=item.status!=='draft';
 $('preparePanel').hidden=item.status!=='draft';
 $('prepare').disabled=!item.starts_on;
 $('makeSessions').disabled=!['draft','invited'].includes(item.status);
 loadSessions(item.id);
 $('saveDates').textContent=item.status==='draft'?'Save program dates':'Only draft enrollments can be edited';$('month').value=flowtelTodayISO().slice(0,7);loadFocus();$('detail').scrollIntoView({behavior:'smooth'});history.replaceState(null,'','?client='+encodeURIComponent(item.id));msg('detailStatus','')}
$('refresh').addEventListener('click',connect);
$('verifyDevelopment').addEventListener('click',async()=>{
 const button=$('verifyDevelopment');button.disabled=true;$('verificationResults').replaceChildren();$('verificationCleanup').hidden=true;
 msg('verificationStatus','Checking the connected project. Keep this page open while disposable test records are removed.');
 try{const {verification:v}=await request('POST',{action:'verify-development'});
  for(const item of [...v.steps,...v.cleanup]){const li=document.createElement('li');li.textContent=(item.status==='passed'?'Passed: ':'Failed: ')+item.label;$('verificationResults').append(li);}
  msg('verificationStatus',v.passed?'Live checks passed and test resources were removed.':'The check needs attention. Reference: '+v.runId,!v.passed);
  if(!v.cleanupComplete){$('verificationCleanup').hidden=false;$('verificationCleanup').textContent='Cleanup needs attention. Save this reference for follow-up:\n'+JSON.stringify(v.remainingResourceReferences,null,2);}
 }catch(error){msg('verificationStatus','The check did not return a complete result. Cleanup is unverified; please report this before running again. '+error.message,true);}
 finally{button.disabled=false;}
});
$('create').addEventListener('submit',async e=>{
 e.preventDefault();$('save').disabled=true;
 try{
 const result=await request('POST',{action:'create-draft',email:$('email').value.trim(),offeringId:$('offering').value,startsOn:$('newStart').value||null});
 msg('createStatus','Draft saved with calculated dates. No invitation was sent.');$('email').value='';$('newStart').value='';
 await connect();const row=enrollments.find(x=>x.id===result.enrollment?.id);if(row)open(row);
 }catch(error){msg('createStatus',error.message,true)}finally{$('save').disabled=false}
});
$('update').addEventListener('submit',async e=>{
 e.preventDefault();if(!selected)return;
 try{await request('POST',{action:'update-draft',enrollmentId:selected.id,startsOn:$('starts').value||null});await connect();msg('detailStatus','Program dates saved.')}catch(error){msg('detailStatus',error.message,true)}
});
async function loadSessions(id){const root=$('sessionList');const openSessions=new Set([...root.querySelectorAll('details.session-edit[open]')].map(el=>el.dataset.sessionId));root.textContent='Loading sessions…';try{const resp=await fetch('/api/caddie-acuity?mentorship=owner&sessionsFor='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token},cache:'no-store'});const json=await resp.json();if(!resp.ok)throw Error(json.error||'Could not load sessions');if(selected?.id!==id||!token)return;root.replaceChildren();if(!json.sessions?.length){root.textContent='No sessions prepared yet.';return}for(const session of json.sessions){
 const line=document.createElement('details');line.className='session-edit';line.dataset.sessionId=session.id;line.open=openSessions.has(session.id);
 const heading=document.createElement('summary');heading.className='small';
 heading.textContent='Session '+session.session_number+' · '+session.session_kind+' · '+session.duration_minutes+' minutes · '+session.status+(session.scheduled_at?' · '+new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(session.scheduled_at))+' Pacific':'');
 const date=document.createElement('input');date.type='date';date.setAttribute('aria-label','Session '+session.session_number+' date');
 const time=document.createElement('input');time.type='time';time.value='11:00';time.setAttribute('aria-label','Session '+session.session_number+' time in Pacific Time');
 const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Save proposed time';
 button.onclick=async()=>{if(!date.value||!time.value){msg('detailStatus','Select a date and time first.',true);return}button.disabled=true;try{const instant=pacificTimestamp(date.value,time.value);await request('POST',{action:'set-session-time',enrollmentId:id,sessionId:session.id,scheduledAt:instant});msg('detailStatus','Proposed session time saved. No appointment booked.');await loadSessions(id)}catch(error){localStatus.textContent=error.message;localStatus.className='error';msg('detailStatus',error.message,true)}finally{button.disabled=false}};
 const localStatus=document.createElement('p');localStatus.setAttribute('role','status');
 const inputs=document.createElement('div');inputs.className='row';inputs.append(date,time,button);line.append(heading,localStatus,inputs);
 button.disabled=Boolean(session.appointment_id)||!['unscheduled','proposed','confirmed'].includes(session.status);date.disabled=Boolean(session.appointment_id);time.disabled=Boolean(session.appointment_id);
 if(session.scheduled_at){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(session.scheduled_at));const part=name=>parts.find(p=>p.type===name)?.value;date.value=part('year')+'-'+part('month')+'-'+part('day');time.value=part('hour')+':'+part('minute');}
 if(session.appointment_id){const note=document.createElement('p');note.className='small';note.textContent='Linked booking · Make schedule changes in Acuity, then refresh booking details below.';line.append(note);}
 for(const [operation,label,states] of [['confirm','Confirm',['proposed']],['complete','Mark complete',['confirmed']],['cancel','Cancel session',['unscheduled','proposed','confirmed']],['reopen','Reopen session',['cancelled']]]){
 if(operation==='reopen'&&session.status!=='cancelled')continue;
 const control=document.createElement('button');control.type='button';control.textContent=label;control.disabled=!states.includes(session.status);control.onclick=async()=>{control.disabled=true;try{await request('POST',{action:'session-transition',operation,enrollmentId:id,sessionId:session.id});await loadSessions(id);msg('detailStatus','Session updated.')}catch(e){localStatus.textContent=e.message;localStatus.className='error';msg('detailStatus',e.message,true);control.disabled=false}};line.append(control);
 }
 if(['flexible','empowerment'].includes(session.session_kind)||session.appointment_id){const panel=document.createElement('div');const manage=document.createElement('button');manage.type='button';manage.className='secondary';manage.textContent='Link session '+session.session_number+' booking';manage.onclick=()=>renderBooking(panel,id,session);panel.append(manage);line.append(panel);}
 const recordingPanel=document.createElement('details');recordingPanel.className='recording-editor';const recordingSummary=document.createElement('summary');recordingSummary.textContent='Session replay · upload & publication';const recording=document.createElement('div');recordingPanel.append(recordingSummary,recording);line.append(recordingPanel);renderRecordings(recording,id,session.id);root.append(line)
}void loadProfile(id);}catch(error){if(selected?.id===id)root.textContent=error.message}}

async function renderBooking(root,enrollmentId,session){
 root.textContent='Loading matching bookings…';
 try{const data=await request('GET',null,'&bookingsFor='+session.id+'&enrollmentId='+enrollmentId);root.replaceChildren();const note=document.createElement('p');note.className='small';note.textContent=data.note;root.append(note);
 const act=async(action,appointmentId)=>{try{await request('POST',{action,enrollmentId,sessionId:session.id,...(appointmentId?{appointmentId}:{})});await loadSessions(enrollmentId);msg('detailStatus',action==='unlink-booking'?'Booking unlinked. The appointment in Acuity was not changed.':'Booking details saved to this mentorship session.');}catch(error){msg('detailStatus',error.message,true);const message=document.createElement('p');message.className='error';message.textContent=error.message;root.append(message);}};
 if(data.linked){const description=document.createElement('p');description.textContent=data.linked.unavailable?'The linked booking is unavailable.':new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(data.linked.startsAt))+' Pacific · '+data.linked.status+' · '+(data.linked.zoomReady?'Zoom link ready':'Meeting link pending');root.append(description);for(const [action,label] of [['refresh-booking','Refresh booking details'],['unlink-booking','Unlink booking']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=async()=>{button.disabled=true;try{await act(action);}finally{button.disabled=false;}};root.append(button);}return;}
 if(!data.bookings?.length){const empty=document.createElement('p');empty.className='small';empty.textContent='No matching bookings are available in Flowtel yet. You can enter the session time manually.';root.append(empty);return;}
 const select=document.createElement('select');select.setAttribute('aria-label','Session '+session.session_number+' existing booking');select.add(new Option('Choose an existing booking…',''));for(const booking of data.bookings)select.add(new Option(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(booking.startsAt))+' Pacific · '+booking.durationMinutes+' minutes · '+booking.status,booking.id));const link=document.createElement('button');link.type='button';link.textContent='Link session '+session.session_number+' booking';link.onclick=async()=>{if(!select.value)return;link.disabled=true;try{await act('link-booking',select.value);}finally{link.disabled=false;}};root.append(select,link);
 }catch(error){root.textContent=error.message;}
}
async function renderRecordings(root,enrollmentId,sessionId){
 root.dataset.sessionId=sessionId;root.replaceChildren();const title=document.createElement('input');title.placeholder='Recording title';title.maxLength=200;title.setAttribute('aria-label','Recording title');const file=document.createElement('input');file.type='file';file.accept='video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm';file.setAttribute('aria-label','Session recording');
 const upload=document.createElement('button');upload.type='button';upload.textContent='Upload private recording';
 const progress=document.createElement('progress');progress.hidden=true;progress.setAttribute('aria-label','Recording upload in progress');
 const uploadStatus=document.createElement('p');uploadStatus.className='small';uploadStatus.setAttribute('role','status');
 const workflow=recordingUpload({
  authorize:async data=>(await request('POST',{action:'begin-upload',enrollmentId,sessionId,...data})).upload,
  transfer:async(target,chosen,mimeType)=>{const {error}=await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path,target.token,chosen,{contentType:mimeType});if(error)throw error;},
  finalize:data=>request('POST',{action:'finish-upload',enrollmentId,sessionId,...data}),
  onStage:stage=>{uploadStatus.textContent={authorizing:'Preparing your private upload…',uploading:'Uploading your recording. Keep this page open.',saving:'Upload complete. Saving recording details…',complete:'Recording saved privately.'}[stage];}
 });
 upload.onclick=async()=>{
  upload.disabled=true;file.disabled=true;title.disabled=true;progress.hidden=false;uploadStatus.className='small';
  try{
   await workflow.save(file.files[0],title.value);
   if(root.isConnected&&selected?.id===enrollmentId&&root.dataset.sessionId===sessionId){msg('detailStatus','Recording saved privately. Publish it below when ready.');await renderRecordings(root,enrollmentId,sessionId);void loadProfile(enrollmentId);}
  }catch(error){
   uploadStatus.textContent=(workflow.uploaded?'Your file is uploaded privately. Retry saving its details without uploading again. ':'')+error.message;
   uploadStatus.className='error';upload.textContent=workflow.uploaded?'Retry saving recording':'Upload private recording';
   if(root.isConnected&&selected?.id===enrollmentId&&root.dataset.sessionId===sessionId)msg('detailStatus',uploadStatus.textContent,true);
  }finally{progress.hidden=true;upload.disabled=false;file.disabled=workflow.uploaded;title.disabled=false;}
 };
 root.append(title,file,upload,progress,uploadStatus);
 try{const response=await fetch('/api/caddie-acuity?mentorship=owner&enrollmentId='+enrollmentId+'&replaysFor='+sessionId,{headers:{Authorization:'Bearer '+token},cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load recordings');if(!root.isConnected||selected?.id!==enrollmentId||root.dataset.sessionId!==sessionId)return;for(const replay of data.replays||[]){const row=document.createElement('p');row.textContent=replay.title+' · '+(replay.visible_to_client?'Published':'Private')+' ';const toggle=document.createElement('button');toggle.type='button';toggle.textContent=replay.visible_to_client?'Hide from client':'Publish to client';toggle.onclick=async()=>{toggle.disabled=true;try{await request('POST',{action:'replay-visibility',enrollmentId,sessionId,replayId:replay.id,visible:!replay.visible_to_client});await renderRecordings(root,enrollmentId,sessionId);void loadProfile(enrollmentId);}catch(e){msg('detailStatus',e.message,true);toggle.disabled=false}};const play=document.createElement('button');play.type='button';play.className='secondary';play.textContent='Play replay';play.onclick=async()=>{play.disabled=true;try{const result=await request('GET',null,'&ownerReplay='+encodeURIComponent(replay.id)+'&enrollmentId='+encodeURIComponent(enrollmentId)+'&sessionId='+encodeURIComponent(sessionId));if(!root.isConnected||selected?.id!==enrollmentId)return;const media=document.createElement('video');media.controls=true;media.preload='metadata';media.src=result.playback.url;root.querySelectorAll('video').forEach(v=>{v.pause();v.remove();});root.append(media);}catch(e){msg('detailStatus',e.message,true);}finally{play.disabled=false;}};row.append(toggle,play);root.append(row)}}catch(e){root.append(document.createTextNode(e.message))}
}
$('makeSessions').addEventListener('click',async()=>{if(!selected)return;$('makeSessions').disabled=true;try{const result=await request('POST',{action:'prepare-sessions',enrollmentId:selected.id});msg('detailStatus',result.created?'Included sessions created. No bookings were made.':'Existing session plan loaded.');await loadSessions(selected.id)}catch(error){msg('detailStatus',error.message,true)}finally{$('makeSessions').disabled=false}});
async function changeClientArchive(restore){
 const item=selected;if(!item)return;
 if(!restore&&!confirm('Archive '+(item.invited_email||'this client')+'? This stops mentorship access and preserves their history and recordings.'))return;
 $('archiveClient').disabled=true;$('restoreClient').disabled=true;
 try{await request('POST',{action:restore?'restore-client':'archive-client',enrollmentId:item.id});selected=null;$('detail').hidden=true;emailVersion++;focusVersion++;await connect();msg('status',restore?'Client restored. Linked mentorships return paused; unclaimed ones return to draft. Switch to Current clients to manage them.':'Client archived. History and recordings are preserved. Find them under Archived clients.');}catch(e){msg('archiveStatus',e.message,true);}finally{$('archiveClient').disabled=false;$('restoreClient').disabled=false;}
}
$('archiveClient').onclick=()=>changeClientArchive(false);$('restoreClient').onclick=()=>changeClientArchive(true);
async function loadAccessEmail(item){
 const version=++emailVersion;$('accessEmailPanel').hidden=!['invited','active'].includes(item.status);$('sendAccessEmail').disabled=true;$('accessEmailCopy').value='';$('accessEmailRecipient').textContent='';$('accessEmailSubject').textContent='';$('accessEmailLink').removeAttribute('href');$('accessEmailStatus').textContent='';
 if($('accessEmailPanel').hidden)return;
 msg('accessEmailStatus','Loading welcome message…');
 try{const {emailPreview:m}=await request('GET',null,'&accessEmailFor='+encodeURIComponent(item.id));if(version!==emailVersion||selected?.id!==item.id)return;$('accessEmailRecipient').textContent='To: '+m.email;$('accessEmailSubject').textContent='Subject: '+m.subject;$('accessEmailCopy').value=m.text;$('accessEmailLink').href=m.url;$('sendAccessEmail').disabled=!m.configured;msg('accessEmailStatus',m.configured?'Ready to send when you choose.':'Email delivery is not configured. You can copy the client access link above.',!m.configured);}catch(e){if(version===emailVersion)msg('accessEmailStatus',e.message,true);}
}
$('sendAccessEmail').addEventListener('click',async()=>{const id=selected?.id,version=emailVersion;if(!id)return;const button=$('sendAccessEmail');button.disabled=true;msg('accessEmailStatus','Sending access email…');try{const result=await request('POST',{action:'send-access-email',enrollmentId:id});if(version===emailVersion&&selected?.id===id)msg('accessEmailStatus',result.message+' To: '+result.email);}catch(e){if(version===emailVersion&&selected?.id===id)msg('accessEmailStatus',e.message,true);}finally{if(version===emailVersion&&selected?.id===id)button.disabled=false;}});
$('prepare').addEventListener('click',async()=>{if(!selected||selected.status!=='draft')return;$('prepare').disabled=true;try{await request('POST',{action:'prepare-access',enrollmentId:selected.id});await connect();msg('detailStatus','Access prepared. No email sent. Client can claim with their verified Flowtel email.')}catch(error){msg('detailStatus',error.message,true);$('prepare').disabled=false}});
async function loadFocus(){
 const version=++focusVersion,id=selected?.id,month=$('month').value;
 focusKey=id&&month?id+'/'+month:null;$('focus').value='';$('focus').disabled=true;$('saveFocus').disabled=true;
 if(!focusKey){msg('focusStatus','Choose a client and month.');return;}
 const key=focusKey;msg('focusStatus','Loading saved focus…');
 try{
  const draft=focusDrafts.get(key);const result=draft===undefined?await request('GET',null,'&focusFor='+encodeURIComponent(id)+'&month='+encodeURIComponent(month+'-01')):null;
  if(version!==focusVersion||selected?.id!==id)return;
  $('focus').value=draft===undefined?(result.focus?.focus||''):draft;
  $('focus').disabled=false;$('saveFocus').disabled=selected?.status==='archived';
  msg('focusStatus',draft!==undefined?'Unsaved changes restored.':result.focus?'Saved focus loaded.':'No focus saved for this month yet.');
 }catch(error){if(version===focusVersion)msg('focusStatus','Could not load saved focus. Choose the month again to retry. '+error.message,true);}
}
$('month').addEventListener('change',loadFocus);
$('focus').addEventListener('input',()=>{if(focusKey){focusDrafts.set(focusKey,$('focus').value);msg('focusStatus','Unsaved changes.');}});
$('focusForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!selected||$('saveFocus').disabled)return;
 const id=selected.id,month=$('month').value,key=focusKey,text=$('focus').value;
 $('saveFocus').disabled=true;
 try{await request('POST',{action:'save-focus',enrollmentId:id,month:month+'-01',focus:text});
  if(focusDrafts.get(key)===text)focusDrafts.delete(key);
  if(selected?.id===id)void loadProfile(id);
  if(focusKey===key){msg('focusStatus',focusDrafts.has(key)?'Earlier version saved. Your new changes are still unsaved.':'Monthly focus saved.');msg('detailStatus','Client-visible monthly focus saved. No invitation was sent.');}
 }catch(error){if(focusKey===key)msg('focusStatus',error.message,true);}
 finally{if(focusKey===key)$('saveFocus').disabled=selected?.status==='archived';}
});
supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){for(const id of ['profileTitle','profileProgram','profileStatus','selected'])$(id).textContent='';$('quickReplayUpload').replaceChildren();$('replaySessionChoice').replaceChildren();profileVersion++;profileData=null;clearProfile();$('welcomeSpace').hidden=false;emailVersion++;$('accessEmailPanel').hidden=true;$('accessEmailCopy').value='';$('accessEmailRecipient').textContent='';$('accessEmailSubject').textContent='';$('accessEmailStatus').textContent='';$('accessEmailLink').removeAttribute('href');$('sendAccessEmail').disabled=true;focusVersion++;focusKey=null;focusDrafts.clear();$('focusStatus').textContent='';$('saveFocus').disabled=true;$('verificationPanel').hidden=true;$('verificationResults').replaceChildren();$('verificationCleanup').textContent='';token=null;selected=null;offerings=[];enrollments=[];$('detail').hidden=true;$('sessionList').replaceChildren();$('enrollments').replaceChildren();$('focus').value='';$('email').value='';$('save').disabled=true;$('session').textContent='Signed out';}});
connect();

function node(tag,text,cls=''){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function clearProfile(){for(const id of ['ownerOverview','callOverview','clientReflections','clientCheckins'])$(id).replaceChildren();$('clientFlowMap').hidden=true;$('clientFlowMap').removeAttribute('href');$('clientDashboardLink').removeAttribute('href');$('profileLoading').textContent='';document.querySelectorAll('video,audio').forEach(media=>{media.pause();media.removeAttribute('src');media.load();media.remove();});}
async function loadProfile(id){
 if(selected?.id!==id)return;const version=++profileVersion;clearProfile();$('profileLoading').textContent='Opening her space…';
 try{const data=await request('GET',null,'&profileFor='+encodeURIComponent(id));if(version!==profileVersion||selected?.id!==id||!token)return;profileData=data;renderProfile(data,id);$('profileLoading').textContent='';}catch(e){if(version===profileVersion&&selected?.id===id)$('profileLoading').textContent='Her profile could not load. Refresh the connection to try again. '+e.message;}
}
$('replaySessionChoice').onchange=()=>{const id=selected?.id,sessionId=$('replaySessionChoice').value;$('quickReplayUpload').replaceChildren();$('quickReplayUpload').dataset.sessionId='';if(id&&profileData?.suite.sessions.some(s=>s.id===sessionId))void renderRecordings($('quickReplayUpload'),id,sessionId);};
function renderProfile(data,id){
 const {suite,flow}=data,model=dashboardModel(suite);const chosenReplaySession=$('replaySessionChoice').value;$('replaySessionChoice').replaceChildren(new Option('Choose her session…',''));for(const session of model.sessions)$('replaySessionChoice').add(new Option('Session '+session.session_number+' · '+kindLabel(session.session_kind)+(session.scheduled_at?' · '+timeLabel(session.scheduled_at):''),session.id));if(model.sessions.some(s=>s.id===chosenReplaySession))$('replaySessionChoice').value=chosenReplaySession;$('profileTitle').textContent=flow.name||selected.invited_email?.split('@')[0]||'Your client';$('profileProgram').textContent=suite.enrollment.programTitle;$('profileStatus').textContent=suite.enrollment.status;
 $('clientDashboardLink').href='../owner-dashboard/?enrollmentId='+encodeURIComponent(id);
 if(flow.subjectId){$('clientFlowMap').hidden=false;$('clientFlowMap').href='/flow-map/?client='+encodeURIComponent(flow.subjectId);}
 const overview=$('ownerOverview');overview.replaceChildren();
 const cycle=node('article','','card cycle-card');cycle.append(node('p','HER CURRENT RHYTHM','eyebrow'),node('h3',flow.cycle?.day?(flow.cycle.calculated?'Cycle day ':'Recorded day ')+flow.cycle.day:'Her cycle'),node('p',flow.cycle?.season||'','season'),node('p',flow.available?(flow.cycle?'Last checked in '+dateLabel(flow.cycle.asOf):'Her first Flowtel check-in will appear here.'):flow.reason,'small'));
 if(flow.totalCheckins!==null)cycle.append(node('p',flow.totalCheckins+' Flowtel check-ins','small'));overview.append(cycle);
 const focus=node('article','','card');focus.append(node('p','THIS MONTH’S FOCUS','eyebrow'),node('p',model.focus?.client_visible_focus||'A little space to set this month’s focus.','focus-copy'));overview.append(focus);
 const journey=node('article','','card');journey.append(node('p','HER MENTORSHIP JOURNEY','eyebrow'),node('h4',dateLabel(suite.enrollment.startsOn)+(suite.enrollment.endsOn?' — '+dateLabel(suite.enrollment.endsOn):'')));
 const metrics=node('div','','metrics');for(const [value,label] of [[model.completed,'Completed'],[model.remaining,'To come'],[suite.replays.length,'Published replays']]){const metric=node('div','');metric.append(node('strong',value),node('span',label));metrics.append(metric);}journey.append(metrics);overview.append(journey);
 const next=node('article','','card');next.append(node('p','YOUR NEXT CONVERSATION','eyebrow'),node('h4',model.nextCall?timeLabel(model.nextCall.scheduled_at):model.total?'A little space before your next call.':'Her calls are being prepared.'),node('p',model.nextCall?kindLabel(model.nextCall.session_kind)+' · '+model.nextCall.duration_minutes+' minutes':'Confirmed session details will gather here.','small'));overview.append(next);
 const calls=$('callOverview');calls.replaceChildren();const planned=model.sessions.filter(s=>!['completed','cancelled','missed'].includes(s.status));if(!planned.length)calls.append(node('p',model.total?'There are no upcoming calls. Her history is kept in the session editor below.':'Prepare her included sessions when you’re ready.','empty'));
 for(const session of planned){const line=node('div','','session-summary');const copy=node('div','');copy.append(node('strong',kindLabel(session.session_kind)),node('p',session.scheduled_at?timeLabel(session.scheduled_at):'Date to be arranged','small'));line.append(copy,node('span',session.status,'badge'));calls.append(line);}
 const recordings=replayLibrary(suite);if(recordings.length){calls.append(node('h4','Published replay library'));for(const {replay,date} of recordings){const line=node('div','','replay-summary');line.append(node('strong',replay.title),node('p',date?timeLabel(date):'Date not recorded','small'));const play=node('button','Play replay','secondary');play.onclick=async()=>{play.disabled=true;try{const result=await request('GET',null,'&ownerReplay='+encodeURIComponent(replay.id)+'&enrollmentId='+encodeURIComponent(id)+'&sessionId='+encodeURIComponent(replay.sessionId));if(selected?.id!==id||!line.isConnected)return;line.querySelectorAll('video').forEach(v=>{v.pause();v.remove();});const media=document.createElement('video');media.controls=true;media.preload='metadata';media.src=result.playback.url;line.append(media);}catch(e){msg('detailStatus',e.message,true);}finally{play.disabled=false;}};line.append(play);calls.append(line);}}else calls.append(node('p','No replays published yet. Open a session below to upload and share its recording.','small'));
 const reflections=$('clientReflections');reflections.replaceChildren();let shown=0;const add=()=>{for(const reflection of flow.reflections.slice(shown,shown+8)){const entry=node('article','','reflection');entry.append(node('p',(String(reflection.date).includes('T')?timeLabel(reflection.date):dateLabel(reflection.date))+' · '+(reflection.day?'Cycle day '+reflection.day:'Cycle day not recorded')+(reflection.season?' · '+reflection.season:''),'eyebrow'),node('p',reflection.text,'reflection-copy'));reflections.append(entry);}shown+=8;};add();if(!flow.reflections.length)reflections.append(node('p',flow.available?'Her check-in reflections will gather here.':flow.reason,'empty'));if(flow.reflections.length>8){const more=node('button','Read more reflections','secondary');more.onclick=()=>{more.remove();add();if(shown<flow.reflections.length)reflections.append(more);};reflections.append(more);}
 const checkins=$('clientCheckins');checkins.replaceChildren();if(!flow.checkins.length)checkins.append(node('p',flow.available?'Her first cycle check-in will appear here.':flow.reason,'empty'));
 const recent=node('div','');for(const checkin of flow.checkins){const line=node('div','','checkin');line.append(node('span',dateLabel(checkin.date)),node('span',checkin.day?'Day '+checkin.day:'Day not recorded'),node('span',checkin.season||'Season not recorded','badge'));recent.append(line);}if(flow.checkins.length){const history=document.createElement('details');history.append(node('summary','Recent check-ins · '+flow.checkins.length),recent);checkins.append(history);}
}
