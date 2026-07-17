import { getCurrentProfile } from '/shared/profiles.js';
import { getTeamMapProfile } from '/shared/team-map.js?v=0.10.44';

const DEFAULT_PROFILE_IMAGE='/assets/flowtel-pinkrose.png';
const profileView=document.getElementById('profileView');
const message=document.getElementById('profileMessage');

function params(){ return new URLSearchParams(window.location.search); }
function memberId(){ return params().get('member'); }
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function safeHref(value){
  const raw=String(value || '').trim();
  if(!raw) return '';
  const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try{
    const url=new URL(candidate);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  }catch(error){ return ''; }
}
function imageSrc(value){ return safeHref(value) || DEFAULT_PROFILE_IMAGE; }
function humanize(value){
  return String(value || '')
    .replace(/[-_]+/g,' ')
    .replace(/\b\w/g,char=>char.toUpperCase());
}
function listItems(value){
  return String(value || '').split(/[\n,]/).map(item=>item.trim()).filter(Boolean).slice(0,16);
}
function chips(value){
  return listItems(value).map(item=>`<span>${escapeHtml(humanize(item))}</span>`).join('');
}
function renderClosed(profile){
  profileView.innerHTML=`<article class="queendom-profile-card profile-not-open">
    <img class="queendom-profile-photo" src="${escapeHtml(imageSrc(profile?.profile_photo_url))}" alt="${escapeHtml(profile?.priestess_name || 'Flow FM Priestess')}" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_IMAGE}'" />
    <p class="eyebrow">HER QUEENDOM</p>
    <h1>${escapeHtml(profile?.priestess_name || 'Flow FM Priestess')}</h1>
    <p>Her Queendom profile is still being witnessed. Return to the Living Map and visit again when this doorway opens.</p>
    <a class="visit-queendom-button" href="/flow-fm/team-map/">Return to the Living Map</a>
  </article>`;
}
function renderProfile(profile){
  const book=safeHref(profile.scheduling_url);
  const website=safeHref(profile.website_url);
  const offerings=chips(profile.offerings || profile.session_types);
  profileView.innerHTML=`<article class="queendom-profile-card">
    <div class="profile-temple-mark" aria-hidden="true"><img src="/assets/queendom-scarab-sundisk-transparent.png" alt="" /></div>
    <img class="queendom-profile-photo" src="${escapeHtml(imageSrc(profile.profile_photo_url))}" alt="${escapeHtml(profile.priestess_name)}" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_IMAGE}'" />
    <p class="eyebrow">${escapeHtml(profile.queendom_name || 'HER QUEENDOM')}</p>
    <h1>${escapeHtml(profile.priestess_name || 'Flow FM Priestess')}</h1>
    <p class="profile-priestess-title">${escapeHtml(profile.priestess_title || 'Flow FM Priestess')}</p>
    ${profile.location?`<p class="profile-location">${escapeHtml(profile.location)}</p>`:''}
    ${profile.bio?`<div class="profile-story"><p>${escapeHtml(profile.bio)}</p></div>`:''}
    ${profile.who_she_serves?`<section class="profile-detail"><p class="eyebrow">WHO SHE SERVES</p><p>${escapeHtml(profile.who_she_serves)}</p></section>`:''}
    ${offerings?`<section class="profile-detail"><p class="eyebrow">WAYS TO WORK TOGETHER</p><div class="profile-offering-chips">${offerings}</div></section>`:''}
    ${profile.framework_language?`<section class="profile-detail"><p class="eyebrow">HER MEDICINE</p><p>${escapeHtml(profile.framework_language)}</p></section>`:''}
    <div class="profile-booking-actions">
      ${book?`<a class="visit-queendom-button primary" href="${escapeHtml(book)}" target="_blank" rel="noopener">Book a Session</a>`:''}
      ${website?`<a class="visit-queendom-button" href="${escapeHtml(website)}" target="_blank" rel="noopener">Visit Her Website</a>`:''}
    </div>
  </article>`;
}
async function init(){
  const current=await getCurrentProfile();
  if(!current){
    message.textContent='Enter through the Flowtel first to visit this Queendom.';
    return;
  }
  const id=memberId();
  if(!id){
    message.textContent='Choose a Priestess from the Living Map.';
    return;
  }
  try{
    const profile=await getTeamMapProfile(id);
    if(!profile){
      message.textContent='This Queendom doorway could not be found.';
      return;
    }
    if(!profile.profile_available) renderClosed(profile);
    else renderProfile(profile);
  }catch(error){
    console.error(error);
    message.textContent=error?.message || 'This Queendom could not open just now.';
  }
}
init();
