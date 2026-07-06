import {
  getCurrentProfile,
  getPriestessProfile,
  savePriestessProfileDraft,
  submitPriestessProfile,
  priestessProfileStatusCopy,
} from '/shared/flowtel.js';
import {
  renderTopNav,
  renderAccessCard,
  requestedMemberId,
  canTendOwnAssignments,
  isViewingAnotherMember,
  escapeHtml,
  safeHref,
  setMessage,
  profileStatusPill,
  csvToPills,
  boolAttr,
} from '/flow-fm/ui.js';

const topNav = document.getElementById('topNav');
const accessState = document.getElementById('accessState');
const profileStudioIntro = document.getElementById('profileStudioIntro');
const profileStudioForm = document.getElementById('profileStudioForm');
const profileStudioPreview = document.getElementById('profileStudioPreview');
const message = document.getElementById('message');

let currentProfile = null;
let currentPriestessProfile = null;

function profilePayloadFromForm(form){
  const data = new FormData(form);
  return {
    priestessName: String(data.get('priestess_name') || ''),
    legalName: String(data.get('legal_name') || ''),
    profileEmail: String(data.get('profile_email') || ''),
    profilePhotoUrl: String(data.get('profile_photo_url') || ''),
    bio: String(data.get('bio') || ''),
    modalities: String(data.get('modalities') || ''),
    whoSheServes: String(data.get('who_she_serves') || ''),
    sessionTypes: String(data.get('session_types') || ''),
    schedulingUrl: String(data.get('scheduling_url') || ''),
    websiteUrl: String(data.get('website_url') || ''),
    instagramUrl: String(data.get('instagram_url') || ''),
    tiktokUrl: String(data.get('tiktok_url') || ''),
    podcastUrl: String(data.get('podcast_url') || ''),
    queendomName: String(data.get('queendom_name') || ''),
    offerings: String(data.get('offerings') || ''),
    location: String(data.get('location') || ''),
    timezone: String(data.get('timezone') || ''),
    frameworkLanguage: String(data.get('framework_language') || ''),
    networkOptIn: !!data.get('network_opt_in'),
    revenueShareOptIn: !!data.get('revenue_share_opt_in'),
  };
}
function profileReviewNotes(profile){
  const mentor = String(profile?.mentor_note || '').trim();
  const admin = String(profile?.admin_note || '').trim();
  const reviewer = profile?.reviewer_name ? ` · ${profile.reviewer_name}` : '';
  if(!mentor && !admin) return '';
  return `<div class="witness-note profile-note"><p class="eyebrow">PROFILE NOTE${escapeHtml(reviewer)}</p>${mentor ? `<p>${escapeHtml(mentor)}</p>` : ''}${admin ? `<p class="admin-note">Admin note: ${escapeHtml(admin)}</p>` : ''}</div>`;
}
function profileLinkRows(profile){
  const links = [
    ['Book a Session', safeHref(profile?.scheduling_url)],
    ['Website', safeHref(profile?.website_url)],
    ['Instagram', safeHref(profile?.instagram_url)],
    ['TikTok', safeHref(profile?.tiktok_url)],
    ['Podcast', safeHref(profile?.podcast_url)],
  ].filter(([,href]) => href);
  return links.length ? `<div class="profile-links">${links.map(([label,href]) => `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join('')}</div>` : '';
}
function renderDisplayProfile(profile={}){
  const photo = safeHref(profile.profile_photo_url);
  const name = profile.priestess_name || profile.member_name || 'Priestess Profile';
  const queendom = profile.queendom_name || 'Queendom doorway coming soon';
  const modalities = csvToPills(profile.modalities);
  const sessionTypes = csvToPills(profile.session_types);
  const offerings = csvToPills(profile.offerings);
  return `<article class="display-profile-card">
    <div class="display-profile-hero"><div class="profile-photo">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" />` : '🌹'}</div><div><p class="eyebrow">${escapeHtml(queendom)}</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(profile.location || 'Location + timezone to be added')}</p>${profileStatusPill(profile.status)}</div></div>
    <div class="profile-section"><p class="eyebrow">ABOUT ME</p><p>${escapeHtml(profile.bio || 'Your About Me will appear here as the public-facing profile preview.')}</p></div>
    ${modalities ? `<div class="profile-section"><p class="eyebrow">MODALITIES</p><div class="profile-tags">${modalities}</div></div>` : ''}
    ${sessionTypes ? `<div class="profile-section"><p class="eyebrow">SESSION TYPES</p><div class="profile-tags">${sessionTypes}</div></div>` : ''}
    ${offerings ? `<div class="profile-section"><p class="eyebrow">OFFERINGS</p><div class="profile-tags">${offerings}</div></div>` : ''}
    ${profileLinkRows(profile)}
    ${profileReviewNotes(profile)}
  </article>`;
}
function renderProfileStudio(profile={}, { readOnly=false } = {}){
  const record = profile || {};
  profileStudioIntro.textContent = readOnly
    ? 'Viewing this Priestess Profile through the mentor consent layer or in read-only mode.'
    : 'The form lives on the left and your display profile preview lives on the right.';
  profileStudioPreview.innerHTML = renderDisplayProfile(record);
  if(readOnly){
    profileStudioForm.innerHTML = `<div class="profile-readonly-panel"><p class="eyebrow">DISPLAY PROFILE</p><h3>${escapeHtml(record.priestess_name || record.member_name || 'Priestess Profile')}</h3><p>${escapeHtml(priestessProfileStatusCopy(record.status))}</p>${profileReviewNotes(record)}</div>`;
    return;
  }
  profileStudioForm.innerHTML = `<form class="profile-form" id="priestessProfileForm">
    <div class="profile-form-heading"><div><p class="eyebrow">PROFILE INTAKE</p><h3>Your public-facing doorway</h3><p>${escapeHtml(priestessProfileStatusCopy(record.status))}</p></div>${profileStatusPill(record.status)}</div>
    <div class="form-grid"><label><span>Priestess name</span><input name="priestess_name" value="${escapeHtml(record.priestess_name || '')}" placeholder="Megan Michele" /></label><label><span>Legal/profile name if different</span><input name="legal_name" value="${escapeHtml(record.legal_name || '')}" placeholder="Optional" /></label></div>
    <div class="form-grid"><label><span>Profile email</span><input name="profile_email" type="email" value="${escapeHtml(record.profile_email || currentProfile?.email || '')}" placeholder="hello@example.com" /></label><label><span>Photo URL</span><input name="profile_photo_url" type="url" value="${escapeHtml(record.profile_photo_url || '')}" placeholder="https://..." /></label></div>
    <label><span>About Me / Bio</span><textarea name="bio" rows="5">${escapeHtml(record.bio || '')}</textarea></label>
    <label><span>Modalities</span><textarea name="modalities" rows="3">${escapeHtml(record.modalities || '')}</textarea></label>
    <label><span>Who she serves</span><textarea name="who_she_serves" rows="3">${escapeHtml(record.who_she_serves || '')}</textarea></label>
    <label><span>Session types</span><textarea name="session_types" rows="3">${escapeHtml(record.session_types || '')}</textarea></label>
    <label><span>Offerings</span><textarea name="offerings" rows="4">${escapeHtml(record.offerings || '')}</textarea></label>
    <div class="form-grid"><label><span>Queendom name</span><input name="queendom_name" value="${escapeHtml(record.queendom_name || '')}" /></label><label><span>Location</span><input name="location" value="${escapeHtml(record.location || '')}" /></label></div>
    <div class="form-grid"><label><span>Timezone</span><input name="timezone" value="${escapeHtml(record.timezone || '')}" placeholder="America/Los_Angeles" /></label><label><span>Scheduling link</span><input name="scheduling_url" type="url" value="${escapeHtml(record.scheduling_url || '')}" placeholder="https://..." /></label></div>
    <div class="form-grid"><label><span>Website</span><input name="website_url" type="url" value="${escapeHtml(record.website_url || '')}" placeholder="https://..." /></label><label><span>Instagram</span><input name="instagram_url" type="url" value="${escapeHtml(record.instagram_url || '')}" placeholder="https://..." /></label></div>
    <div class="form-grid"><label><span>TikTok</span><input name="tiktok_url" type="url" value="${escapeHtml(record.tiktok_url || '')}" placeholder="https://..." /></label><label><span>Podcast</span><input name="podcast_url" type="url" value="${escapeHtml(record.podcast_url || '')}" placeholder="https://..." /></label></div>
    <label><span>Womb / magic / framework language</span><textarea name="framework_language" rows="4">${escapeHtml(record.framework_language || '')}</textarea></label>
    <div class="profile-consent-grid"><label class="checkbox-row"><input type="checkbox" name="network_opt_in" ${boolAttr(record.network_opt_in)} /><span>I am interested in the Flowtel practitioner network doorway.</span></label><label class="checkbox-row"><input type="checkbox" name="revenue_share_opt_in" ${boolAttr(record.revenue_share_opt_in)} /><span>I understand future Queendom booking/revenue-share details will be confirmed later.</span></label></div>
    ${profileReviewNotes(record)}
    <div class="assignment-actions profile-actions"><button type="button" data-profile-action="preview">Refresh Preview</button><button type="button" data-profile-action="draft">Save Profile Draft</button><button type="button" data-profile-action="submit">Send Profile to be Witnessed</button></div>
  </form>`;
  bindProfileForm();
}
function bindProfileForm(){
  const form = document.getElementById('priestessProfileForm');
  if(!form) return;
  form.querySelectorAll('[data-profile-action]').forEach(button => {
    button.addEventListener('click', () => handleProfileAction(form, button.dataset.profileAction));
  });
}
async function handleProfileAction(form, action){
  const payload = profilePayloadFromForm(form);
  try{
    if(action === 'preview'){
      currentPriestessProfile = { ...(currentPriestessProfile || {}), ...{
        priestess_name: payload.priestessName,
        legal_name: payload.legalName,
        profile_email: payload.profileEmail,
        profile_photo_url: payload.profilePhotoUrl,
        bio: payload.bio,
        modalities: payload.modalities,
        who_she_serves: payload.whoSheServes,
        session_types: payload.sessionTypes,
        scheduling_url: payload.schedulingUrl,
        website_url: payload.websiteUrl,
        instagram_url: payload.instagramUrl,
        tiktok_url: payload.tiktokUrl,
        podcast_url: payload.podcastUrl,
        queendom_name: payload.queendomName,
        offerings: payload.offerings,
        location: payload.location,
        timezone: payload.timezone,
        framework_language: payload.frameworkLanguage,
        network_opt_in: payload.networkOptIn,
        revenue_share_opt_in: payload.revenueShareOptIn,
      }};
      renderProfileStudio(currentPriestessProfile, { readOnly:false });
      setMessage(message, 'Profile preview refreshed.');
      return;
    }
    setMessage(message, action === 'submit' ? 'Sending your Priestess Profile to be witnessed...' : 'Saving your Priestess Profile draft...');
    if(action === 'submit') await submitPriestessProfile(payload);
    else await savePriestessProfileDraft(payload);
    await refreshPriestessProfile();
    setMessage(message, action === 'submit' ? 'Priestess Profile sent to be witnessed.' : 'Priestess Profile draft saved.');
  }catch(error){
    console.error(error);
    setMessage(message, error.message || 'This Priestess Profile could not be tended yet.');
  }
}
async function refreshPriestessProfile(){
  const readOnly = !currentProfile || isViewingAnotherMember(currentProfile) || !canTendOwnAssignments(currentProfile);
  try{
    currentPriestessProfile = await getPriestessProfile(requestedMemberId());
  }catch(error){
    console.error(error);
    currentPriestessProfile = { status: 'draft' };
    if(!readOnly){
      setMessage(message, 'The Studio opened, but the saved profile could not be loaded. You can still begin drafting here.');
    }
  }
  renderProfileStudio(currentPriestessProfile, { readOnly });
}
async function init(){
  topNav.innerHTML = renderTopNav('profile-studio');
  try{
    currentProfile = await getCurrentProfile();
    accessState.innerHTML = renderAccessCard(currentProfile);
    await refreshPriestessProfile();
  }catch(error){
    console.error(error);
    accessState.innerHTML = renderAccessCard(null);
    renderProfileStudio({ status: 'draft' }, { readOnly: true });
    setMessage(message, 'The Priestess Profile Studio is visible in preview mode.');
  }
}
init();
