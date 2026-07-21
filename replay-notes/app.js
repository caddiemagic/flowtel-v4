import { supabase } from '../shared/supabase.js';
import { getCurrentProfile } from '../shared/profiles.js?v=0.4.1';
import { effectiveFlowFmRank } from '../shared/rollout.js?v=0.10.64';
import { getMoonMagic } from '../shared/moon.js';
import { labelForWorkshopReplayNoteType,listMyWorkshopReplayNotes,normalizeWorkshopKey,saveWorkshopReplayNote } from '../shared/replay-notes.js?v=0.10.64';
import { requireProductAccess } from '../shared/product-access.js';

const params=new URLSearchParams(window.location.search);
const workshopKey=normalizeWorkshopKey(params.get('workshop') || 'workshop-replay');
const workshopTitle=String(params.get('title') || 'Workshop Replay').trim().slice(0,240);
const sourceUrl=String(params.get('source') || '').trim().slice(0,1000);
const isEmbed=params.get('embed')==='1';
const accessState=document.getElementById('replayAccessState');
const accessCopy=document.getElementById('replayAccessCopy');
const connectButton=document.getElementById('connectFlowtelButton');
const connectStatus=document.getElementById('connectFlowtelStatus');
const room=document.getElementById('replayNoteRoom');
const fields=document.getElementById('replayNoteFields');
const form=document.getElementById('replayNoteForm');
const status=document.getElementById('replayNoteStatus');
const history=document.getElementById('replayNotesHistory');
let connectPopup=null;
let connectionId='';
let bootSequence=0;

document.body.classList.toggle('is-embed',isEmbed);
document.getElementById('workshopTitle').textContent=workshopTitle;
room.hidden=false;

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[char]));
}
function formatDate(value){
  if(!value) return '';
  return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T12:00:00`));
}
function renderNotes(rows=[]){
  if(!rows.length){history.innerHTML='<p class="notes-empty">Your first note from this replay can begin here.</p>';return;}
  history.innerHTML=`<div class="note-list">${rows.map(row=>{
    const context=[row.cycle_day_actual?`Cycle Day ${row.cycle_day_actual}`:'',row.inner_season||'',row.moon_day?`Moon Day ${row.moon_day}`:'',row.moon_phase||''].filter(Boolean);
    return `<article class="note-card"><header><strong>${escapeHtml(labelForWorkshopReplayNoteType(row.note_type))}</strong><time>${escapeHtml(formatDate(row.flowtel_date))}</time></header><p>${escapeHtml(row.note_body)}</p>${context.length?`<div class="note-context">${context.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div>`:''}</article>`;
  }).join('')}</div>`;
}
async function refreshNotes(){renderNotes(await listMyWorkshopReplayNotes(workshopKey));}
function setConnected(connected){
  fields.disabled=!connected;
  document.body.classList.toggle('is-connected',connected);
  if(!connected && !history.querySelector('.note-list')){
    history.innerHTML='<p class="notes-empty">Your notes will appear here after your Flowtel room opens.</p>';
  }
}
function showConnect(copy){
  setConnected(false);
  accessState.hidden=false;
  accessCopy.textContent=copy;
  connectButton.hidden=false;
  connectButton.disabled=false;
  connectStatus.textContent='';
  connectButton.textContent=isEmbed?'OPEN MY NOTES':'ENTER THE FLOWTEL';
}
function showBlocked(copy){
  setConnected(false);
  accessState.hidden=false;
  accessCopy.textContent=copy;
  connectButton.hidden=false;
  connectButton.disabled=false;
  connectButton.textContent='OPEN THE FLOWTEL';
  connectStatus.textContent='';
}
async function boot(){
  const currentBoot=++bootSequence;
  setConnected(false);
  accessState.hidden=false;
  accessCopy.textContent='Opening your private notes room…';
  connectButton.hidden=true;
  connectStatus.textContent='';
  try{
    const {data,error}=await supabase.auth.getSession();
    if(error) throw error;
    if(currentBoot!==bootSequence) return;
    if(!data?.session){
      showConnect(isEmbed
        ? 'Your notes room is ready below. Connect Flowtel once to save this reflection to your private cycle history.'
        : 'Enter through Flowtel first so this note can return to your private cycle history.');
      return;
    }
    await requireProductAccess('flowtel');
    const profile=await getCurrentProfile();
    if(!profile || effectiveFlowFmRank(profile)<1){showBlocked('This replay-notes room is reserved for Queendom members.');return;}
    if(currentBoot!==bootSequence) return;
    setConnected(true);
    accessState.hidden=true;
    await refreshNotes();
  }catch(error){
    const message=String(error?.message || 'This private notes room could not be opened just now.');
    if(/sign in|session|jwt|token/i.test(message)) showConnect('Connect Flowtel to open your private replay notes.');
    else showBlocked(message);
  }
}
function openConnectionWindow(){
  connectionId=crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const popupUrl=new URL('/replay-notes/connect/',window.location.origin);
  popupUrl.searchParams.set('connection',connectionId);
  popupUrl.searchParams.set('title',workshopTitle);
  connectStatus.textContent='Opening your Flowtel room…';
  connectButton.disabled=true;
  connectPopup=window.open(popupUrl.toString(),'flowtelReplayNotesConnect','popup=yes,width=520,height=690,resizable=yes,scrollbars=yes');
  if(!connectPopup){
    connectButton.disabled=false;
    connectStatus.textContent='Your browser blocked the Flowtel window. Allow pop-ups for this page, then try again.';
    return;
  }
  connectPopup.focus();
  const watch=setInterval(()=>{
    if(!connectPopup || connectPopup.closed){
      clearInterval(watch);
      connectButton.disabled=false;
      if(!document.body.classList.contains('is-connected') && !connectStatus.textContent.includes('connected')){
        connectStatus.textContent='The Flowtel window closed before this notes room connected.';
      }
    }
  },500);
}
connectButton?.addEventListener('click',()=>{
  if(isEmbed){openConnectionWindow();return;}
  window.open('/client/','_top');
});
window.addEventListener('message',async event=>{
  if(event.origin!==window.location.origin) return;
  if(connectPopup && event.source!==connectPopup) return;
  const payload=event.data || {};
  if(payload.type!=='flowtel:replay-notes-session' || payload.connection!==connectionId) return;
  if(typeof payload.accessToken!=='string' || typeof payload.refreshToken!=='string') return;
  connectStatus.textContent='Flowtel connected. Opening your notes…';
  try{
    const {error}=await supabase.auth.setSession({access_token:payload.accessToken,refresh_token:payload.refreshToken});
    if(error) throw error;
    connectStatus.textContent='Flowtel connected.';
    await boot();
  }catch(error){
    connectButton.disabled=false;
    connectStatus.textContent=error?.message || 'Flowtel could not connect this notes room just now.';
  }
});
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(fields.disabled){showConnect('Connect Flowtel before saving this note.');return;}
  const button=document.getElementById('saveReplayNote');
  const noteType=document.getElementById('replayNoteType').value;
  const noteBody=document.getElementById('replayNoteBody').value;
  const original=button.textContent;
  button.disabled=true;button.textContent='SAVING…';status.textContent='';
  try{
    await saveWorkshopReplayNote({workshopKey,workshopTitle,noteType,noteBody,sourceUrl,moon:getMoonMagic()});
    form.reset();
    document.getElementById('replayNoteType').value='reflection';
    status.textContent='Flowtel remembered this with today’s Flowtel and Moon context.';
    await refreshNotes();
  }catch(error){status.textContent=error?.message || 'This note could not be saved just now.';}
  finally{button.disabled=false;button.textContent=original;}
});
boot();
