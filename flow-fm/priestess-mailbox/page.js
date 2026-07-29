import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';

const section=document.getElementById('priestessMailboxSection');
const message=document.getElementById('message');
const accessState=document.getElementById('accessState');
let mailboxApi=null;
let mailboxRows=[];
let currentProfile=null;

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function normalizeMembership(value){ return String(value || '').toLowerCase().replace(/[^a-z]/g,''); }
function canUseMailbox(profile){
  const membership=normalizeMembership(profile?.membership_type);
  return isPractitionerLevel(profile)
    || membership==='flowfm'
    || membership==='flowfmmember'
    || membership==='council'
    || membership.startsWith('flowfm')
    || !!profile?.flowfm_started_at
    || !!profile?.is_initiated;
}
function setMessage(text=''){ if(message) message.textContent=text; }
function fileSizeLabel(bytes=0){
  const value=Number(bytes)||0;
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
  return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
}
function mailboxDateLabel(value){
  if(!value) return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
}
function groupMailboxThreads(rows=[]){
  const groups=new Map();
  rows.forEach(row=>{
    if(!groups.has(row.thread_id)) groups.set(row.thread_id,{...row,files:[]});
    groups.get(row.thread_id).files.push(row);
  });
  return [...groups.values()];
}
function mailboxThreadStatus(thread){
  const returned=thread.files.filter(file=>file.direction==='to_practitioner');
  const originals=thread.files.filter(file=>file.direction==='to_admin');
  if(returned.some(file=>!file.downloaded_at)) return 'A private file is ready';
  if(returned.length && returned.every(file=>file.downloaded_at)) return 'Private file received';
  if(originals.some(file=>file.received_at)) return 'Received by Megan';
  return 'Traveling to Megan';
}
function mailboxFileMarkup(file){
  const isReturn=file.direction==='to_practitioner';
  const state=isReturn?(file.downloaded_at?'Downloaded':'Ready for you'):(file.received_at?'Received by Megan':'Sent to Megan');
  return `<article class="mailbox-file ${isReturn?'is-return':'is-original'}">
    <div><p class="mailbox-file-direction">${isReturn?'DELIVERED TO YOU':'SENT TO MEGAN'}</p><h4>${escapeHtml(file.original_filename || 'Private file')}</h4><p>${escapeHtml(fileSizeLabel(file.size_bytes))} · ${escapeHtml(mailboxDateLabel(file.uploaded_at))}</p>${file.file_note?`<p class="mailbox-file-note">${escapeHtml(file.file_note)}</p>`:''}</div>
    <div class="mailbox-file-action"><span>${escapeHtml(state)}</span>${isReturn?`<button type="button" data-mailbox-download="${escapeHtml(file.file_id)}" data-mailbox-path="${escapeHtml(file.storage_path)}">${file.downloaded_at?'Download Again':'Download Private File'}</button>`:''}</div>
  </article>`;
}
function renderMailbox(){
  const threads=groupMailboxThreads(mailboxRows);
  section.innerHTML=`
    <header class="priestess-mailbox-heading"><div><p class="eyebrow">PRIESTESS MAILBOX</p><h2>Private files move through the Flowtel.</h2><p>Leave audio for Megan to tend, receive edited recordings, and return to every protected delivery in one quiet room.</p></div><span class="mailbox-seal" aria-hidden="true">✉</span></header>
    <div class="priestess-mailbox-layout">
      <form class="priestess-mailbox-form" id="priestessMailboxForm">
        <label><span>Audio title</span><input name="subject" maxlength="120" placeholder="Womb Wealth meditation" /></label>
        <label><span>Note for Megan — optional</span><textarea name="message" rows="4" maxlength="1000" placeholder="What would you like her to know before editing?"></textarea></label>
        <label class="mailbox-file-picker"><span>Choose your audio</span><input name="audio_file" type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*" required /><small>MP3, WAV, M4A, AAC, or OGG · up to 250 MB</small></label>
        <button type="submit">Send Audio to Megan</button>
        <p class="mailbox-form-status" id="priestessMailboxStatus" role="status"></p>
      </form>
      <section class="priestess-mailbox-history"><div class="mailbox-history-heading"><p class="eyebrow">YOUR PRIVATE THREADS</p><span>${threads.length}</span></div>${threads.length?threads.map(thread=>`<article class="mailbox-thread"><header><div><h3>${escapeHtml(thread.subject || 'Audio for Megan')}</h3><p>${escapeHtml(mailboxThreadStatus(thread))} · ${escapeHtml(mailboxDateLabel(thread.thread_created_at))}</p></div><span>${escapeHtml(thread.thread_status?.replaceAll('_',' ') || '')}</span></header>${thread.thread_message?`<p class="mailbox-thread-message">${escapeHtml(thread.thread_message)}</p>`:''}<div class="mailbox-file-list">${thread.files.map(mailboxFileMarkup).join('')}</div></article>`).join(''):'<div class="mailbox-empty"><p>Your first private file handoff will appear here.</p></div>'}</section>
    </div>`;
  bindMailbox();
}
async function downloadPrivateFile(button){
  const popup=window.open('about:blank','_blank');
  const original=button.textContent;
  button.disabled=true;
  button.textContent='Preparing…';
  try{
    const url=await mailboxApi.createMailboxDownloadUrl(button.dataset.mailboxPath);
    if(popup){ popup.opener=null; popup.location.href=url; }
    else{
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';document.body.appendChild(link);link.click();link.remove();
    }
    await mailboxApi.markReturnedAudioDownloaded(button.dataset.mailboxDownload);
    await loadMailbox();
    setMessage('Your private file has been received from the Priestess Mailbox.');
  }catch(error){
    popup?.close();
    console.error(error);
    button.disabled=false;
    button.textContent=original;
    setMessage(error?.message || 'This private download could not be prepared yet.');
  }
}
function bindMailbox(){
  const form=document.getElementById('priestessMailboxForm');
  const status=document.getElementById('priestessMailboxStatus');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const file=form.elements.audio_file?.files?.[0];
    button.disabled=true;
    status.textContent='Sending your audio through the Flowtel…';
    try{
      await mailboxApi.sendAudioToConcierge(file,{subject:form.elements.subject?.value || '',message:form.elements.message?.value || ''});
      form.reset();
      status.textContent='Your audio is waiting safely in Megan’s Priestess Mailbox.';
      await loadMailbox();
    }catch(error){
      console.error(error);
      button.disabled=false;
      status.textContent=error?.message || 'This audio could not be sent yet.';
    }
  });
  section.querySelectorAll('[data-mailbox-download]').forEach(button=>button.addEventListener('click',()=>downloadPrivateFile(button)));
}
async function loadMailbox(){
  try{
    mailboxRows=await mailboxApi.listMyPriestessMailbox();
    renderMailbox();
  }catch(error){
    console.warn('Priestess Mailbox could not load.',error);
    section.innerHTML='<div class="mailbox-empty"><p>The Priestess Mailbox could not open yet. Refresh once, then return through the Flowtel.</p></div>';
    setMessage(error?.message || 'The private mailbox connection is not ready yet.');
  }
}
async function init(){
  try{
    const flowtel=await import('/shared/flowtel.js?v=0.10.80');
    mailboxApi=await import('/shared/priestess-mailbox.js?v=0.10.80');
    currentProfile=await flowtel.getCurrentProfile();
    if(!canUseMailbox(currentProfile)){
      replacePageWithPhaseTwoGate({featureName:'Priestess Mailbox',title:'Reserved for Flow FM',copy:'The Priestess Mailbox is available to Flow FM and Council members moving private files through the Flowtel.'});
      return;
    }
    if(accessState) accessState.innerHTML='';
    await loadMailbox();
  }catch(error){
    console.error(error);
    section.innerHTML='<div class="mailbox-empty"><p>The Priestess Mailbox did not finish opening. Refresh once, then return through the Flowtel.</p></div>';
    setMessage(error?.message || 'The private mailbox connection could not initialize.');
  }
}
init();
