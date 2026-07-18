import { getCurrentProfile } from '/shared/profiles.js';
import {
  getTeamMapViewerState,
  listTeamMapPresences,
  setTeamMapVisibility,
} from '/shared/team-map.js?v=0.10.50';
import { getPriestessProfile } from '/shared/priestess-profiles.js?v=0.10.50';

const DEFAULT_PROFILE_IMAGE='/assets/flowtel-pinkrose.png';
const SEASONS=['Inner Autumn','Inner Summer','Inner Winter','Inner Spring'];
const TARGETS={
  'Inner Autumn':'presencesAutumn',
  'Inner Summer':'presencesSummer',
  'Inner Winter':'presencesWinter',
  'Inner Spring':'presencesSpring',
};

const flowtelDate=document.getElementById('flowtelDate');
const presenceSummary=document.getElementById('presenceSummary');
const refreshStatus=document.getElementById('refreshStatus');
const visibilitySetting=document.getElementById('visibilitySetting');
const visibilityToggle=document.getElementById('visibilityToggle');
const yourPresenceCard=document.getElementById('yourPresenceCard');
const yourPresencePhoto=document.getElementById('yourPresencePhoto');
const yourPresenceTitle=document.getElementById('yourPresenceTitle');
const yourPresenceCopy=document.getElementById('yourPresenceCopy');
const yourPresenceProfileLink=document.getElementById('yourPresenceProfileLink');
const canvas=document.getElementById('teamMapCanvas');
const threadLayer=document.getElementById('astralThreadLayer');
const message=document.getElementById('teamMapMessage');
const dialog=document.getElementById('presenceDialog');
const dialogClose=document.getElementById('dialogClose');
const dialogContent=document.getElementById('presenceDialogContent');

let currentProfile=null;
let viewerState=null;
let currentRows=[];
let refreshTimer=null;
let resizeTimer=null;
let isRefreshing=false;

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function safeHref(value){
  const raw=String(value || '').trim();
  if(!raw) return '';
  try{
    const url=new URL(raw,window.location.origin);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  }catch(error){ return ''; }
}
function safeImage(value){ return safeHref(value) || DEFAULT_PROFILE_IMAGE; }
function safeExternalHref(value){
  const raw=String(value || '').trim();
  if(!raw) return '';
  const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try{
    const url=new URL(candidate);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  }catch(error){ return ''; }
}
function formatFlowtelDate(value){
  if(!value) return 'Today in Flowtel Time';
  const [year,month,day]=String(value).slice(0,10).split('-').map(Number);
  if(!year||!month||!day) return String(value);
  return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)));
}
function normalizedSeason(value){
  const clean=String(value || '').trim().toLowerCase().replace(/[^a-z]/g,'');
  return {
    winter:'Inner Winter',innerwinter:'Inner Winter',
    spring:'Inner Spring',innerspring:'Inner Spring',
    summer:'Inner Summer',innersummer:'Inner Summer',
    autumn:'Inner Autumn',innerautumn:'Inner Autumn',
    fall:'Inner Autumn',innerfall:'Inner Autumn',
  }[clean] || '';
}
function hashValue(value){
  let hash=2166136261;
  for(const char of String(value || '')){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return Math.abs(hash >>> 0);
}
function selectorEscape(value){
  if(window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g,char=>'\\'+char);
}
function setMessage(text=''){ if(message) message.textContent=text; }
function timeLabel(){
  return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date());
}

function presenceMarkup(presence,index){
  const row=presence.row;
  const seed=hashValue(`${row.member_id}-${presence.kind}`);
  const delay=-((seed % 2800)/1000).toFixed(2);
  const distance=3+(seed % 5);
  const tilt=((seed % 7)-3)*.35;
  const tiltAlt=tilt*-1;
  const name=row.priestess_name || 'Flow FM Priestess';
  const kindLabel=presence.kind==='ghost' ? `Feels Like ${presence.season.replace(/^Inner\s+/,'')}` : '';
  return `<button class="presence-orb ${presence.kind==='ghost'?'is-ghost':'is-actual'}" type="button" data-member-id="${escapeHtml(row.member_id)}" data-kind="${presence.kind}" style="--float-delay:${delay}s;--float-distance:${distance}px;--tilt:${tilt}deg;--tilt-alt:${tiltAlt}deg;--presence-order:${index}">
    <span class="presence-halo" aria-hidden="true"></span>
    <span class="presence-photo-wrap">
      <img src="${escapeHtml(safeImage(row.profile_photo_url))}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_IMAGE}'" />
    </span>
    <strong>${escapeHtml(name)}</strong>
    ${kindLabel ? `<small>${escapeHtml(kindLabel)}</small>` : ''}
  </button>`;
}

function collectPresences(rows,season){
  const presences=[];
  rows.forEach(row=>{
    const actual=normalizedSeason(row.actual_inner_season);
    const feels=normalizedSeason(row.feels_like_inner_season);
    if(actual===season) presences.push({row,season,kind:'actual'});
    if(feels && feels!==actual && feels===season) presences.push({row,season,kind:'ghost'});
  });
  return presences.sort((a,b)=>hashValue(`${a.row.member_id}-${a.kind}`)-hashValue(`${b.row.member_id}-${b.kind}`));
}

function renderQuadrants(rows){
  SEASONS.forEach(season=>{
    const holder=document.getElementById(TARGETS[season]);
    if(!holder) return;
    const presences=collectPresences(rows,season);
    holder.innerHTML=presences.length
      ? presences.map(presenceMarkup).join('')
      : `<div class="empty-chamber">This seasonal chamber is quiet right now.</div>`;
  });
  bindPresenceButtons();
  requestAnimationFrame(drawAstralThreads);
}

function renderSummary(rows){
  const count=rows.length;
  presenceSummary.textContent=count
    ? `${count} team ${count===1?'member has':'members have'} clocked in to the Flowtel today.`
    : 'No team members have clocked in to the Flowtel yet today.';
  refreshStatus.textContent=`Last refreshed ${timeLabel()} · Flowtel Time is the source of truth.`;
}

function renderVisibility(){
  const canAppear=!!viewerState?.can_appear;
  visibilitySetting?.classList.toggle('hidden',!canAppear);
  if(visibilityToggle) visibilityToggle.checked=!!viewerState?.is_visible;
  yourPresenceProfileLink?.classList.toggle('hidden',!canAppear);
}
function renderYourPresence(rows){
  if(!yourPresenceCard || !viewerState) return;
  const actual=normalizedSeason(viewerState.actual_inner_season);
  const feels=normalizedSeason(viewerState.feels_like_inner_season);
  const mapHasSelf=rows.some(row=>String(row.member_id)===String(currentProfile?.id));
  const visible=!!viewerState.appears_today && mapHasSelf;
  const fallbackStatus=viewerState.presence_status || 'Flowtel is checking your presence.';
  const eligibleButMissing=!!viewerState.appears_today && !mapHasSelf;
  yourPresenceCard.classList.toggle('is-visible-today',visible);
  if(yourPresencePhoto){
    yourPresencePhoto.src=safeImage(viewerState.profile_photo_url);
    yourPresencePhoto.onerror=()=>{ yourPresencePhoto.onerror=null; yourPresencePhoto.src=DEFAULT_PROFILE_IMAGE; };
  }
  if(yourPresenceTitle){
    yourPresenceTitle.textContent=visible
      ? 'You are on the Living Map.'
      : eligibleButMissing
        ? 'Your check-in is eligible, but your portrait has not loaded yet.'
        : fallbackStatus;
  }
  if(yourPresenceCopy){
    const details=[];
    if(viewerState.checked_in_today) details.push('Checked in today');
    if(actual) details.push(actual);
    if(viewerState.cycle_day) details.push(`Cycle Day ${viewerState.cycle_day}`);
    if(feels && feels!==actual) details.push(`Feels Like ${feels.replace(/^Inner\s+/,'')}`);
    if(!viewerState.profile_photo_url) details.push('Using the rose until you upload a photo');
    if(eligibleButMissing) details.push('Refresh after migration 039 is installed');
    yourPresenceCopy.textContent=details.length ? details.join(' · ') : fallbackStatus;
  }
}

function dialogMarkup(row){
  const actual=normalizedSeason(row.actual_inner_season).replace(/^Inner\s+/,'') || 'Unknown';
  const feels=normalizedSeason(row.feels_like_inner_season).replace(/^Inner\s+/,'');
  const traveled=feels && feels!==actual;
  const website=safeExternalHref(row.website_url);
  const isSelf=String(currentProfile?.id || '')===String(row.member_id || '');
  const profileLabel=isSelf ? 'View My Profile' : 'Visit Her Profile';
  return `<article class="dialog-profile-card dialog-profile-card--external">
    <div class="dialog-profile-photo"><img src="${escapeHtml(safeImage(row.profile_photo_url))}" alt="${escapeHtml(row.priestess_name || 'Flow FM Priestess')}" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_IMAGE}'" /></div>
    <p class="eyebrow">CONCIERGE TEAM</p>
    <h2>${escapeHtml(row.priestess_name || 'Flow FM Priestess')}</h2>
    <p class="dialog-title">FLOW FM PRIESTESS</p>
    <div class="movement-pills">
      ${traveled?`<span class="ghost-pill">Feels Like: ${escapeHtml(feels)}</span>`:''}
      ${row.cycle_day?`<span>Cycle Day ${escapeHtml(row.cycle_day)}</span>`:''}
    </div>
    ${website ? `<div class="dialog-profile-actions">
      <a class="visit-queendom-button" href="${escapeHtml(website)}" target="_blank" rel="noopener">${escapeHtml(profileLabel)}</a>
    </div>` : isSelf ? `<div class="dialog-profile-actions">
      <a class="visit-queendom-button" href="/flow-fm/profile-studio/">Add My Profile Link</a>
    </div>` : `<p class="dialog-profile-link-missing">Profile link coming soon.</p>`}
  </article>`;
}

function openPresence(row){
  if(!dialog || !dialogContent) return;
  dialogContent.innerHTML=dialogMarkup(row);
  if(typeof dialog.showModal==='function') dialog.showModal();
  else dialog.setAttribute('open','');
}
function closePresence(){
  if(!dialog) return;
  if(typeof dialog.close==='function') dialog.close();
  else dialog.removeAttribute('open');
}
function setLinkedMember(memberId,active){
  document.querySelectorAll(`[data-member-id="${selectorEscape(memberId)}"]`).forEach(node=>node.classList.toggle('is-linked',active));
  threadLayer?.querySelector(`[data-thread-member="${selectorEscape(memberId)}"]`)?.classList.toggle('is-active',active);
}
function bindPresenceButtons(){
  document.querySelectorAll('.presence-orb').forEach(button=>{
    const row=currentRows.find(item=>String(item.member_id)===String(button.dataset.memberId));
    if(!row) return;
    button.addEventListener('click',()=>openPresence(row));
    button.addEventListener('pointerenter',()=>setLinkedMember(row.member_id,true));
    button.addEventListener('pointerleave',()=>setLinkedMember(row.member_id,false));
    button.addEventListener('focus',()=>setLinkedMember(row.member_id,true));
    button.addEventListener('blur',()=>setLinkedMember(row.member_id,false));
  });
}

function drawAstralThreads(){
  if(!canvas || !threadLayer) return;
  const box=canvas.getBoundingClientRect();
  if(!box.width || !box.height) return;
  threadLayer.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  threadLayer.innerHTML='';
  const travelers=currentRows.filter(row=>{
    const actual=normalizedSeason(row.actual_inner_season);
    const feels=normalizedSeason(row.feels_like_inner_season);
    return actual && feels && actual!==feels;
  });
  travelers.forEach(row=>{
    const actualNode=canvas.querySelector(`[data-member-id="${selectorEscape(String(row.member_id))}"][data-kind="actual"]`);
    const ghostNode=canvas.querySelector(`[data-member-id="${selectorEscape(String(row.member_id))}"][data-kind="ghost"]`);
    if(!actualNode || !ghostNode) return;
    const a=actualNode.getBoundingClientRect();
    const g=ghostNode.getBoundingClientRect();
    const x1=a.left+a.width/2-box.left;
    const y1=a.top+a.height/2-box.top;
    const x2=g.left+g.width/2-box.left;
    const y2=g.top+g.height/2-box.top;
    const bend=Math.max(70,Math.abs(x2-x1)*.28);
    const direction=x2>=x1 ? 1 : -1;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',`M ${x1} ${y1} C ${x1+(bend*direction)} ${y1}, ${x2-(bend*direction)} ${y2}, ${x2} ${y2}`);
    path.setAttribute('data-thread-member',String(row.member_id));
    threadLayer.appendChild(path);
  });
}

async function refreshMap({quiet=false}={}){
  if(isRefreshing) return;
  isRefreshing=true;
  if(!quiet) setMessage('Refreshing the Living Map…');
  try{
    const [state,rows,selfProfile]=await Promise.all([
      getTeamMapViewerState(),
      listTeamMapPresences(),
      getPriestessProfile().catch(()=>null),
    ]);
    viewerState=state;
    const selfWebsite=safeExternalHref(selfProfile?.website_url || '');
    currentRows=(rows || []).map(row=>String(row.member_id)===String(currentProfile?.id) && selfWebsite
      ? {...row,website_url:selfWebsite}
      : row);
    flowtelDate.textContent=`${formatFlowtelDate(state.flowtel_date)} · America/Los_Angeles`;
    renderVisibility();
    renderQuadrants(currentRows);
    renderSummary(currentRows);
    renderYourPresence(currentRows);
    setMessage('');
  }catch(error){
    console.error(error);
    setMessage(error?.message || 'The Living Map could not open just now.');
    presenceSummary.textContent='The Living Map is resting.';
  }finally{
    isRefreshing=false;
  }
}

async function handleVisibilityChange(){
  if(!visibilityToggle || !viewerState?.can_appear) return;
  const requested=visibilityToggle.checked;
  visibilityToggle.disabled=true;
  try{
    await setTeamMapVisibility(requested);
    viewerState={...viewerState,is_visible:requested};
    await refreshMap({quiet:true});
    setMessage(requested
      ? 'Your presence will appear after you check in today.'
      : 'Your actual and multidimensional presences are now private.');
  }catch(error){
    console.error(error);
    visibilityToggle.checked=!requested;
    setMessage(error?.message || 'Your Living Map setting could not be saved.');
  }finally{
    visibilityToggle.disabled=false;
  }
}

async function init(){
  dialogClose?.addEventListener('click',closePresence);
  dialog?.addEventListener('click',event=>{ if(event.target===dialog) closePresence(); });
  visibilityToggle?.addEventListener('change',handleVisibilityChange);
  window.addEventListener('focus',()=>refreshMap({quiet:true}));
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') refreshMap({quiet:true}); });
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(drawAstralThreads,160);
  });

  currentProfile=await getCurrentProfile();
  if(!currentProfile){
    setMessage('Enter through the Flowtel first to open the Living Map.');
    presenceSummary.textContent='No active Flowtel session.';
    return;
  }

  await refreshMap();
  refreshTimer=setInterval(()=>refreshMap({quiet:true}),30000);
}

init().catch(error=>{
  console.error(error);
  setMessage(error?.message || 'The Living Map could not open just now.');
});
