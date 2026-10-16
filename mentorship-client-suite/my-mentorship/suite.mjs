const fictionalPreview=document.body.dataset.preview==='fictional';
const demo=fictionalPreview?await import('../dashboard-preview.mjs'):null;
const supabase=fictionalPreview?demo.demoAuth:(await import('../../shared/supabase.js')).supabase;
import {getMoonMagic} from '../../shared/moon.js';
import {flowtelTodayISO,formatDateOnly} from '../../shared/flowtel-date.js';
import {dashboardModel,filterSessions,kindLabel,dateLabel,timeLabel} from '../dashboard-model.mjs';
import {sessionCalendar} from '../session-calendar.mjs';
const $=id=>document.getElementById(id),base='/api/caddie-acuity?mentorship=client';
let epoch=0,selection=null,account=null,currentSuite=null,currentVersion=0;
const panels=['home','calls'];
let activePanel=location.hash==='#recordings'?'calls':panels.includes(location.hash.slice(1))?location.hash.slice(1):'home';
function stopPlayers(){for(const media of document.querySelectorAll('video,audio'))media.pause();}
function discardSessionView(){stopPlayers();for(const media of document.querySelectorAll('video,audio')){media.removeAttribute('src');media.load();media.remove();}if($('sessionDialog').open)$('sessionDialog').close();$('sessionDetailBody').replaceChildren();$('sessionDetailTitle').textContent='';currentSuite=null;}
function element(tag,text,cls=''){const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;}
function empty(root,text){root.replaceChildren(element('p',text,'empty'));}
function room(name,writeHistory=true){if(name==='recordings')name='calls';if(!panels.includes(name))name='home';stopPlayers();activePanel=name;if(writeHistory&&location.hash!=='#'+name)history.pushState(null,'','#'+name);for(const button of document.querySelectorAll('[data-panel]')){const active=button.dataset.panel===name;button.setAttribute('aria-pressed',String(active));$(button.dataset.panel).hidden=!active;}$('recordings').hidden=name!=='calls';}
window.addEventListener('popstate',()=>room(location.hash.slice(1),false));
window.addEventListener('hashchange',()=>room(location.hash.slice(1),false));
for(const button of document.querySelectorAll('[data-panel]'))button.onclick=()=>room(button.dataset.panel);
for(const button of document.querySelectorAll('[data-open]'))button.onclick=()=>{room(button.dataset.open);$(button.dataset.open).scrollIntoView({behavior:'smooth',block:'start'});};
async function request(params='',body=null){
 if(fictionalPreview)return demo.demoRequest(params,body);
 const {data,error}=await supabase.auth.getSession();if(error)throw error;
 const token=data.session?.access_token;if(!token)throw Object.assign(Error('Sign into Flowtel to open your mentorship.'),{status:401});
 const res=await fetch(base+params,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const json=await res.json().catch(()=>({}));if(!res.ok)throw Object.assign(Error(res.status===404?'This mentorship is not available to this account.':json.error||'Your suite could not load. Please try again.'),{status:res.status});return json;
}
function clearPrivate(){
 discardSessionView();
 epoch++;selection=null;currentSuite=null;
 $('callFilter').value='upcoming';$('callResults').textContent='';$('sessionDetailBody').replaceChildren();$('sessionDetailTitle').textContent='';$('replaySearch').value='';$('replaySession').replaceChildren(new Option('All sessions',''));$('replayResults').textContent='';
 for(const id of ['enrollments','prepared','sessions','focus','replays','nextCall'])$(id).replaceChildren();
 for(const id of ['title','dates','currentFocus','focusMonth','cycleHeading','cycleSeason','cycleNote','programStatus','progressNote'])$(id).textContent='';
 for(const id of ['completedCount','remainingCount','replayCount'])$(id).textContent='0';
 $('progressBar').style.width='0%';$('progressCaption').textContent='';
 for(const id of ['detail','preparedSection','enrollmentSection'])$(id).hidden=true;
}
function renderNext(model){
 const root=$('nextCall');root.replaceChildren();
 if(model.nextCall){const s=model.nextCall;root.append(element('h3',timeLabel(s.scheduled_at)),element('p',kindLabel(s.session_kind)+' · '+s.duration_minutes+' minutes'),element('span','Confirmed','badge'));if(s.meeting_url){const link=element('a','Join Zoom','button-link');link.href=s.meeting_url;link.target='_blank';link.rel='noopener noreferrer';root.append(link);}else root.append(element('p','Your meeting link will appear when it is ready.','muted'));}
 else{root.append(element('h3',model.remaining?'A little space before our next call.':'Your journey, witnessed.'),element('p',model.remaining?'Your next confirmed session will appear here.':'Your session history and recordings are here to revisit.'));}
 const button=element('button',model.nextCall?'View session details →':'View your sessions →','text-button');button.onclick=()=>model.nextCall?showSession(model.nextCall):room('calls');root.append(button);if(model.nextCall&&currentSuite)root.append(calendarButton(model.nextCall));
}
function renderSessions(model){
 const root=$('sessions');root.replaceChildren();
 const sessions=filterSessions(model.sessions,$('callFilter').value);
 $('callResults').textContent=sessions.length+' session'+(sessions.length===1?'':'s');
 if(!model.sessions.length){empty(root,'Your session plan is being prepared. Your included calls will appear here.');return;}
 if(!sessions.length){empty(root,$('callFilter').value==='history'?'Your session history will gather here as your journey unfolds.':'No upcoming sessions in this view. Choose All sessions to revisit your journey.');return;}
 const pending=new Set(model.pastPending.map(s=>s.id));
 for(const s of sessions){
 const card=element('article','','card session-card');card.dataset.status=s.status;card.append(element('span',String(s.session_number).padStart(2,'0'),'session-number'));
 const content=element('div','');content.append(element('h4',kindLabel(s.session_kind)),element('p',s.scheduled_at?timeLabel(s.scheduled_at):'Date to be arranged'),element('p',s.duration_minutes+' minutes','muted'));
 if(s.booking_state==='needs_review')content.append(element('p','Your booking details are being reviewed. Your updated time will appear here.','muted'));
 if(s.status==='proposed'&&s.booking_state!=='needs_review')content.append(element('p','A proposed time, awaiting confirmation.','muted'));
 if(pending.has(s.id))content.append(element('p','Awaiting a session update.','muted'));
 const state=element('div','','session-status');state.append(element('span',s.status,'badge'));if(s.meeting_url){const join=element('a','Join Zoom','text-link');join.href=s.meeting_url;join.target='_blank';join.rel='noopener noreferrer';state.append(join);}const details=element('button','View session '+s.session_number+' details','text-button');details.onclick=()=>showSession(s);content.append(details);card.append(content,state);root.append(card);
 }
}
function renderFocus(model){
 $('focusMonth').textContent=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'America/Los_Angeles'}).format(new Date(model.today+'T12:00:00-08:00'));
 $('currentFocus').textContent=model.focus?.client_visible_focus||'Your focus for this month will appear here when it is ready.';
 const root=$('focus');root.replaceChildren();if(!model.focuses.length){empty(root,'As your journey unfolds, your monthly focus will be gathered here.');return;}
 for(const f of model.focuses){const row=element('div','','focus-entry');row.append(element('strong',formatDateOnly(f.focus_month,{month:'long',year:'numeric'})),element('p',f.client_visible_focus));root.append(row);}
}
function renderReplays(suite,id,version){
 stopPlayers();const root=$('replays');root.replaceChildren();const search=$('replaySearch').value.trim().toLocaleLowerCase();const sessionFilter=$('replaySession').value;
 const replays=(suite.replays||[]).filter(replay=>(!sessionFilter||replay.sessionId===sessionFilter)&&(!search||String(replay.title||'').toLocaleLowerCase().includes(search)));
 $('replayResults').textContent=replays.length+' recording'+(replays.length===1?'':'s')+(search||sessionFilter?' found':'');
 if(!replays.length){empty(root,(suite.replays||[]).length?'No recordings match these filters. Try another title or choose All sessions.':'No recordings available yet. Published session recordings will be gathered here.');return;}
 for(const replay of replays){
 const card=element('article','','card recording-card');const session=(suite.sessions||[]).find(s=>s.id===replay.sessionId);
 card.append(element('p',session?'SESSION '+session.session_number+' · '+kindLabel(session.session_kind):'YOUR PRIVATE RECORDING','eyebrow'),element('h4',replay.title||'Session recording'));
 if(session?.scheduled_at)card.append(element('p',timeLabel(session.scheduled_at),'muted'));
 const button=element('button','Play recording'),message=element('p','','error');message.setAttribute('role','status');
 button.onclick=async()=>{button.disabled=true;message.textContent='';try{
 const data=await request('&enrollmentId='+encodeURIComponent(id)+'&playbackReplayId='+encodeURIComponent(replay.id));if(version!==epoch||selection!==id)return;
 let url;try{url=new URL(data.playback.url);if(!['https:','http:'].includes(url.protocol))throw Error();}catch{throw Error('This recording could not be opened. Please try again.');}
 const old=card.querySelector('video');if(old){old.pause();old.remove();}
 const media=document.createElement('video');media.controls=true;media.preload='metadata';media.src=url.href;media.setAttribute('aria-label',replay.title||'Session recording');media.addEventListener('play',()=>{for(const other of document.querySelectorAll('video,audio'))if(other!==media)other.pause();});media.addEventListener('error',()=>{message.textContent='Playback could not load. Select Refresh recording to try a new link.';});card.append(media);button.textContent='Refresh recording';
 }catch(error){if(version===epoch)message.textContent=error.message;}finally{button.disabled=false;}};
 card.append(button,message);root.append(card);
 }
}
function calendarButton(session){
 const button=element('button','Add to calendar','text-button');
 button.onclick=()=>{try{const text=sessionCalendar(session,currentSuite?.enrollment.programTitle);const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='flowtel-session-'+session.session_number+'.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){$('error').textContent=error.message;}};
 return button;
}
function showSession(session){
 if(!currentSuite)return;
 const root=$('sessionDetailBody');root.replaceChildren();$('sessionDetailTitle').textContent='Session '+session.session_number+' · '+kindLabel(session.session_kind);
 root.append(element('span',session.status,'badge'),element('p',session.scheduled_at?timeLabel(session.scheduled_at):'Date to be arranged','large-copy'),element('p',session.duration_minutes+' minutes · Flowtel Time (Pacific)','muted'));
 if(session.status==='confirmed'){
  const actions=element('div','','session-actions');actions.append(calendarButton(session));
  if(session.meeting_url){const link=element('a','Join Zoom','button-link');link.href=session.meeting_url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);}
  root.append(actions,element('p','If your session time changes, download the updated calendar file from your suite.','muted'));
 }else if(session.status==='proposed')root.append(element('p','This time is proposed. Your calendar download will be available once the session is confirmed.','muted'));
 if(session.scheduled_at){
  const month=flowtelTodayISO(new Date(session.scheduled_at)).slice(0,7)+'-01';const focus=(currentSuite.monthlyFocus||[]).find(item=>item.focus_month===month);
  if(focus?.client_visible_focus){const card=element('section','','session-focus');card.append(element('p','FOCUS FOR '+formatDateOnly(month,{month:'long',year:'numeric'}),'eyebrow'),element('p',focus.client_visible_focus,'session-focus-copy'));root.append(card);}
 }
 const replays=(currentSuite.replays||[]).filter(replay=>replay.sessionId===session.id);
 if(replays.length){root.append(element('h3','Return to this session'));const list=element('ul','','session-recordings');for(const replay of replays)list.append(element('li',replay.title));root.append(list);const button=element('button','Open recordings for this session');button.onclick=()=>{$('sessionDialog').close();$('replaySearch').value='';$('replaySession').value=session.id;renderReplays(currentSuite,selection,currentVersion);room('calls');$('recordings').scrollIntoView({behavior:'smooth',block:'start'});};root.append(button);}
 else root.append(element('p','A recording will appear here if it is published for this session.','muted'));
 if(!$('sessionDialog').open)$('sessionDialog').showModal();
}
$('closeSession').onclick=()=>$('sessionDialog').close();
$('callFilter').addEventListener('change',()=>{if(currentSuite)renderSessions(dashboardModel(currentSuite));});
for(const [id,event] of [['replaySearch','input'],['replaySession','change']])$(id).addEventListener(event,()=>{if(currentSuite)renderReplays(currentSuite,selection,currentVersion);});
async function renderFlow(version){
 const moon=getMoonMagic();$('moonHeading').textContent=moon.emoji+' Moon day '+moon.moonDay;$('moonPhase').textContent=moon.phase;$('moonTheme').textContent=moon.theme;
 $('cycleHeading').textContent='Your cycle';$('cycleSeason').textContent='Your rhythm is personal.';$('cycleNote').textContent='Loading your existing Flowtel check-in…';
 try{const data=await request('&context=1');if(version!==epoch)return;const cycle=data.context?.cycle;
 if(!cycle){$('cycleNote').textContent='No cycle check-in recorded yet. There is no need to guess your day.';return;}
 $('cycleHeading').textContent=cycle.day?'Recorded day '+cycle.day:'Your last check-in';$('cycleSeason').textContent=cycle.season||'Inner Season not recorded';
 $('cycleNote').textContent='Last recorded '+dateLabel(cycle.asOf)+(cycle.asOf===flowtelTodayISO()?' · Today’s check-in.':' · This is a past check-in, not a prediction of today’s cycle day.');
 }catch{if(version===epoch)$('cycleNote').textContent='Your cycle snapshot is unavailable. You can return to your existing Flowtel journal below.';}
}
async function open(id){
 const version=++epoch;discardSessionView();selection=id;$('error').textContent='';$('detail').hidden=true;$('replays').replaceChildren();$('status').textContent='Preparing your private journey…';
 try{const {suite}=await request('&enrollmentId='+encodeURIComponent(id));if(version!==epoch)return;currentSuite=suite;currentVersion=version;const model=dashboardModel(suite);
 $('replaySearch').value='';$('replaySession').replaceChildren(new Option('All sessions',''));
 for(const session of model.sessions)if((suite.replays||[]).some(replay=>replay.sessionId===session.id))$('replaySession').add(new Option('Session '+session.session_number+' · '+kindLabel(session.session_kind),session.id));
 $('title').textContent=suite.enrollment.programTitle||'Your private mentorship';$('dates').textContent='Begins '+dateLabel(suite.enrollment.startsOn)+(suite.enrollment.endsOn?' · Through '+dateLabel(suite.enrollment.endsOn):' · No fixed end date');$('programStatus').textContent=suite.enrollment.status;
 $('completedCount').textContent=model.completed;$('remainingCount').textContent=model.remaining;$('replayCount').textContent=(suite.replays||[]).length;$('progressCaption').textContent=model.completed+' of '+model.total+' sessions completed';$('progress').setAttribute('aria-valuenow',String(model.percent));$('progressBar').style.width=model.percent+'%';
 $('progressNote').textContent=model.cancelled?model.cancelled+' cancelled session'+(model.cancelled===1?'':'s')+' shown in your session history.':'Each session is one part of your unfolding.';
 renderNext(model);renderSessions(model);renderFocus(model);renderReplays(suite,id,version);room(activePanel,false);$('detail').hidden=false;$('status').textContent=fictionalPreview?'You are exploring a fictional client suite.':'Your private suite is ready.';renderFlow(version);
 }catch(error){if(version===epoch){$('error').textContent=error.message;$('status').textContent='Your suite could not load.';}}
}
async function claim(id,button){button.disabled=true;$('error').textContent='';try{const data=await request('',{action:'claim-prepared',enrollmentId:id});await connect(data.enrollment?.id);}catch(error){$('error').textContent=error.message;}finally{button.disabled=false;}}
async function connect(preferred=null){
 const prior=preferred||selection;clearPrivate();const version=epoch;$('error').textContent='';$('login').hidden=true;$('access').classList.remove('verified');$('status').textContent='Preparing your suite…';
 try{const {data}=await supabase.auth.getSession();account=data.session?.user?.id||null;const {enrollments}=await request();if(version!==epoch)return;
 $('access').classList.add('verified');$('status').textContent=fictionalPreview?'Fictional design preview · No client data or bookings.':'Your private mentorship access is verified.';$('enrollmentSection').hidden=enrollments.length===1;
 const root=$('enrollments');root.replaceChildren();
 if(!enrollments.length)empty(root,'No private mentorship is linked to this account yet.');
 for(const enrollment of enrollments){const card=element('div','','enrollment-choice');card.append(element('p',enrollment.programTitle||'Private mentorship'),element('p',enrollment.status,'muted'));const button=element('button','Open private suite');button.onclick=()=>open(enrollment.id);card.append(button);root.append(card);}
 // Discovery failure does not hide an already linked suite.
 try{const {prepared}=await request('&prepared=1');if(version!==epoch)return;$('preparedSection').hidden=!prepared?.length;for(const invitation of prepared||[]){const row=element('div','','focus-entry');row.append(element('h3',invitation.programTitle||'Private mentorship'),element('p','Begins '+dateLabel(invitation.startsOn)));const button=element('button','Activate this mentorship');button.onclick=()=>claim(invitation.id,button);row.append(button);$('prepared').append(row);}}catch(error){if(version!==epoch)return;if(error.status===401)throw error;if(error.status!==403){$('preparedSection').hidden=false;empty($('prepared'),'We could not check for newly prepared mentorships. Refresh your suite to try again. Your linked mentorships remain available below.');}}
 if(version!==epoch)return;
 const chosen=enrollments.find(e=>e.id===prior)||(enrollments.length===1?enrollments[0]:null);if(chosen)await open(chosen.id);
 }catch(error){if(version!==epoch)return;$('status').textContent=error.status===401?'Sign in to enter your private suite.':'Your suite is temporarily unavailable.';$('login').hidden=error.status!==401;$('error').textContent=error.message;}
}
$('login').onsubmit=async event=>{event.preventDefault();const button=$('login').querySelector('button');button.disabled=true;try{const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)throw error;await connect();}catch(error){$('error').textContent=error.message;}finally{button.disabled=false;}};
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){clearPrivate();account=null;$('status').textContent='Signed out';$('login').hidden=false;$('access').classList.remove('verified');}else if(event==='SIGNED_IN'&&session?.user?.id!==account){clearPrivate();setTimeout(()=>connect(),0);}});
$('retry').onclick=()=>connect();connect();
