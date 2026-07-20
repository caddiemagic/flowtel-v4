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
const room=document.getElementById('replayNoteRoom');
const form=document.getElementById('replayNoteForm');
const status=document.getElementById('replayNoteStatus');
const history=document.getElementById('replayNotesHistory');

document.body.classList.toggle('is-embed',isEmbed);
document.getElementById('workshopTitle').textContent=workshopTitle;

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
function showDoorway(copy){
  room.hidden=true;
  accessState.hidden=false;
  accessState.innerHTML=`<img src="/assets/flowtel-wax-seal.png" alt="" /><p>${escapeHtml(copy)}</p><a href="/client/" target="_top">OPEN THE FLOWTEL</a>`;
}
async function boot(){
  try{
    const {data}=await supabase.auth.getSession();
    if(!data?.session){showDoorway('Enter through Flowtel first so this note can return to your private cycle history.');return;}
    await requireProductAccess('flowtel');
    const profile=await getCurrentProfile();
    if(!profile || effectiveFlowFmRank(profile)<1){showDoorway('This replay-notes room is reserved for Queendom members.');return;}
    accessState.hidden=true;
    room.hidden=false;
    await refreshNotes();
  }catch(error){showDoorway(error?.message || 'This private notes room could not be opened just now.');}
}
form?.addEventListener('submit',async event=>{
  event.preventDefault();
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
