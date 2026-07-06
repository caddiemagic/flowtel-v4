import {
  getCurrentProfile,
  getPriestessProfile,
  savePriestessProfileDraft,
  submitPriestessProfile,
  priestessProfileStatusCopy,
  PRIESTESS_TITLE_OPTIONS,
  PRIESTESS_BIO_TEMPLATES,
  PRIESTESS_OFFERING_OPTIONS,
  FLOWTEL_TIMEZONE_OPTIONS,
  labelForPriestessTitle,
  bioTemplatesForTitle,
  findBioTemplate,
  offeringLabelsFromValues,
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
} from '/flow-fm/ui.js';

const topNav = document.getElementById('topNav');
const accessState = document.getElementById('accessState');
const profileStudioIntro = document.getElementById('profileStudioIntro');
const profileStudioForm = document.getElementById('profileStudioForm');
const profileStudioPreview = document.getElementById('profileStudioPreview');
const message = document.getElementById('message');

let currentProfile = null;
let currentPriestessProfile = null;

function selectedTitleValue(record = {}){
  const existing = String(record.priestess_title || record.modalities || '').trim();
  return PRIESTESS_TITLE_OPTIONS.find(item => item.value === existing || item.label === existing)?.value || 'rose-priestess';
}
function selectedBioValue(record = {}){
  const existingKey = String(record.bio_template_key || '').trim();
  if(existingKey && PRIESTESS_BIO_TEMPLATES.some(item => item.value === existingKey)) return existingKey;
  return findBioTemplate(record.bio || '').value;
}
function selectedOfferingValues(record = {}){
  const existing = String(record.offering_template_keys || record.offerings || '').split(/[
,]/).map(item => item.trim()).filter(Boolean);
  return existing.map(value => PRIESTESS_OFFERING_OPTIONS.find(item => item.value === value || item.label === value)?.value || value).filter(Boolean);
}
function displayLocation(record = {}){
  if(typeof record.display_location === 'boolean') return record.display_location;
  return !!String(record.location || '').trim();
}
function valuesFromForm(form){
  const data = new FormData(form);
  const titleValue = String(data.get('title_value') || 'rose-priestess');
  const bioValue = String(data.get('bio_template') || bioTemplatesForTitle(titleValue)[0]?.value || PRIESTESS_BIO_TEMPLATES[0].value);
  const bio = PRIESTESS_BIO_TEMPLATES.find(item => item.value === bioValue)?.copy || '';
  const title = labelForPriestessTitle(titleValue);
  const offeringValues = data.getAll('offerings').map(value => String(value));
  const offerings = offeringLabelsFromValues(offeringValues).join(', ');
  const location = String(data.get('location') || '').trim();
  const shouldDisplayLocation = !!data.get('display_location');
  const timezone = String(data.get('timezone') || 'America/Los_Angeles');
  return {
    titleValue,
    title,
    bioValue,
    bio,
    offeringValues,
    offerings,
    priestessName: String(data.get('priestess_name') || '').trim(),
    legalName: String(data.get('legal_name') || '').trim(),
    websiteUrl: String(data.get('website_url') || '').trim(),
    location,
    displayLocation: shouldDisplayLocation,
    timezone,
  };
}
function profilePayloadFromForm(form){
  const values = valuesFromForm(form);
  return {
    priestessName: values.priestessName,
    legalName: values.legalName,
    profileEmail: currentProfile?.email || currentPriestessProfile?.profile_email || '',
    profilePhotoUrl: currentPriestessProfile?.profile_photo_url || '',
    bio: values.bio,
    modalities: values.title,
    whoSheServes: '',
    sessionTypes: '',
    schedulingUrl: currentPriestessProfile?.scheduling_url || '',
    websiteUrl: values.websiteUrl,
    instagramUrl: currentPriestessProfile?.instagram_url || '',
    tiktokUrl: currentPriestessProfile?.tiktok_url || '',
    podcastUrl: currentPriestessProfile?.podcast_url || '',
    queendomName: values.priestessName ? `${values.priestessName}'s Queendom` : 'Your Queendom',
    offerings: values.offerings,
    location: values.displayLocation ? values.location : '',
    timezone: values.timezone,
    frameworkLanguage: `Profile Studio selections: title=${values.titleValue}; bio=${values.bioValue}; offerings=${values.offeringValues.join('|')}; display_location=${values.displayLocation}; private_location=${values.location}`,
    networkOptIn: !!currentPriestessProfile?.network_opt_in,
    revenueShareOptIn: !!currentPriestessProfile?.revenue_share_opt_in,
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
  const website = safeHref(profile?.website_url);
  return website ? `<div class="profile-links"><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Visit Website</a></div>` : '';
}
function renderDisplayProfile(profile={}){
  const name = profile.priestess_name || profile.member_name || 'Priestess Profile';
  const title = labelForPriestessTitle(profile.priestess_title || profile.modalities || 'Priestess');
  const locationLine = String(profile.location || '').trim();
  const timezoneLine = String(profile.timezone || '').trim();
  const offerings = offeringLabelsFromValues(profile.offering_template_keys || profile.offerings).map(item => `<span>${escapeHtml(item)}</span>`).join('');
  return `<article class="display-profile-card display-profile-card--simple">
    <div class="display-profile-hero">
      <div class="profile-photo">🌹</div>
      <div>
        <p class="eyebrow">${escapeHtml(title)}</p>
        <h3>${escapeHtml(name)}</h3>
        ${locationLine ? `<p>${escapeHtml(locationLine)}</p>` : ''}
        ${timezoneLine ? `<p class="timezone-line">${escapeHtml(timezoneLine)}</p>` : ''}
        ${profileStatusPill(profile.status)}
      </div>
    </div>
    <div class="profile-section"><p class="eyebrow">ABOUT ME</p><p>${escapeHtml(profile.bio || 'Choose a prepared bio to begin. Your profile can evolve as your medicine becomes clearer.')}</p></div>
    ${offerings ? `<div class="profile-section"><p class="eyebrow">OFFERINGS</p><div class="profile-tags">${offerings}</div></div>` : ''}
    ${profileLinkRows(profile)}
    ${profileReviewNotes(profile)}
  </article>`;
}
function renderTitleOptions(selected){
  return PRIESTESS_TITLE_OPTIONS.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}
function renderBioOptions(titleValue, selected){
  const options = bioTemplatesForTitle(titleValue);
  return options.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}
function renderOfferingOptions(selectedValues=[]){
  return PRIESTESS_OFFERING_OPTIONS.map(item => `<label class="selection-chip"><input type="checkbox" name="offerings" value="${escapeHtml(item.value)}" ${selectedValues.includes(item.value) ? 'checked' : ''} /><span>${escapeHtml(item.label)}</span></label>`).join('');
}
function renderTimezoneOptions(selected){
  return FLOWTEL_TIMEZONE_OPTIONS.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}
function formProfilePreviewFromRecord(record={}){
  return {
    ...record,
    priestess_name: record.priestess_name || '',
    modalities: labelForPriestessTitle(record.priestess_title || record.modalities || 'rose-priestess'),
    bio: record.bio || findBioTemplate('').copy,
    offerings: record.offerings || '',
    location: displayLocation(record) ? (record.location || '') : '',
    timezone: record.timezone || 'America/Los_Angeles',
  };
}
function renderProfileStudio(profile={}, { readOnly=false } = {}){
  const record = profile || {};
  profileStudioIntro.textContent = readOnly
    ? 'Viewing this Priestess Profile through the consent layer or in read-only mode.'
    : 'Choose a prepared title, bio, and offering doorway. This profile can be refined later.';
  profileStudioPreview.innerHTML = renderDisplayProfile(formProfilePreviewFromRecord(record));
  if(readOnly){
    profileStudioForm.innerHTML = `<div class="profile-readonly-panel"><p class="eyebrow">DISPLAY PROFILE</p><h3>${escapeHtml(record.priestess_name || record.member_name || 'Priestess Profile')}</h3><p>${escapeHtml(priestessProfileStatusCopy(record.status))}</p>${profileReviewNotes(record)}</div>`;
    return;
  }
  const titleValue = selectedTitleValue(record);
  const bioValue = selectedBioValue(record);
  const offeringValues = selectedOfferingValues(record);
  const timezone = record.timezone || 'America/Los_Angeles';
  profileStudioForm.innerHTML = `<form class="profile-form profile-form--simple" id="priestessProfileForm">
    <div class="profile-form-heading">
      <div><p class="eyebrow">YOUR FIRST DOORWAY</p><h3>Pick what is true enough for now.</h3><p>${escapeHtml(priestessProfileStatusCopy(record.status))}</p></div>
      ${profileStatusPill(record.status)}
    </div>
    <div class="form-grid"><label><span>Profile Name</span><input name="priestess_name" value="${escapeHtml(record.priestess_name || '')}" placeholder="First name or priestess name" /></label><label><span>Legal Name — private</span><input name="legal_name" value="${escapeHtml(record.legal_name || '')}" placeholder="For future network documents" /></label></div>
    <label><span>Title</span><select name="title_value">${renderTitleOptions(titleValue)}</select></label>
    <label><span>Bio Template</span><select name="bio_template">${renderBioOptions(titleValue, bioValue)}</select></label>
    <div class="selected-bio-preview" data-selected-bio-preview></div>
    <fieldset class="offering-fieldset"><legend>Offerings</legend><div class="selection-chip-grid">${renderOfferingOptions(offeringValues)}</div></fieldset>
    <div class="form-grid"><label><span>Location — optional</span><input name="location" value="${escapeHtml(record.location || '')}" placeholder="Pacific Grove, CA / Online" /></label><label><span>Your Timezone</span><select name="timezone">${renderTimezoneOptions(timezone)}</select></label></div>
    <label class="checkbox-row checkbox-row--simple"><input type="checkbox" name="display_location" ${displayLocation(record) ? 'checked' : ''} /><span>Display my location on my Priestess Profile.</span></label>
    <label><span>External Website URL — optional</span><input name="website_url" type="url" value="${escapeHtml(record.website_url || '')}" placeholder="https://..." /></label>
    <div class="photo-upload-note"><p class="eyebrow">PROFILE PHOTO</p><p>Photo upload can stay inside the Squarespace form/content storage for now. Flowtel will hold this place for the public profile preview.</p></div>
    ${profileReviewNotes(record)}
    <div class="assignment-actions profile-actions"><button type="button" data-profile-action="preview">Refresh Preview</button><button type="button" data-profile-action="draft">Save Profile Draft</button><button type="button" data-profile-action="submit">Send Profile to be Witnessed</button></div>
  </form>`;
  bindProfileForm();
  refreshSelectedBioPreview();
}
function refreshSelectedBioPreview(){
  const form = document.getElementById('priestessProfileForm');
  const node = form?.querySelector('[data-selected-bio-preview]');
  if(!form || !node) return;
  const bioValue = form.querySelector('[name="bio_template"]')?.value;
  const bio = PRIESTESS_BIO_TEMPLATES.find(item => item.value === bioValue);
  node.innerHTML = `<p>${escapeHtml(bio?.copy || '')}</p>`;
}
function bindProfileForm(){
  const form = document.getElementById('priestessProfileForm');
  if(!form) return;
  const titleSelect = form.querySelector('[name="title_value"]');
  const bioSelect = form.querySelector('[name="bio_template"]');
  titleSelect?.addEventListener('change', () => {
    const options = bioTemplatesForTitle(titleSelect.value);
    bioSelect.innerHTML = options.map(item => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
    refreshSelectedBioPreview();
    refreshPreviewFromForm(form);
  });
  bioSelect?.addEventListener('change', () => { refreshSelectedBioPreview(); refreshPreviewFromForm(form); });
  form.querySelectorAll('input, select').forEach(input => input.addEventListener('input', () => refreshPreviewFromForm(form)));
  form.querySelectorAll('[data-profile-action]').forEach(button => button.addEventListener('click', () => handleProfileAction(form, button.dataset.profileAction)));
}
function refreshPreviewFromForm(form){
  const payload = profilePayloadFromForm(form);
  currentPriestessProfile = { ...(currentPriestessProfile || {}),
    priestess_name: payload.priestessName,
    legal_name: payload.legalName,
    bio: payload.bio,
    modalities: payload.modalities,
    website_url: payload.websiteUrl,
    offerings: payload.offerings,
    location: payload.location,
    timezone: payload.timezone,
  };
  profileStudioPreview.innerHTML = renderDisplayProfile(currentPriestessProfile);
}
async function handleProfileAction(form, action){
  const payload = profilePayloadFromForm(form);
  try{
    if(action === 'preview'){
      refreshPreviewFromForm(form);
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
    currentPriestessProfile = { status: 'draft', timezone: 'America/Los_Angeles' };
    if(!readOnly) setMessage(message, 'The Studio opened, but the saved profile could not be loaded. You can still begin drafting here.');
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
    currentProfile = null;
    renderProfileStudio({ status: 'draft', timezone: 'America/Los_Angeles' }, { readOnly: true });
    setMessage(message, 'The Priestess Profile Studio is visible in preview mode.');
  }
}
init();
