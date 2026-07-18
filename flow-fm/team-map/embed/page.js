import { listPublicTeamMapPresences } from '/shared/team-map.js?v=0.10.50';

const DEFAULT_PROFILE_IMAGE='/assets/flowtel-pinkrose.png';
const SEASONS=['Inner Autumn','Inner Summer','Inner Winter','Inner Spring'];
const TARGETS={
  'Inner Autumn':'embedAutumn',
  'Inner Summer':'embedSummer',
  'Inner Winter':'embedWinter',
  'Inner Spring':'embedSpring',
};

const embedDate=document.getElementById('embedDate');
const embedSummary=document.getElementById('embedSummary');
const embedRefresh=document.getElementById('embedRefresh');
const embedMessage=document.getElementById('embedMessage');
const dialog=document.getElementById('embedDialog');
const dialogClose=document.getElementById('embedDialogClose');
const dialogContent=document.getElementById('embedDialogContent');

let currentRows=[];
let refreshing=false;
let refreshTimer=null;

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function safeExternalHref(value){
  const raw=String(value || '').trim();
  if(!raw) return '';
  const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try{
    const url=new URL(candidate);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  }catch(error){ return ''; }
}
function safeImage(value){ return safeExternalHref(value) || DEFAULT_PROFILE_IMAGE; }
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
function formatFlowtelDate(){
  return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'}).format(new Date());
}
function timeLabel(){
  return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'}).format(new Date());
}
function hashValue(value){
  let hash=2166136261;
  for(const char of String(value || '')){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return Math.abs(hash >>> 0);
}
function presenceMarkup(presence,index){
  const row=presence.row;
  const seed=hashValue(`${row.presence_key}-${presence.kind}`);
  const delay=-((seed % 2600)/1000).toFixed(2);
  const distance=3+(seed % 4);
  const name=row.priestess_name || 'Flow FM Priestess';
  const kindLabel=presence.kind==='ghost' ? `Feels Like ${presence.season.replace(/^Inner\s+/,'')}` : '';
  return `<button class="embed-presence ${presence.kind==='ghost'?'is-ghost':'is-actual'}" type="button" data-presence-key="${escapeHtml(row.presence_key)}" style="--float-delay:${delay}s;--float-distance:${distance}px">
    <span class="embed-halo" aria-hidden="true"></span>
    <span class="embed-photo"><img src="${escapeHtml(safeImage(row.profile_photo_url))}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_IMAGE}'" /></span>
    <strong>${escapeHtml(name)}</strong>
    ${kindLabel?`<small>${escapeHtml(kindLabel)}</small>`:''}
  </button>`;
}
function collectPresences(rows,season){
  const presences=[];
  rows.forEach(row=>{
    const actual=normalizedSeason(row.actual_inner_season);
    const feels=normalizedSeason(row.feels_like_inner_season);
    if(actual===season) presences.push({row,kind:'actual',season:actual});
    if(feels && feels!==actual && feels===season) presences.push({row,kind:'ghost',season:feels});
  });
  return presences;
}
function renderMap(rows){
  SEASONS.forEach(season=>{
    const holder=document.getElementById(TARGETS[season]);
    if(!holder) return;
    const presences=collectPresences(rows,season);
    holder.innerHTML=presences.length
      ? presences.map(presence=>presenceMarkup(presence,rows.indexOf(presence.row))).join('')
      : '<p class="embed-empty">This chamber is quiet today.</p>';
  });
  document.querySelectorAll('.embed-presence').forEach(button=>{
    const row=currentRows.find(item=>String(item.presence_key)===String(button.dataset.presenceKey));
    if(row) button.addEventListener('click',()=>openProfile(row));
  });
}
function profileMarkup(row){
  const website=safeExternalHref(row.website_url);
  return `<article class="embed-profile-card">
    <div class="embed-profile-photo"><img src="${escapeHtml(safeImage(row.profile_photo_url))}" alt="${escapeHtml(row.priestess_name || 'Flow FM Priestess')}" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_IMAGE}'" /></div>
    <p class="eyebrow">CONCIERGE TEAM</p>
    <h2>${escapeHtml(row.priestess_name || 'Flow FM Priestess')}</h2>
    <p class="embed-profile-title">FLOW FM PRIESTESS</p>
    ${website?`<a class="embed-profile-link" href="${escapeHtml(website)}" target="_blank" rel="noopener">Visit Her Profile</a>`:'<p class="embed-profile-missing">Profile link coming soon.</p>'}
  </article>`;
}
function openProfile(row){
  if(!dialog || !dialogContent) return;
  dialogContent.innerHTML=profileMarkup(row);
  if(typeof dialog.showModal==='function') dialog.showModal();
  else dialog.setAttribute('open','');
}
function closeProfile(){
  if(!dialog) return;
  if(typeof dialog.close==='function') dialog.close();
  else dialog.removeAttribute('open');
}
function updateSummary(rows){
  const count=rows.length;
  embedSummary.textContent=count===1
    ? '1 team member has clocked in to the Flowtel today.'
    : count>1
      ? `${count} team members have clocked in to the Flowtel today.`
      : 'No team members have clocked in to the Flowtel yet today.';
  embedRefresh.textContent=`Last refreshed ${timeLabel()} · Flowtel Time`;
}
function postHeight(){
  const height=Math.ceil(document.documentElement.scrollHeight);
  window.parent?.postMessage({type:'FLOWTEL_TEAM_MAP_HEIGHT',height},'*');
}
async function refreshMap(){
  if(refreshing) return;
  refreshing=true;
  try{
    const rows=await listPublicTeamMapPresences();
    currentRows=rows;
    embedDate.textContent=`${formatFlowtelDate()} · Flowtel Time`;
    renderMap(rows);
    updateSummary(rows);
    embedMessage.textContent='';
  }catch(error){
    console.error(error);
    embedMessage.textContent='The concierge team map could not refresh just now.';
    embedSummary.textContent='The Team Map is resting.';
  }finally{
    refreshing=false;
    requestAnimationFrame(()=>requestAnimationFrame(postHeight));
  }
}
function init(){
  dialogClose?.addEventListener('click',closeProfile);
  dialog?.addEventListener('click',event=>{if(event.target===dialog) closeProfile();});
  window.addEventListener('load',postHeight);
  window.addEventListener('resize',postHeight);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible') refreshMap();});
  if('ResizeObserver' in window){
    const observer=new ResizeObserver(postHeight);
    observer.observe(document.body);
  }
  refreshMap();
  refreshTimer=setInterval(refreshMap,60000);
}
init();
