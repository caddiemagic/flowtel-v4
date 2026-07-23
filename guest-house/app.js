// Flowtel v0.10.74.2 — remembered Guest House accounts, private replays, and editable Flow FM training offering.

import { supabase } from '../shared/supabase.js';
import {
  GUEST_HOUSE_TRAINING_CONSENT_COPY,
  GUEST_HOUSE_TRAINING_COUPON_CODE,
  GUEST_HOUSE_TRAINING_SCHEDULE_URL,
  GUEST_HOUSE_TRAINING_SELECTION_COPY,
  guestHouseFileSize,
  guestHouseReplayExpirationCopy,
  normalizeGuestHouseTrainingFileIds,
} from '../shared/guest-house-core.js?v=0.10.74.2';

const accountCard=document.getElementById('accountCard');
const portal=document.getElementById('guestHousePortal');
const portalContent=document.getElementById('portalContent');
const portalGreeting=document.getElementById('portalGreeting');
const portalEmail=document.getElementById('portalEmail');
const createForm=document.getElementById('createGuestHouseAccountForm');
const signInForm=document.getElementById('guestHouseSignInForm');
const createStatus=document.getElementById('createAccountStatus');
const signInStatus=document.getElementById('signInStatus');
const createTab=document.getElementById('createAccountTab');
const signInTab=document.getElementById('signInTab');
const createPanel=document.getElementById('createAccountPanel');
const signInPanel=document.getElementById('signInPanel');
const signOutButton=document.getElementById('guestHouseSignOut');

let currentSession=null;
let currentPortalData=null;

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function switchAuthPanel(panel){
  const creating=panel==='create';
  createPanel.hidden=!creating;
  signInPanel.hidden=creating;
  createTab.classList.toggle('is-active',creating);
  signInTab.classList.toggle('is-active',!creating);
  createTab.setAttribute('aria-selected',String(creating));
  signInTab.setAttribute('aria-selected',String(!creating));
  (creating?createForm:signInForm)?.querySelector('input')?.focus();
}

function showAccountDoorway(message=''){
  currentPortalData=null;
  portal.hidden=true;
  accountCard.hidden=false;
  if(message) signInStatus.textContent=message;
}

function showPortal(){
  accountCard.hidden=true;
  portal.hidden=false;
}

function dateLabel(value){
  if(!value) return '';
  try{
    return new Intl.DateTimeFormat('en-US',{
      month:'long',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles',
    }).format(new Date(value));
  }catch(_error){return '';}
}

function accountNames(){
  const account=currentPortalData?.account || {};
  const metadata=currentSession?.user?.user_metadata || {};
  return {
    firstName:String(account.firstName || metadata.first_name || '').trim(),
    lastName:String(account.lastName || metadata.last_name || '').trim(),
  };
}

async function portalRequest(body={action:'room'}){
  if(!currentSession?.access_token) throw new Error('Sign in to open your Guest House room.');
  const response=await fetch('/api/guest-house-portal',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${currentSession.access_token}`,
    },
    body:JSON.stringify(body),
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload.error || 'Your Guest House room could not be opened just now.');
  return payload;
}

function requestFormMarkup(){
  const names=accountNames();
  return `<section class="request-room" aria-labelledby="requestReplayTitle">
    <p class="eyebrow">REQUEST YOUR CALL REPLAY</p>
    <h3 id="requestReplayTitle">Let the Concierge know which conversation belongs to you.</h3>
    <p>Share your name and what you remember about the call. Your signed-in email already identifies your private Guest House account.</p>
    <form id="guestHouseReplayRequestForm" novalidate>
      <div class="name-grid">
        <label><span>First name</span><input name="first_name" maxlength="100" autocomplete="given-name" value="${escapeHtml(names.firstName)}" required /></label>
        <label><span>Last name</span><input name="last_name" maxlength="100" autocomplete="family-name" value="${escapeHtml(names.lastName)}" required /></label>
      </div>
      <label><span>What do you remember about the call?</span><textarea name="call_memory" rows="6" maxlength="2000" placeholder="A theme, question, phrase, or moment that will help Megan recognize your conversation" required></textarea></label>
      <label class="confirmation-row"><input name="confirmed" type="checkbox" required /><span>I confirm that I am requesting my own private 1:1 call replay.</span></label>
      <button class="primary-button" type="submit">REQUEST MY CALL REPLAY</button>
      <p class="form-status" id="replayRequestStatus" role="status" aria-live="polite"></p>
    </form>
  </section>`;
}

function statusShell({eyebrow,title,copy,request,inner=''}){
  return `<section class="status-room">
    <img src="/assets/flowtel-rose.png" alt="" />
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(copy)}</p>
    ${request?.reference?`<p class="reference">Guest House reference: <strong>${escapeHtml(request.reference)}</strong></p>`:''}
    ${request?.createdAt?`<p class="status-date">Requested ${escapeHtml(dateLabel(request.createdAt))}</p>`:''}
    ${inner}
    <button class="quiet-button refresh-room" type="button" id="refreshGuestHouseStatus">CHECK AGAIN</button>
  </section>`;
}

function mediaMarkup(file,index){
  const player=file.mediaKind==='video'
    ? `<video controls playsinline preload="metadata" data-replay-media="${escapeHtml(file.id)}"><source src="${escapeHtml(file.streamUrl)}" type="${escapeHtml(file.mimeType || 'video/mp4')}" />Your browser could not open this private video.</video>`
    : `<audio controls preload="metadata" data-replay-media="${escapeHtml(file.id)}"><source src="${escapeHtml(file.streamUrl)}" type="${escapeHtml(file.mimeType || 'audio/mpeg')}" />Your browser could not open this private audio.</audio>`;
  return `<article class="replay-file-card">
    <header><div><p class="eyebrow">${file.mediaKind==='video'?'PRIVATE VIDEO REPLAY':'PRIVATE AUDIO REPLAY'}</p><h4>${escapeHtml(file.title || 'Your 1:1 Call Replay')}</h4></div><span>${escapeHtml(guestHouseFileSize(file.sizeBytes))}</span></header>
    ${file.note?`<p class="replay-note">${escapeHtml(file.note)}</p>`:''}
    ${file.expiresAt?`<p class="replay-expiration-note">${escapeHtml(guestHouseReplayExpirationCopy(file.expiresAt))}</p>`:''}
    <div class="media-frame">${player}</div>
    <div class="replay-actions"><a href="${escapeHtml(file.downloadUrl)}" data-download-file="${escapeHtml(file.id)}" download>DOWNLOAD THIS REPLAY</a><small>The secure player and download link refresh whenever you reopen your Guest House room.</small></div>
  </article>`;
}

function trainingFileChoices(files,selectedIds=[]){
  const selected=new Set(normalizeGuestHouseTrainingFileIds(selectedIds));
  return files.map(file=>`<label class="training-file-choice">
    <input type="checkbox" name="training_file_id" value="${escapeHtml(file.id)}" ${selected.has(String(file.id))?'checked':''} />
    <span><strong>${escapeHtml(file.title || 'Your 1:1 Call Replay')}</strong><small>${file.mediaKind==='video'?'Video':'Audio'} recording</small></span>
  </label>`).join('');
}

function trainingConsentFormMarkup(files,selectedIds=[],buttonLabel='OFFER MY SELECTED SESSION',{isUpdate=false}={}){
  if(!files.length) return '';
  const confirmationCopy=isUpdate?GUEST_HOUSE_TRAINING_SELECTION_COPY:GUEST_HOUSE_TRAINING_CONSENT_COPY;
  return `<form class="training-consent-form" id="guestHouseTrainingConsentForm" data-training-mode="${isUpdate?'update':'initial'}" novalidate>
    <div class="training-file-choices" role="group" aria-label="Choose session recordings">${trainingFileChoices(files,selectedIds)}</div>
    <label class="confirmation-row training-confirmation"><input name="training_confirmed" type="checkbox" required /><span>${escapeHtml(confirmationCopy)}</span></label>
    <button class="primary-button" type="submit">${escapeHtml(buttonLabel)}</button>
    <p class="form-status" id="trainingConsentStatus" role="status" aria-live="polite"></p>
  </form>`;
}

function trainingGiftMarkup(consent={}){
  if(!consent?.giftGranted) return '';
  const code=String(consent.couponCode || GUEST_HOUSE_TRAINING_COUPON_CODE);
  const scheduleUrl=String(consent.schedulingUrl || GUEST_HOUSE_TRAINING_SCHEDULE_URL);
  return `<aside class="training-gift" aria-label="Complimentary session gift">
    <div><p class="eyebrow">A GIFT FOR YOUR OFFERING</p><h4>Your complimentary session is ready.</h4><p>Use code <strong>${escapeHtml(code)}</strong> when you schedule your recorded gift session.</p></div>
    <div class="training-gift-actions"><button class="quiet-button" type="button" data-copy-training-code="${escapeHtml(code)}">COPY CODE</button><a class="secondary-button" href="${escapeHtml(scheduleUrl)}" target="_blank" rel="noopener">SCHEDULE MY GIFT SESSION</a></div>
    <p class="training-copy-status" role="status" aria-live="polite"></p>
  </aside>`;
}

function trainingConsentMarkup(files,consent){
  const status=String(consent?.status || '');
  const selectedIds=normalizeGuestHouseTrainingFileIds(consent?.fileIds || []);
  const selectedTitles=files.filter(file=>selectedIds.includes(String(file.id))).map(file=>file.title || 'Your 1:1 Call Replay');
  const gift=trainingGiftMarkup(consent || {});

  if(status==='granted' || status==='updated'){
    return `<section class="training-consent-card" aria-labelledby="trainingConsentTitle">
      <p class="eyebrow">A SESSION OFFERING</p>
      <h4 id="trainingConsentTitle">Your session has been received as an offering.</h4>
      <p>Your current offering includes ${selectedTitles.length?escapeHtml(selectedTitles.join(', ')):'the recording(s) you selected'} for private Moon Priestess training inside Flow FM.</p>
      ${files.length?`<details class="training-permission-details"><summary>Change which recordings I am sharing</summary>${trainingConsentFormMarkup(files,selectedIds,'SAVE MY RECORDING CHOICES',{isUpdate:true})}</details>`:''}
      ${gift}
    </section>`;
  }

  if(status==='withdrawn'){
    return `<section class="training-consent-card" aria-labelledby="trainingConsentTitle">
      <p class="eyebrow">A SESSION OFFERING</p>
      <h4 id="trainingConsentTitle">No recordings are currently selected for Flow FM.</h4>
      <p>Your latest recording choices have been saved. You may choose a recording again below whenever it feels aligned.</p>
      ${files.length?`<details class="training-permission-details" open><summary>Change which recordings I am sharing</summary>${trainingConsentFormMarkup(files,[],'SAVE MY RECORDING CHOICES',{isUpdate:true})}</details>`:''}
    </section>`;
  }

  return `<section class="training-consent-card" aria-labelledby="trainingConsentTitle">
    <p class="eyebrow">A GENTLE INVITATION</p>
    <h4 id="trainingConsentTitle">Would you like to offer this session?</h4>
    <p>This choice is completely optional. You may offer one or more selected recordings to the private Flow FM Mastermind portal, where Moon Priestesses in training can witness the session for educational purposes. As a thank-you for this offering, you will receive another recorded session at no cost.</p>
    ${trainingConsentFormMarkup(files,[])}
  </section>`;
}

function renderPortal(){
  const data=currentPortalData || {};
  const account=data.account || {};
  const request=data.request;
  portalGreeting.textContent=`Welcome${account.firstName?`, ${account.firstName}`:''}.`;
  portalEmail.textContent=account.email || currentSession?.user?.email || '';

  if(!request){
    portalContent.innerHTML=requestFormMarkup();
    bindRequestForm();
    return;
  }

  if(request.status==='ready'){
    const files=Array.isArray(request.files)?request.files:[];
    const replayFilesMarkup=files.length
      ? `<section class="replay-files">${files.map(mediaMarkup).join('')}</section>`
      : data.request?.replayExpired
        ? '<p class="gentle-note">Your replay completed its 28-day Guest House stay and has been deleted from private storage.</p>'
        : '<p class="gentle-note">Your room has been marked ready, and the private player is still being prepared. Check again shortly.</p>';
    const trainingMarkup=(files.length || request.trainingConsent)?trainingConsentMarkup(files,request.trainingConsent):'';
    const replayInner=`${replayFilesMarkup}${trainingMarkup}`;
    portalContent.innerHTML=statusShell({
      eyebrow:'YOUR REPLAY ROOM',
      title:'Your Replay Room is ready',
      copy:'Your conversation is waiting safely inside your Guest House account. You may watch or listen here and download a private copy for your own keeping.',
      request,
      inner:replayInner,
    });
    bindReadyRoom();
    return;
  }

  if(request.status==='unable_to_locate'){
    portalContent.innerHTML=statusShell({
      eyebrow:'A NOTE FROM THE CONCIERGE',
      title:"Concierge couldn't find your replay",
      copy:'Megan was not able to locate a recording connected to this request. Your Guest House account remains here, and your request history has been preserved.',
      request,
    });
    bindStatusRefresh();
    return;
  }

  portalContent.innerHTML=statusShell({
    eyebrow:'YOUR REQUEST HAS ARRIVED',
    title:'Concierge is locating your recording',
    copy:'Your request is waiting safely with Megan. Return to this page whenever you feel called to see whether your Replay Room has opened.',
    request,
  });
  bindStatusRefresh();
}

async function recordEvent(fileId,eventType){
  try{await portalRequest({action:'event',fileId,eventType});}
  catch(error){console.warn('Replay Room receipt event could not be preserved.',error);}
}

function bindStatusRefresh(){
  document.getElementById('refreshGuestHouseStatus')?.addEventListener('click',loadPortal);
}

function bindReadyRoom(){
  bindStatusRefresh();
  bindTrainingConsent();
  portalContent.querySelectorAll('[data-replay-media]').forEach(player=>{
    let recorded=false;
    player.addEventListener('play',()=>{
      if(recorded) return;
      recorded=true;
      recordEvent(player.dataset.replayMedia,'stream_started');
    });
  });
  portalContent.querySelectorAll('[data-download-file]').forEach(link=>link.addEventListener('click',()=>{
    recordEvent(link.dataset.downloadFile,'download_requested');
  }));
}

function bindTrainingConsent(){
  const form=document.getElementById('guestHouseTrainingConsentForm');
  const output=document.getElementById('trainingConsentStatus');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const original=button.textContent;
    const values=new FormData(form);
    const fileIds=normalizeGuestHouseTrainingFileIds(values.getAll('training_file_id'));
    const confirmed=values.get('training_confirmed')==='on';
    const isUpdate=form.dataset.trainingMode==='update';
    if(!isUpdate && !fileIds.length){output.textContent='Choose at least one session recording.';return;}
    if(!confirmed){output.textContent=isUpdate?'Confirm your recording choices before continuing.':'Confirm your offering before continuing.';return;}
    button.disabled=true;
    button.textContent='SAVING YOUR CHOICE…';
    output.textContent='';
    try{
      const {error}=await supabase.rpc('flowtel_guest_house_submit_training_consent',{
        p_file_ids:fileIds,
        p_confirmed:true,
      });
      if(error) throw error;
      await loadPortal();
    }catch(error){
      output.textContent=error?.message || 'Your recording choices could not be saved just now.';
      button.disabled=false;
      button.textContent=original;
    }
  });


  portalContent.querySelectorAll('[data-copy-training-code]').forEach(button=>button.addEventListener('click',async()=>{
    const code=String(button.dataset.copyTrainingCode || GUEST_HOUSE_TRAINING_COUPON_CODE);
    const output=button.closest('.training-gift')?.querySelector('.training-copy-status');
    try{
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      else{
        const input=document.createElement('input');
        input.value=code;document.body.appendChild(input);input.select();
        if(!document.execCommand('copy')) throw new Error('Copy failed.');
        input.remove();
      }
      if(output) output.textContent=`${code} copied.`;
    }catch(_error){if(output) output.textContent=`Your code is ${code}.`;}
  }));
}

function bindRequestForm(){
  const form=document.getElementById('guestHouseReplayRequestForm');
  const output=document.getElementById('replayRequestStatus');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const original=button.textContent;
    const values=new FormData(form);
    const firstName=String(values.get('first_name') || '').trim();
    const lastName=String(values.get('last_name') || '').trim();
    const callMemory=String(values.get('call_memory') || '').trim();
    const confirmed=values.get('confirmed')==='on';

    if(!firstName){output.textContent='Enter your first name.';return;}
    if(!lastName){output.textContent='Enter your last name.';return;}
    if(!callMemory){output.textContent='Share what you remember about the call.';return;}
    if(!confirmed){output.textContent='Confirm that you are requesting your own private call replay.';return;}

    button.disabled=true;
    button.textContent='RECEIVING YOUR REQUEST…';
    output.textContent='';
    try{
      const {error}=await supabase.rpc('flowtel_guest_house_submit_my_request',{
        p_first_name:firstName,
        p_last_name:lastName,
        p_call_memory:callMemory,
        p_confirmed:true,
      });
      if(error) throw error;
      await loadPortal();
    }catch(error){
      output.textContent=error?.message || 'Your replay request could not be received just now.';
      button.disabled=false;
      button.textContent=original;
    }
  });
}

async function claimAccount(){
  const metadata=currentSession?.user?.user_metadata || {};
  const firstName=String(metadata.first_name || '').trim();
  const lastName=String(metadata.last_name || '').trim();
  const {error}=await supabase.rpc('flowtel_guest_house_claim_my_account',{
    p_first_name:firstName || null,
    p_last_name:lastName || null,
  });
  if(error && !/Add your first and last name/i.test(String(error.message || ''))) throw error;
}

async function loadPortal(){
  showPortal();
  portalContent.innerHTML='<div class="portal-loading"><img src="/assets/flowtel-wax-seal.png" alt="" /><p>Opening your Guest House room…</p></div>';
  try{
    await claimAccount();
    currentPortalData=await portalRequest({action:'room'});
    renderPortal();
  }catch(error){
    portalContent.innerHTML=`<div class="portal-error"><h3>Your Guest House room could not be opened.</h3><p>${escapeHtml(error?.message || 'Please return in a moment.')}</p><button type="button" class="quiet-button" id="retryGuestHousePortal">TRY AGAIN</button></div>`;
    document.getElementById('retryGuestHousePortal')?.addEventListener('click',loadPortal);
  }
}

createTab?.addEventListener('click',()=>switchAuthPanel('create'));
signInTab?.addEventListener('click',()=>switchAuthPanel('signin'));

createForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=createForm.querySelector('button[type="submit"]');
  const original=button.textContent;
  const values=new FormData(createForm);
  const firstName=String(values.get('first_name') || '').trim();
  const lastName=String(values.get('last_name') || '').trim();
  const email=String(values.get('email') || '').trim().toLowerCase();
  const password=String(values.get('password') || '');
  const confirmation=String(values.get('password_confirmation') || '');
  const website=String(values.get('website') || '');

  if(!firstName){createStatus.textContent='Enter your first name.';return;}
  if(!lastName){createStatus.textContent='Enter your last name.';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){createStatus.textContent='Enter a valid email address.';return;}
  if(password.length<8){createStatus.textContent='Create a password with at least 8 characters.';return;}
  if(password!==confirmation){createStatus.textContent='The two passwords do not match yet.';return;}

  button.disabled=true;
  button.textContent='PREPARING YOUR ROOM…';
  createStatus.textContent='';
  try{
    const response=await fetch('/api/guest-house-account',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({firstName,lastName,email,password,website}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw Object.assign(new Error(payload.error || 'Your account could not be prepared.'),{existingAccount:payload.existingAccount});

    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error) throw error;
    currentSession=data.session;
    await loadPortal();
  }catch(error){
    createStatus.textContent=error?.message || 'Your Guest House account could not be prepared just now.';
    button.disabled=false;
    button.textContent=original;
    if(error?.existingAccount){
      signInForm.querySelector('[name="email"]').value=email;
      switchAuthPanel('signin');
      signInStatus.textContent=error.message;
    }
  }
});

signInForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=signInForm.querySelector('button[type="submit"]');
  const original=button.textContent;
  const values=new FormData(signInForm);
  const email=String(values.get('email') || '').trim().toLowerCase();
  const password=String(values.get('password') || '');
  if(!email || !password){signInStatus.textContent='Enter your email and password.';return;}

  button.disabled=true;
  button.textContent='OPENING YOUR ROOM…';
  signInStatus.textContent='';
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error) throw error;
    currentSession=data.session;
    await loadPortal();
  }catch(error){
    signInStatus.textContent=error?.message || 'That room key did not open the Guest House.';
    button.disabled=false;
    button.textContent=original;
  }
});

signOutButton?.addEventListener('click',async()=>{
  signOutButton.disabled=true;
  try{await supabase.auth.signOut({scope:'local'});}catch(_error){/* local state still closes */}
  currentSession=null;
  showAccountDoorway('You have left the Guest House.');
  switchAuthPanel('signin');
  signOutButton.disabled=false;
  accountCard.scrollIntoView({behavior:'smooth',block:'center'});
});

async function boot(){
  const {data,error}=await supabase.auth.getSession();
  if(error || !data?.session){showAccountDoorway();return;}
  currentSession=data.session;
  await loadPortal();
}

supabase.auth.onAuthStateChange((_event,session)=>{
  currentSession=session;
});

boot();
