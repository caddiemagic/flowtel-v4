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
  if(value<1024*1024*1024) return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
  return `${(value/(1024*1024*1024)).toFixed(value>=10*1024*1024*1024?0:2)} GB`;
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
function waitingMailboxFiles(rows=[]){
  return rows.filter(file=>file.direction==='to_practitioner' && !file.downloaded_at);
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
  const isWaiting=isReturn && !file.downloaded_at;
  const state=isReturn?(file.downloaded_at?'Downloaded':'Ready for you'):(file.received_at?'Received by Megan':'Sent to Megan');
  return `<article class="mailbox-file ${isReturn?'is-return':'is-original'} ${isWaiting?'is-waiting':''}">
    <div><p class="mailbox-file-direction">${isReturn?'DELIVERED TO YOU':'SENT TO MEGAN'}</p><h4>${escapeHtml(file.original_filename || 'Private file')}</h4><p>${escapeHtml(fileSizeLabel(file.size_bytes))} · ${escapeHtml(mailboxDateLabel(file.uploaded_at))}</p>${file.file_note?`<p class="mailbox-file-note">${escapeHtml(file.file_note)}</p>`:''}</div>
    <div class="mailbox-file-action"><span>${escapeHtml(state)}</span>${isReturn?`<button type="button" data-mailbox-download="${escapeHtml(file.file_id)}" data-mailbox-path="${escapeHtml(file.storage_path)}">${file.downloaded_at?'Download Again':'Download Private File'}</button>`:''}</div>
  </article>`;
}
function renderMailbox(){
  const threads=groupMailboxThreads(mailboxRows);
  const waiting=waitingMailboxFiles(mailboxRows);
  const waitingCount=waiting.length;
  section.innerHTML=`
    <header class="priestess-mailbox-heading"><div><p class="eyebrow">PRIESTESS MAILBOX</p><h2>Private files move through the Flowtel.</h2><p>Send audio, video, images, documents, and other protected files to Megan—and receive every private return in the same quiet room.</p></div><span class="mailbox-seal" aria-hidden="true">✉</span></header>
    ${waitingCount?`<section class="mailbox-delivery-alert" role="status"><div><p class="eyebrow">PRIVATE DELIVERY</p><h3>${waitingCount===1?'A private file is waiting for you.':`${waitingCount} private files are waiting for you.`}</h3><p>The alert will clear after each file is successfully downloaded.</p></div><strong>${waitingCount} NEW ${waitingCount===1?'FILE':'FILES'}</strong></section>`:''}
    <div class="priestess-mailbox-layout">
      <form class="priestess-mailbox-form" id="priestessMailboxForm">
        <label><span>Private file title</span><input name="subject" maxlength="120" placeholder="A recording for Megan" /></label>
        <label><span>Note for Megan — optional</span><textarea name="message" rows="4" maxlength="1000" placeholder="What would you like her to know before opening this file?"></textarea></label>
        <label class="mailbox-file-picker"><span>Choose a private file</span><input name="private_file" type="file" accept="${escapeHtml(mailboxApi.PRIESTESS_MAILBOX_ACCEPT)}" required /><small>Video, audio, images, PDFs, documents, spreadsheets, presentations, or ZIP files · up to 1 GB</small></label>
        <div class="mailbox-selected-file" id="priestessMailboxSelectedFile" hidden></div>
        <button type="submit">Send Private File to Megan</button>
        <div class="mailbox-upload-progress" id="priestessMailboxProgress" hidden aria-hidden="true"><span></span></div>
        <p class="mailbox-upload-guidance">Large files upload securely through Flowtel. Keep this tab open until the private delivery is complete. If the connection interrupts, press Send again with the same selected file.</p>
        <p class="mailbox-form-status" id="priestessMailboxStatus" role="status"></p>
      </form>
      <section class="priestess-mailbox-history"><div class="mailbox-history-heading"><p class="eyebrow">YOUR PRIVATE THREADS</p><span>${threads.length}</span></div>${threads.length?threads.map(thread=>`<article class="mailbox-thread"><header><div><h3>${escapeHtml(thread.subject || 'Private file for Megan')}</h3><p>${escapeHtml(mailboxThreadStatus(thread))} · ${escapeHtml(mailboxDateLabel(thread.thread_created_at))}</p></div><span>${escapeHtml(thread.thread_status?.replaceAll('_',' ') || '')}</span></header>${thread.thread_message?`<p class="mailbox-thread-message">${escapeHtml(thread.thread_message)}</p>`:''}<div class="mailbox-file-list">${thread.files.map(mailboxFileMarkup).join('')}</div></article>`).join(''):'<div class="mailbox-empty"><p>Your first private file handoff will appear here.</p></div>'}</section>
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
  const fileInput=form?.elements.private_file;
  const selected=document.getElementById('priestessMailboxSelectedFile');
  const progress=document.getElementById('priestessMailboxProgress');
  const progressBar=progress?.querySelector('span');

  fileInput?.addEventListener('change',()=>{
    const file=fileInput.files?.[0];
    if(!selected) return;
    if(!file){
      selected.hidden=true;
      selected.innerHTML='';
      return;
    }
    selected.hidden=false;
    selected.innerHTML=`<p>READY FOR PRIVATE DELIVERY</p><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(fileSizeLabel(file.size))}</span>`;
    status.textContent='';
  });

  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const file=fileInput?.files?.[0];
    try{
      mailboxApi.validatePriestessMailboxFile(file);
    }catch(error){
      status.textContent=error?.message || 'Choose a supported private file first.';
      fileInput?.focus();
      return;
    }

    button.disabled=true;
    button.textContent='Sending…';
    if(progress){ progress.hidden=false; progress.setAttribute('aria-hidden','false'); }
    if(progressBar) progressBar.style.width='2%';
    status.textContent='Preparing your private file…';
    try{
      await mailboxApi.sendPrivateFileToConcierge(file,{
        subject:form.elements.subject?.value || '',
        message:form.elements.message?.value || '',
        onProgress:(value,detail={})=>{
          const indeterminate=detail.indeterminate===true;
          progress?.classList.toggle('is-indeterminate',indeterminate);
          if(progressBar) progressBar.style.width=indeterminate?'38%':`${value}%`;
          status.textContent=value>=100
            ?'Finishing your private delivery…'
            :(indeterminate?'Uploading privately… Keep this page open.':`Uploading privately… ${value}%`);
        },
      });
      form.reset();
      if(selected){ selected.hidden=true; selected.innerHTML=''; }
      if(progress){ progress.hidden=true; progress.setAttribute('aria-hidden','true'); progress.classList.remove('is-indeterminate'); }
      if(progressBar) progressBar.style.width='0%';
      status.textContent='Your private file is waiting safely in Megan’s Priestess Mailbox.';
      await loadMailbox();
    }catch(error){
      console.error(error);
      button.disabled=false;
      button.textContent='Send Private File to Megan';
      progress?.classList.remove('is-indeterminate');
      status.textContent=error?.message || 'This private file could not be sent yet.';
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
    const flowtel=await import('/shared/flowtel.js?v=0.10.80.2');
    mailboxApi=await import('/shared/priestess-mailbox.js?v=0.10.80.6');
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
