import { guestHouseFileSize, guestHouseReplayExpirationCopy } from '../../shared/guest-house-core.js?v=0.10.64';

const TOKEN_KEY='flowtel:guestHouseReplayKey';
const room=document.getElementById('replayRoom');

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function receiveToken(){
  const params=new URLSearchParams(window.location.search);
  const urlToken=params.get('key');
  if(urlToken){
    sessionStorage.setItem(TOKEN_KEY,urlToken);
    window.history.replaceState({},document.title,window.location.pathname);
    return urlToken;
  }
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function dateLabel(value){
  if(!value) return '';
  try{return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'}).format(new Date(value));}
  catch(error){return '';}
}

function mediaMarkup(file,index){
  const player=file.mediaKind==='video'
    ? `<video controls playsinline preload="metadata" data-replay-media="${escapeHtml(file.id)}"><source src="${escapeHtml(file.streamUrl)}" type="${escapeHtml(file.mimeType || 'video/mp4')}" />Your browser could not open this private video.</video>`
    : `<audio controls preload="metadata" data-replay-media="${escapeHtml(file.id)}"><source src="${escapeHtml(file.streamUrl)}" type="${escapeHtml(file.mimeType || 'audio/mpeg')}" />Your browser could not open this private audio.</audio>`;
  return `<article class="replay-file-card">
    <header><div><p class="eyebrow">${file.mediaKind==='video'?'PRIVATE VIDEO REPLAY':'PRIVATE AUDIO REPLAY'}${index>0?` · PART ${index+1}`:''}</p><h2>${escapeHtml(file.title || 'Your 1:1 Call Replay')}</h2></div><span>${escapeHtml(guestHouseFileSize(file.sizeBytes))}</span></header>
    ${file.note?`<p class="replay-note">${escapeHtml(file.note)}</p>`:''}
    ${file.expiresAt?`<p class="replay-expiration-note">${escapeHtml(guestHouseReplayExpirationCopy(file.expiresAt))}</p>`:''}
    <div class="media-frame">${player}</div>
    <div class="replay-actions"><a href="${escapeHtml(file.downloadUrl)}" data-download-file="${escapeHtml(file.id)}" download>DOWNLOAD THIS REPLAY</a><small>The secure player and download link refresh when you reopen this room.</small></div>
  </article>`;
}

function roomMarkup(payload){
  const data=payload.room;
  return `<header class="room-header">
      <img src="/assets/flowtel-wax-seal.png" alt="" />
      <p class="eyebrow">WELCOME TO YOUR PRIVATE REPLAY ROOM</p>
      <h1>${escapeHtml(data.firstName || 'Beautiful')}, your conversation is waiting.</h1>
      <p>This room holds the replay Megan prepared for you. You may listen or watch here and download a private copy for your own keeping.</p>
      <div class="room-key-note">Your room key remains open through <strong>${escapeHtml(dateLabel(data.accessExpiresAt))}</strong>.</div>
    </header>
    <section class="replay-files">${data.files.map(mediaMarkup).join('')}</section>
    <section class="privacy-card"><p class="eyebrow">HELD IN PRIVATE</p><h2>This room is separate from the Flowtel.</h2><p>Opening your replay does not give you access to member rooms, cycle data, community spaces, or anyone else’s information. The media links on this page are temporary and the room key can be closed by the Concierge.</p><button type="button" id="refreshReplayRoom">REFRESH MY PRIVATE PLAYER</button></section>
    <section class="queendom-card"><p class="eyebrow">THE DOORWAY BEYOND THE GUEST HOUSE</p><h2>When you feel called, enter the Queendom.</h2><p>Your replay already belongs to you. The invitation below is simply a doorway into the larger world of the Flowtel.</p><a href="https://www.theidyllcollective.com/queendomhome">JOIN THE QUEENDOM</a></section>`;
}

function closedMarkup(message){
  return `<div class="room-closed"><img src="/assets/flowtel-rose.png" alt="" /><p class="eyebrow">THE FLOWTEL GUEST HOUSE</p><h1>This private room could not be opened.</h1><p>${escapeHtml(message)}</p><p>Ask Megan to prepare a fresh Replay Room key for you.</p><a href="/guest-house/">RETURN TO THE GUEST HOUSE</a></div>`;
}

async function recordEvent(token,fileId,eventType){
  try{
    await fetch('/api/guest-house-access',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token,action:'event',fileId,eventType}),
      keepalive:true,
    });
  }catch(error){console.warn('Replay Room receipt event could not be preserved.',error);}
}

function bindRoom(token){
  room.querySelectorAll('[data-replay-media]').forEach(player=>{
    let recorded=false;
    player.addEventListener('play',()=>{
      if(recorded) return;
      recorded=true;
      recordEvent(token,player.dataset.replayMedia,'stream_started');
    });
  });
  room.querySelectorAll('[data-download-file]').forEach(link=>link.addEventListener('click',()=>{
    recordEvent(token,link.dataset.downloadFile,'download_requested');
  }));
  document.getElementById('refreshReplayRoom')?.addEventListener('click',()=>openRoom(token));
}

async function openRoom(token){
  if(!token){room.innerHTML=closedMarkup('No private room key was found in this browser.');return;}
  room.classList.add('is-loading');
  try{
    const response=await fetch('/api/guest-house-access',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:'room'}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.error || 'This private Replay Room is not available.');
    room.innerHTML=roomMarkup(payload);
    room.classList.remove('is-loading');
    bindRoom(token);
  }catch(error){
    room.innerHTML=closedMarkup(error?.message || 'This private Replay Room is not available.');
    room.classList.remove('is-loading');
  }
}

openRoom(receiveToken());
