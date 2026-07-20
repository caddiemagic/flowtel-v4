import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';
// Flowtel v0.10.56 — compact Profile Studio, human timezone preview, and Priestess Audio Mailbox.
// This page intentionally renders the form before any Supabase/profile imports finish.
// The form should never stay stuck on loading placeholders.

const PRIESTESS_TITLE_OPTIONS = [
  { value: 'rose-priestess', label: 'Rose Priestess' },
  { value: 'moon-priestess', label: 'Moon Priestess' },
  { value: 'womb-priestess', label: 'Womb Priestess' },
  { value: 'medicine-woman', label: 'Medicine Woman' },
];
const PRIESTESS_BIO_TEMPLATES = [
  { value: 'rose-priestess-heart-opening', titleValue: 'rose-priestess', label: 'Rose Priestess · Heart Opening', copy: 'As a Rose Priestess, I guide women through the path of the rose—a journey of opening the heart, deepening self-love, and embodying the sacred feminine. My work invites women to cultivate a life rooted in beauty, devotion, pleasure, and authentic expression. Through ceremony, embodiment practices, and heart-centered healing, I help women remember that they are worthy of receiving the love, abundance, and support they desire. My intention is to create spaces where women can soften into their truth, reconnect with their hearts, and bloom into the fullest expression of who they came here to be.' },
  { value: 'rose-priestess-beauty-devotion', titleValue: 'rose-priestess', label: 'Rose Priestess · Beauty + Devotion', copy: 'As a Rose Priestess, I hold spaces where women can return to their hearts, their softness, and the beauty of their own becoming. My work blends devotion, embodiment, ceremony, and feminine wisdom to help women remember their worth, open their capacity to receive, and live from a place of love, pleasure, and truth.' },
  { value: 'moon-priestess-cyclical-rhythm', titleValue: 'moon-priestess', label: 'Moon Priestess · Cyclical Rhythm', copy: 'As a Moon Priestess, I guide women back into rhythm with the moon, their bodies, and the quiet wisdom of their inner seasons. My work supports women in honoring their energy, listening to their intuition, and creating a life that moves with natural timing instead of constant pressure. Through moon work, reflection, and cyclical practices, I help women feel more connected, steady, and sovereign in their own flow.' },
  { value: 'moon-priestess-intuition', titleValue: 'moon-priestess', label: 'Moon Priestess · Intuition + Timing', copy: 'As a Moon Priestess, I help women work with lunar timing, intuition, and cyclical awareness so they can stop forcing and start flowing. My spaces are designed to help women hear themselves more clearly, honor the season they are in, and trust the timing of their becoming.' },
  { value: 'womb-priestess-creative-power', titleValue: 'womb-priestess', label: 'Womb Priestess · Creative Power', copy: 'As a Womb Priestess, I support women in reconnecting with the wisdom, creativity, and power that lives within their bodies. My work invites women to listen to their womb, honor their cycles, release what no longer belongs, and create from a place of rooted inner authority. Through womb work, embodiment, and feminine practice, I help women remember that their body is not a burden—it is a compass.' },
  { value: 'womb-priestess-cycle-tracking', titleValue: 'womb-priestess', label: 'Womb Priestess · Cycle Wisdom', copy: 'As a Womb Priestess, I guide women into deeper relationship with their cycles, their womb wisdom, and the creative intelligence of the body. My work helps women understand their inner seasons, make decisions with more self-trust, and build lives that honor their energy instead of overriding it.' },
  { value: 'medicine-woman-ceremony', titleValue: 'medicine-woman', label: 'Medicine Woman · Ceremony + Healing', copy: 'As a Medicine Woman, I create grounded, intuitive spaces for women to reconnect with their bodies, their truth, and the medicine they already carry. My work may weave ceremony, embodiment, breath, ritual, reflection, and feminine wisdom to support women through transformation, remembrance, and deeper self-trust.' },
  { value: 'medicine-woman-embodiment', titleValue: 'medicine-woman', label: 'Medicine Woman · Embodiment + Remembrance', copy: 'As a Medicine Woman, I walk with women as they remember their own inner medicine. I hold spaces for embodiment, emotional release, intuitive reflection, and sacred reconnection so women can feel more rooted in who they are and more resourced in how they move through the world.' },
];
const PRIESTESS_OFFERING_OPTIONS = [
  { value: 'one-to-one-mentorship', label: '1:1 Mentorship' },
  { value: 'womb-awakening-mentorship', label: 'Womb Awakening Mentorship' },
  { value: 'cycle-tracking-session', label: 'Cycle Tracking Session' },
  { value: 'moon-reading', label: 'Moon Reading' },
  { value: 'breathwork-journey', label: 'Breathwork Journey' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'inner-seasons-consultation', label: 'Inner Seasons Consultation' },
];
const FLOWTEL_TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time — America/Los_Angeles' },
  { value: 'America/Denver', label: 'Mountain Time — America/Denver' },
  { value: 'America/Chicago', label: 'Central Time — America/Chicago' },
  { value: 'America/New_York', label: 'Eastern Time — America/New_York' },
  { value: 'America/Phoenix', label: 'Arizona — America/Phoenix' },
  { value: 'America/Anchorage', label: 'Alaska — America/Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii — Pacific/Honolulu' },
  { value: 'Europe/London', label: 'UK — Europe/London' },
  { value: 'Europe/Paris', label: 'Central Europe — Europe/Paris' },
  { value: 'Australia/Sydney', label: 'Sydney — Australia/Sydney' },
];

const topNav = document.getElementById('topNav');
const profileStudioIntro = document.getElementById('profileStudioIntro');
const profileStudioForm = document.getElementById('profileStudioForm');
const profileStudioPreview = document.getElementById('profileStudioPreview');
const message = document.getElementById('message');
const accessState = document.getElementById('accessState');
const priestessMailboxSection = document.getElementById('priestessMailboxSection');

let currentProfile = null;
let currentPriestessProfile = { status: 'draft', timezone: 'America/Los_Angeles' };
let profileDirtyDisplayStatus = '';
let api = null;
let mailboxApi = null;
let mailboxRows = [];
let profileClockTimer = null;
let selectedProfilePhotoFile = null;
let selectedProfilePhotoPreviewUrl = '';
const DEFAULT_PROFILE_PHOTO = '/assets/flowtel-pinkrose.png';

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function normalizeExternalUrl(value=''){
  const raw=String(value || '').trim();
  if(!raw) return '';
  const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try{
    const url=new URL(candidate);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  }catch(error){ return ''; }
}
function safeHref(value){
  return normalizeExternalUrl(value);
}
function safeImageSrc(value){
  const raw = String(value || '').trim();
  if(!raw) return '';
  if(raw.startsWith('/')) return raw;
  try{
    const url = new URL(raw, window.location.origin);
    if(['http:','https:'].includes(url.protocol)) return url.href;
  }catch(error){ console.warn('Ignoring unsafe profile image URL', error); }
  return '';
}
function setPageMessage(text=''){
  if(message) message.textContent = text;
}
function timezoneDetails(timezone='America/Los_Angeles',date=new Date()){
  const zone=String(timezone || 'America/Los_Angeles');
  try{
    const longName=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'long'})
      .formatToParts(date).find(part=>part.type==='timeZoneName')?.value || zone.replace(/_/g,' ');
    const shortName=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'short'})
      .formatToParts(date).find(part=>part.type==='timeZoneName')?.value || '';
    const currentTime=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'})
      .format(date);
    return { zone,longName,shortName,currentTime };
  }catch(error){
    console.warn('Timezone preview could not be formatted.',error);
    return { zone,longName:zone.replace(/_/g,' '),shortName:'',currentTime:'' };
  }
}
function timezonePreviewMarkup(timezone='America/Los_Angeles'){
  const details=timezoneDetails(timezone);
  const clock=details.currentTime
    ? `Current time: ${details.currentTime}${details.shortName ? ` (${details.shortName})` : ''}`
    : '';
  return `<div class="timezone-line" data-profile-timezone="${escapeHtml(details.zone)}"><span class="timezone-name">${escapeHtml(details.longName)}</span>${clock ? `<span class="timezone-clock">${escapeHtml(clock)}</span>` : ''}</div>`;
}
function updateTimezoneClocks(){
  document.querySelectorAll('[data-profile-timezone]').forEach(node=>{
    const details=timezoneDetails(node.dataset.profileTimezone || 'America/Los_Angeles');
    const name=node.querySelector('.timezone-name');
    const clock=node.querySelector('.timezone-clock');
    if(name) name.textContent=details.longName;
    if(clock) clock.textContent=`Current time: ${details.currentTime}${details.shortName ? ` (${details.shortName})` : ''}`;
  });
}
function startTimezoneClock(){
  window.clearInterval(profileClockTimer);
  updateTimezoneClocks();
  profileClockTimer=window.setInterval(updateTimezoneClocks,30000);
}
function canUseProfileStudio(profile){
  const membership=String(profile?.membership_type || '').toLowerCase().replace(/[^a-z]/g,'');
  return isPractitionerLevel(profile)
    || membership==='flowfm'
    || membership==='flowfmmember'
    || membership==='council'
    || membership.startsWith('flowfm')
    || !!profile?.flowfm_started_at
    || !!profile?.is_initiated;
}
function labelForPriestessTitle(valueOrLabel=''){
  const value=String(valueOrLabel || '').trim();
  return PRIESTESS_TITLE_OPTIONS.find(item => item.value === value || item.label === value)?.label || value || 'Priestess';
}
function bioTemplatesForTitle(titleValue=''){
  return PRIESTESS_BIO_TEMPLATES.filter(item => !titleValue || item.titleValue === titleValue);
}
function findBioTemplate(valueOrCopy=''){
  const value=String(valueOrCopy || '').trim();
  return PRIESTESS_BIO_TEMPLATES.find(item => item.value === value || item.copy === value) || PRIESTESS_BIO_TEMPLATES[0];
}
function offeringLabelsFromValues(values=[]){
  const list=Array.isArray(values) ? values : String(values || '').split(/[\n,]/).map(item=>item.trim()).filter(Boolean);
  return list.map(value => PRIESTESS_OFFERING_OPTIONS.find(item => item.value === value || item.label === value)?.label || value).filter(Boolean);
}
function normalizeMembership(value){ return String(value || '').toLowerCase().replace(/[^a-z]/g,''); }
function canTendOwnProfile(profile){ return !!profile?.id && !isViewingAnotherMember(profile); }
function requestedMemberId(){ return new URLSearchParams(window.location.search).get('member') || new URLSearchParams(window.location.search).get('client') || null; }
function isViewingAnotherMember(profile){ return !!requestedMemberId() && requestedMemberId() !== profile?.id; }
function selectedTitleValue(record={}){
  const existing=String(record.priestess_title || record.modalities || '').trim();
  return PRIESTESS_TITLE_OPTIONS.find(item => item.value === existing || item.label === existing)?.value || 'rose-priestess';
}
function selectedBioValue(record={}){
  const existingKey=String(record.bio_template_key || '').trim();
  if(existingKey && PRIESTESS_BIO_TEMPLATES.some(item => item.value === existingKey)) return existingKey;
  return findBioTemplate(record.bio || '').value;
}
function selectedOfferingValues(record={}){
  return String(record.offering_template_keys || record.offerings || '')
    .split(/[\n,|]/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(value => PRIESTESS_OFFERING_OPTIONS.find(item => item.value === value || item.label === value)?.value || value)
    .filter(Boolean);
}
function displayLocation(record={}){
  if(typeof record.display_location === 'boolean') return record.display_location;
  return !!String(record.location || '').trim();
}
function renderProfileStatusPill(status='draft'){
  const key=String(status || 'draft');
  const label = {draft:'Draft',draft_revision:'Draft Revision',submitted:'Submitted',approved:'Approved',needs_revision:'Needs revision'}[key] || 'Draft';
  const tone = {draft:'draft',draft_revision:'revision',submitted:'submitted',approved:'complete',needs_revision:'revision'}[key] || 'draft';
  return `<span class="status-pill tone-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}
function displayStatusForProfile(profile={}){
  return profile.display_status || profileDirtyDisplayStatus || profile.status || 'draft';
}
function dirtyDisplayStatusFor(status='draft'){
  const key=String(status || 'draft');
  if(key==='submitted') return 'draft';
  if(key==='approved') return 'draft_revision';
  return key || 'draft';
}
function statusCopy(status='draft'){
  return {
    draft:'Your profile draft is still in your hands. Save as often as you need.',
    draft_revision:'This approved profile has fresh edits. Save the draft revision, then send it to be witnessed when it is ready.',
    submitted:'Your Priestess Profile has been sent to be witnessed.',
    approved:'Your Priestess Profile has been approved for the next doorway.',
    needs_revision:'A refinement has been requested. Tend the note, soften the language, and send the next version when ready.',
  }[String(status || 'draft')] || 'Your profile draft is still in your hands. Save as often as you need.';
}
function profilePhotoMarkup(profile={}){
  const src=safeImageSrc(profile.profile_photo_url || profile.profilePhotoUrl) || DEFAULT_PROFILE_PHOTO;
  return `<div class="profile-photo profile-photo--rose"><img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.hidden=true; this.parentElement && this.parentElement.classList.add('photo-fallback');" /></div>`;
}
function valuesFromForm(form){
  const data=new FormData(form);
  const titleValue=String(data.get('title_value') || 'rose-priestess');
  const bioValue=String(data.get('bio_template') || bioTemplatesForTitle(titleValue)[0]?.value || PRIESTESS_BIO_TEMPLATES[0].value);
  const bio=PRIESTESS_BIO_TEMPLATES.find(item => item.value === bioValue)?.copy || '';
  const title=labelForPriestessTitle(titleValue);
  const offeringValues=data.getAll('offerings').map(value => String(value));
  const offerings=offeringLabelsFromValues(offeringValues).join(', ');
  const location=String(data.get('location') || '').trim();
  const displayLocationValue=!!data.get('display_location');
  return {
    titleValue,
    title,
    bioValue,
    bio,
    offeringValues,
    offerings,
    displayName:String(data.get('display_name') || '').trim(),
    legalFirstName:String(data.get('legal_first_name') || '').trim(),
    legalLastName:String(data.get('legal_last_name') || '').trim(),
    websiteUrl:normalizeExternalUrl(data.get('website_url') || ''),
    location,
    displayLocation:displayLocationValue,
    timezone:String(data.get('timezone') || 'America/Los_Angeles'),
  };
}
function payloadFromValues(values){
  return {
    priestessName: values.displayName,
    displayName: values.displayName,
    legalFirstName: values.legalFirstName,
    legalLastName: values.legalLastName,
    legalName: [values.legalFirstName, values.legalLastName].filter(Boolean).join(' '),
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
    queendomName: values.displayName ? `${values.displayName}'s Queendom` : 'Your Queendom',
    offerings: values.offerings,
    location: values.displayLocation ? values.location : '',
    timezone: values.timezone,
    frameworkLanguage: `Profile Studio selections: title=${values.titleValue}; bio=${values.bioValue}; offerings=${values.offeringValues.join('|')}; display_location=${values.displayLocation}; private_location=${values.location}`,
    networkOptIn: !!currentPriestessProfile?.network_opt_in,
    revenueShareOptIn: !!currentPriestessProfile?.revenue_share_opt_in,
  };
}
function profilePayloadFromForm(form){
  return payloadFromValues(valuesFromForm(form));
}
function profileReviewNotes(profile){
  const mentor=String(profile?.mentor_note || '').trim();
  const admin=String(profile?.admin_note || '').trim();
  const reviewer=profile?.reviewer_name ? ` · ${profile.reviewer_name}` : '';
  if(!mentor && !admin) return '';
  return `<div class="witness-note profile-note"><p class="eyebrow">PROFILE NOTE${escapeHtml(reviewer)}</p>${mentor ? `<p>${escapeHtml(mentor)}</p>` : ''}${admin ? `<p class="admin-note">Admin note: ${escapeHtml(admin)}</p>` : ''}</div>`;
}
function renderDisplayProfile(profile={}){
  const name=profile.display_name || profile.priestess_name || profile.member_name || 'Priestess Profile';
  const title=labelForPriestessTitle(profile.priestess_title || profile.modalities || 'rose-priestess');
  const locationLine=String(profile.location || '').trim();
  const timezone=String(profile.timezone || '').trim();
  const website=safeHref(profile.website_url);
  const offerings=offeringLabelsFromValues(profile.offering_template_keys || profile.offerings).map(item=>`<span>${escapeHtml(item)}</span>`).join('');
  const displayStatus=displayStatusForProfile(profile);
  return `<article class="display-profile-card display-profile-card--simple">
    <div class="display-profile-hero">${profilePhotoMarkup(profile)}<div><p class="eyebrow">${escapeHtml(title)}</p><h3>${escapeHtml(name)}</h3>${locationLine ? `<p>${escapeHtml(locationLine)}</p>` : ''}${timezone ? timezonePreviewMarkup(timezone) : ''}${renderProfileStatusPill(displayStatus)}</div></div>
    <div class="profile-section"><p class="eyebrow">ABOUT ME</p><p>${escapeHtml(profile.bio || 'Choose a prepared bio to begin. Your profile can evolve as your medicine becomes clearer.')}</p></div>
    ${offerings ? `<div class="profile-section"><p class="eyebrow">OFFERINGS</p><div class="profile-tags">${offerings}</div></div>` : ''}
    ${website ? `<div class="profile-links"><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Visit Website</a></div>` : ''}
    ${profileReviewNotes(profile)}
  </article>`;
}
function renderTitleOptions(selected){
  return PRIESTESS_TITLE_OPTIONS.map(item=>`<option value="${escapeHtml(item.value)}" ${item.value===selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}
function renderBioOptions(titleValue, selected){
  const options=bioTemplatesForTitle(titleValue);
  return options.map(item=>`<option value="${escapeHtml(item.value)}" ${item.value===selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}
function renderOfferingOptions(selectedValues=[]){
  return PRIESTESS_OFFERING_OPTIONS.map(item=>`<label class="selection-chip"><input type="checkbox" name="offerings" value="${escapeHtml(item.value)}" ${selectedValues.includes(item.value) ? 'checked' : ''} /><span>${escapeHtml(item.label)}</span></label>`).join('');
}
function renderTimezoneOptions(selected){
  return FLOWTEL_TIMEZONE_OPTIONS.map(item=>`<option value="${escapeHtml(item.value)}" ${item.value===selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}
function renderProfileFromRecord(record={}){
  const titleValue=selectedTitleValue(record);
  return {
    ...record,
    display_name: record.display_name || record.priestess_name || '',
    priestess_name: record.display_name || record.priestess_name || '',
    legal_first_name: record.legal_first_name || record.first_name || '',
    legal_last_name: record.legal_last_name || record.last_name || '',
    modalities: labelForPriestessTitle(titleValue),
    bio: record.bio || findBioTemplate('').copy,
    offerings: record.offerings || '',
    location: displayLocation(record) ? (record.location || '') : '',
    timezone: record.timezone || 'America/Los_Angeles',
  };
}
function refreshSelectedBioPreview(){
  const form=document.getElementById('priestessProfileForm');
  const node=form?.querySelector('[data-selected-bio-preview]');
  if(!form || !node) return;
  const bio=PRIESTESS_BIO_TEMPLATES.find(item => item.value === form.querySelector('[name="bio_template"]')?.value);
  node.innerHTML=`<p>${escapeHtml(bio?.copy || '')}</p>`;
}
function refreshPreviewFromForm(form,{ markDirty=true }={}){
  const payload=profilePayloadFromForm(form);
  const displayStatus=markDirty ? dirtyDisplayStatusFor(currentPriestessProfile?.status) : displayStatusForProfile(currentPriestessProfile || {});
  profileDirtyDisplayStatus = displayStatus !== (currentPriestessProfile?.status || 'draft') ? displayStatus : '';
  currentPriestessProfile={
    ...(currentPriestessProfile || {}),
    display_status:displayStatus,
    display_name:payload.displayName,
    priestess_name:payload.displayName,
    legal_first_name:payload.legalFirstName,
    legal_last_name:payload.legalLastName,
    legal_name:payload.legalName,
    bio:payload.bio,
    modalities:payload.modalities,
    website_url:payload.websiteUrl,
    offerings:payload.offerings,
    location:payload.location,
    timezone:payload.timezone
  };
  profileStudioPreview.innerHTML=renderDisplayProfile(currentPriestessProfile);
  updateTimezoneClocks();
  const statusCopyNode=form?.querySelector('[data-profile-status-copy]');
  if(statusCopyNode) statusCopyNode.textContent=statusCopy(displayStatus);
  const statusPillNode=form?.querySelector('[data-profile-status-pill]');
  if(statusPillNode) statusPillNode.innerHTML=renderProfileStatusPill(displayStatus);
}
function clearSelectedProfilePhoto(){
  if(selectedProfilePhotoPreviewUrl){
    URL.revokeObjectURL(selectedProfilePhotoPreviewUrl);
    selectedProfilePhotoPreviewUrl='';
  }
  selectedProfilePhotoFile=null;
}
function profilePhotoUploaderMarkup(profile={}){
  const savedSrc=safeImageSrc(profile.profile_photo_url) || DEFAULT_PROFILE_PHOTO;
  const hasCustomPhoto=!!safeImageSrc(profile.profile_photo_url);
  return `<section class="profile-photo-uploader" aria-labelledby="profilePhotoHeading">
    <div class="profile-photo-upload-preview">
      <img id="profilePhotoUploadPreview" src="${escapeHtml(savedSrc)}" alt="Your Priestess profile preview" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PHOTO}'" />
    </div>
    <div class="profile-photo-upload-copy">
      <p class="eyebrow" id="profilePhotoHeading">PROFILE PHOTO</p>
      <h4>Choose your profile photo.</h4>
      <p>Upload a clear JPG, PNG, or WebP image up to 5 MB. It will appear in the Living Map, your Priestess profile, and Mentor selection. The rose remains your graceful fallback.</p>
      <input class="profile-photo-file-input" id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" />
      <div class="profile-photo-upload-actions">
        <label class="profile-photo-choose" for="profilePhotoInput">Choose Photo</label>
        <button type="button" id="uploadProfilePhotoButton" disabled>Upload Photo</button>
        <button type="button" class="secondary ${hasCustomPhoto?'':'hidden'}" id="removeProfilePhotoButton">Use the Rose</button>
      </div>
      <p class="profile-photo-upload-status" id="profilePhotoUploadStatus" role="status">${hasCustomPhoto?'Your uploaded photo is active.':'The Flowtel rose is currently holding your place.'}</p>
    </div>
  </section>`;
}
function setProfilePhotoUploadStatus(text='',tone=''){
  const status=document.getElementById('profilePhotoUploadStatus');
  if(!status) return;
  status.textContent=text;
  status.dataset.tone=tone;
}
function bindProfilePhotoUploader(){
  const input=document.getElementById('profilePhotoInput');
  const preview=document.getElementById('profilePhotoUploadPreview');
  const uploadButton=document.getElementById('uploadProfilePhotoButton');
  const removeButton=document.getElementById('removeProfilePhotoButton');
  if(!input || !preview || !uploadButton) return;

  input.addEventListener('change',()=>{
    clearSelectedProfilePhoto();
    const file=input.files?.[0] || null;
    if(!file){
      preview.src=safeImageSrc(currentPriestessProfile?.profile_photo_url) || DEFAULT_PROFILE_PHOTO;
      uploadButton.disabled=true;
      return;
    }
    const allowed=['image/jpeg','image/png','image/webp'];
    if(!allowed.includes(file.type)){
      input.value='';
      setProfilePhotoUploadStatus('Choose a JPG, PNG, or WebP image.','error');
      return;
    }
    if(file.size > 5*1024*1024){
      input.value='';
      setProfilePhotoUploadStatus('Choose a photo smaller than 5 MB.','error');
      return;
    }
    selectedProfilePhotoFile=file;
    selectedProfilePhotoPreviewUrl=URL.createObjectURL(file);
    preview.src=selectedProfilePhotoPreviewUrl;
    uploadButton.disabled=false;
    setProfilePhotoUploadStatus('Your preview is ready. Upload it when it feels true.','ready');
  });

  uploadButton.addEventListener('click',async()=>{
    if(!selectedProfilePhotoFile) return;
    if(!api?.uploadPriestessProfilePhoto){
      setProfilePhotoUploadStatus('The photo doorway is still loading. Refresh once, then try again.','error');
      return;
    }
    uploadButton.disabled=true;
    input.disabled=true;
    removeButton && (removeButton.disabled=true);
    try{
      setProfilePhotoUploadStatus('Saving your profile details and uploading your Priestess photo…','working');
      const form=document.getElementById('priestessProfileForm');
      if(form && api?.savePriestessProfileDraft){
        await api.savePriestessProfileDraft(profilePayloadFromForm(form));
      }
      const photoUrl=await api.uploadPriestessProfilePhoto(selectedProfilePhotoFile);
      clearSelectedProfilePhoto();
      currentPriestessProfile={...(currentPriestessProfile || {}),profile_photo_url:photoUrl || ''};
      await loadSavedProfile();
      await loadPriestessMailbox();
      setPageMessage('Your Priestess photo is now traveling through the Flowtel.');
    }catch(error){
      console.error(error);
      uploadButton.disabled=false;
      input.disabled=false;
      if(removeButton) removeButton.disabled=false;
      setProfilePhotoUploadStatus(error?.message || 'This photo could not be uploaded yet.','error');
    }
  });

  removeButton?.addEventListener('click',async()=>{
    if(!api?.removePriestessProfilePhoto){
      setProfilePhotoUploadStatus('The photo doorway is still loading. Refresh once, then try again.','error');
      return;
    }
    uploadButton.disabled=true;
    input.disabled=true;
    removeButton.disabled=true;
    try{
      setProfilePhotoUploadStatus('Returning your profile to the Flowtel rose…','working');
      await api.removePriestessProfilePhoto();
      clearSelectedProfilePhoto();
      currentPriestessProfile={...(currentPriestessProfile || {}),profile_photo_url:''};
      await loadSavedProfile();
      setPageMessage('The rose is holding your place again.');
    }catch(error){
      console.error(error);
      input.disabled=false;
      removeButton.disabled=false;
      setProfilePhotoUploadStatus(error?.message || 'The photo could not be removed yet.','error');
    }
  });
}

function renderProfileStudio(record=currentPriestessProfile){
  clearSelectedProfilePhoto();
  const profile=record || { status:'draft', timezone:'America/Los_Angeles' };
  const titleValue=selectedTitleValue(profile);
  const bioValue=selectedBioValue(profile);
  const offeringValues=selectedOfferingValues(profile);
  const timezone=profile.timezone || 'America/Los_Angeles';
  const displayStatus=displayStatusForProfile(profile);
  profileStudioIntro.textContent='You can return and refine this profile as often as your medicine evolves.';
  profileStudioPreview.innerHTML=renderDisplayProfile(renderProfileFromRecord(profile));
  updateTimezoneClocks();
  profileStudioForm.innerHTML=`<form class="profile-form profile-form--simple" id="priestessProfileForm">
    <div class="profile-form-heading"><div><p class="eyebrow">PROFILE DETAILS</p><h3>Shape how you are seen.</h3><p data-profile-status-copy>${escapeHtml(statusCopy(displayStatus))}</p></div><div data-profile-status-pill>${renderProfileStatusPill(displayStatus)}</div></div>
    ${isViewingAnotherMember(currentProfile)
      ? `<section class="profile-identity-fields profile-identity-fields--private"><div class="profile-identity-heading"><p class="eyebrow" id="profileIdentityHeading">FLOWTEL IDENTITY</p><p>This member privately manages her legal name and Flowtel display name from her own Profile Studio.</p></div><input type="hidden" name="display_name" value="${escapeHtml(profile.display_name || profile.priestess_name || '')}" /><input type="hidden" name="legal_first_name" value="" /><input type="hidden" name="legal_last_name" value="" /></section>`
      : `<section class="profile-identity-fields" aria-labelledby="profileIdentityHeading">
        <div class="profile-identity-heading"><p class="eyebrow" id="profileIdentityHeading">YOUR FLOWTEL IDENTITY</p><p>Your legal name stays private. Your Priestess Display Name is the name guests and team members see throughout the Flowtel.</p></div>
        <div class="form-grid"><label><span>Legal First Name — private</span><input name="legal_first_name" autocomplete="given-name" required value="${escapeHtml(profile.legal_first_name || profile.first_name || '')}" placeholder="Megan" /></label><label><span>Legal Last Name — private</span><input name="legal_last_name" autocomplete="family-name" required value="${escapeHtml(profile.legal_last_name || profile.last_name || '')}" placeholder="Johnson" /></label></div>
        <label><span>Priestess Display Name</span><input name="display_name" autocomplete="nickname" required value="${escapeHtml(profile.display_name || profile.priestess_name || '')}" placeholder="Megan Michele" /><small class="field-help">This is the name shown in your Suite, Team Map, Concierge Desk, mentor spaces, and Priestess profile.</small></label>
      </section>`}
    <label><span>Title</span><select name="title_value">${renderTitleOptions(titleValue)}</select></label>
    <label><span>Bio Template</span><select name="bio_template">${renderBioOptions(titleValue,bioValue)}</select></label>
    <div class="selected-bio-preview" data-selected-bio-preview></div>
    <fieldset class="offering-fieldset"><legend>Offerings</legend><div class="selection-chip-grid">${renderOfferingOptions(offeringValues)}</div></fieldset>
    <div class="form-grid"><label><span>Location — optional</span><input name="location" value="${escapeHtml(profile.location || '')}" placeholder="Pacific Grove, CA / Online" /></label><label><span>Your Timezone</span><select name="timezone">${renderTimezoneOptions(timezone)}</select></label></div>
    <label class="checkbox-row checkbox-row--simple"><input type="checkbox" name="display_location" ${displayLocation(profile) ? 'checked' : ''} /><span>Display my location on my Priestess Profile.</span></label>
    <label><span>External Website URL — optional</span><input name="website_url" type="text" inputmode="url" autocapitalize="off" autocomplete="url" value="${escapeHtml(profile.website_url || '')}" placeholder="yourpriestessprofile.com" /><small class="field-help">Paste your existing Priestess profile link. Flowtel will add https:// when needed.</small></label>
    ${isViewingAnotherMember(currentProfile) ? '' : profilePhotoUploaderMarkup(profile)}
    ${profileReviewNotes(profile)}
    ${isViewingAnotherMember(currentProfile) ? '' : '<div class="assignment-actions profile-actions"><button type="button" data-profile-action="preview">Refresh Preview</button><button type="button" data-profile-action="draft">Save Profile Draft</button><button type="button" data-profile-action="submit">Send Profile to be Witnessed</button></div>'}
  </form>`;
  bindProfileForm();
  refreshSelectedBioPreview();
}
function bindProfileForm(){
  const form=document.getElementById('priestessProfileForm');
  if(!form) return;
  const titleSelect=form.querySelector('[name="title_value"]');
  const bioSelect=form.querySelector('[name="bio_template"]');
  titleSelect?.addEventListener('change',()=>{
    const options=bioTemplatesForTitle(titleSelect.value);
    bioSelect.innerHTML=options.map(item=>`<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
    refreshSelectedBioPreview();
    refreshPreviewFromForm(form,{ markDirty:true });
  });
  bioSelect?.addEventListener('change',()=>{ refreshSelectedBioPreview(); refreshPreviewFromForm(form,{ markDirty:true }); });
  form.querySelectorAll('input:not([type="file"]), select').forEach(input=>input.addEventListener('input',()=>refreshPreviewFromForm(form,{ markDirty:true })));
  form.querySelectorAll('input[type="checkbox"], select').forEach(input=>input.addEventListener('change',()=>refreshPreviewFromForm(form,{ markDirty:true })));
  form.querySelectorAll('[data-profile-action]').forEach(button=>button.addEventListener('click',()=>handleProfileAction(form,button.dataset.profileAction)));
  bindProfilePhotoUploader();
}
async function handleProfileAction(form,action){
  if(action==='preview'){
    refreshPreviewFromForm(form,{ markDirty:false });
    setPageMessage('Profile preview refreshed.');
    return;
  }
  if(!api?.savePriestessProfileDraft || !api?.submitPriestessProfile){
    setPageMessage('The form is open, but the save connection is still loading. Refresh once, then try again.');
    return;
  }
  if(!canTendOwnProfile(currentProfile)){
    setPageMessage('Sign in through Flowtel before saving or submitting your Priestess Profile.');
    return;
  }
  const legalFirstInput=form.querySelector('[name="legal_first_name"]');
  const legalLastInput=form.querySelector('[name="legal_last_name"]');
  const displayNameInput=form.querySelector('[name="display_name"]');
  if(!String(legalFirstInput?.value || '').trim()){
    legalFirstInput?.focus();
    setPageMessage('Add your legal first name. It stays private inside your account.');
    return;
  }
  if(!String(legalLastInput?.value || '').trim()){
    legalLastInput?.focus();
    setPageMessage('Add your legal last name. It stays private inside your account.');
    return;
  }
  if(!String(displayNameInput?.value || '').trim()){
    displayNameInput?.focus();
    setPageMessage('Add the Priestess Display Name you want to use throughout the Flowtel.');
    return;
  }
  const websiteInput=form.querySelector('[name="website_url"]');
  const rawWebsite=String(websiteInput?.value || '').trim();
  const normalizedWebsite=api?.normalizeExternalProfileUrl
    ? api.normalizeExternalProfileUrl(rawWebsite)
    : normalizeExternalUrl(rawWebsite);
  if(rawWebsite && !normalizedWebsite){
    websiteInput?.focus();
    setPageMessage('Add a valid website or Priestess profile URL.');
    return;
  }
  if(websiteInput) websiteInput.value=normalizedWebsite;
  const payload=profilePayloadFromForm(form);
  try{
    setPageMessage(action==='submit' ? 'Saving your Flowtel identity, profile link, and Priestess Profile for witnessing...' : 'Saving your Flowtel identity and Priestess Profile...');
    if(action==='submit') await api.submitPriestessProfile(payload);
    else await api.savePriestessProfileDraft(payload);
    profileDirtyDisplayStatus='';
    const savedProfile=await loadSavedProfile();
    const savedWebsite=normalizeExternalUrl(savedProfile?.website_url || currentPriestessProfile?.website_url || '');
    if(normalizedWebsite && savedWebsite!==normalizedWebsite){
      throw new Error('Your profile saved, but Flowtel could not confirm the external profile link. Run migration 036, then save once more.');
    }
    setPageMessage(action==='submit'
      ? 'Priestess Profile sent to be witnessed. Your legal name is private and your Flowtel display name is now live.'
      : normalizedWebsite
        ? 'Priestess Profile, Flowtel display name, and external profile link saved.'
        : 'Priestess Profile and Flowtel display name saved.');
  }catch(error){
    console.error(error);
    setPageMessage(error.message || 'This Priestess Profile could not be tended yet.');
  }
}
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
  if(returned.some(file=>!file.downloaded_at)) return 'Your edited audio is ready';
  if(returned.length && returned.every(file=>file.downloaded_at)) return 'Returned and received';
  if(originals.some(file=>file.received_at)) return 'Received by Megan';
  return 'Traveling to Megan';
}
function mailboxFileMarkup(file){
  const isReturn=file.direction==='to_practitioner';
  const state=isReturn
    ? (file.downloaded_at?'Downloaded':'Ready for you')
    : (file.received_at?'Received by Megan':'Sent to Megan');
  return `<article class="mailbox-file ${isReturn?'is-return':'is-original'}">
    <div><p class="mailbox-file-direction">${isReturn?'RETURNED TO YOU':'SENT TO MEGAN'}</p><h4>${escapeHtml(file.original_filename || 'Audio file')}</h4><p>${escapeHtml(fileSizeLabel(file.size_bytes))} · ${escapeHtml(mailboxDateLabel(file.uploaded_at))}</p>${file.file_note?`<p class="mailbox-file-note">${escapeHtml(file.file_note)}</p>`:''}</div>
    <div class="mailbox-file-action"><span>${escapeHtml(state)}</span>${isReturn?`<button type="button" data-mailbox-download="${escapeHtml(file.file_id)}" data-mailbox-path="${escapeHtml(file.storage_path)}">${file.downloaded_at?'Download Again':'Download Returned Audio'}</button>`:''}</div>
  </article>`;
}
function renderPriestessMailbox(){
  if(!priestessMailboxSection || !currentProfile?.id || isViewingAnotherMember(currentProfile)) return;
  const threads=groupMailboxThreads(mailboxRows);
  priestessMailboxSection.classList.remove('hidden');
  priestessMailboxSection.innerHTML=`
    <header class="priestess-mailbox-heading"><div><p class="eyebrow">PRIESTESS MAILBOX</p><h2>Send your audio through the Flowtel.</h2><p>Leave a recording for Megan to download and tend. When the edited version is ready—with music, polish, or production—it will return to this same private thread.</p></div><span class="mailbox-seal" aria-hidden="true">✉</span></header>
    <div class="priestess-mailbox-layout">
      <form class="priestess-mailbox-form" id="priestessMailboxForm">
        <label><span>Audio title</span><input name="subject" maxlength="120" placeholder="Womb Wealth meditation" /></label>
        <label><span>Note for Megan — optional</span><textarea name="message" rows="4" maxlength="1000" placeholder="What would you like her to know before editing?"></textarea></label>
        <label class="mailbox-file-picker"><span>Choose your audio</span><input name="audio_file" type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*" required /><small>MP3, WAV, M4A, AAC, or OGG · up to 250 MB</small></label>
        <button type="submit">SEND AUDIO TO MEGAN</button>
        <p class="mailbox-form-status" id="priestessMailboxStatus" role="status"></p>
      </form>
      <section class="priestess-mailbox-history"><div class="mailbox-history-heading"><p class="eyebrow">YOUR PRIVATE THREADS</p><span>${threads.length}</span></div>${threads.length?threads.map(thread=>`<article class="mailbox-thread"><header><div><h3>${escapeHtml(thread.subject || 'Audio for Megan')}</h3><p>${escapeHtml(mailboxThreadStatus(thread))} · ${escapeHtml(mailboxDateLabel(thread.thread_created_at))}</p></div><span>${escapeHtml(thread.thread_status?.replaceAll('_',' ') || '')}</span></header>${thread.thread_message?`<p class="mailbox-thread-message">${escapeHtml(thread.thread_message)}</p>`:''}<div class="mailbox-file-list">${thread.files.map(mailboxFileMarkup).join('')}</div></article>`).join(''):'<div class="mailbox-empty"><p>Your first audio handoff will appear here.</p></div>'}</section>
    </div>`;
  bindPriestessMailbox();
}
async function downloadReturnedAudio(button){
  const popup=window.open('about:blank','_blank');
  button.disabled=true;
  const original=button.textContent;
  button.textContent='Preparing...';
  try{
    const url=await mailboxApi.createMailboxDownloadUrl(button.dataset.mailboxPath);
    if(popup){
      popup.opener=null;
      popup.location.href=url;
    }else{
      const link=document.createElement('a');
      link.href=url;
      link.target='_blank';
      link.rel='noopener';
      link.download='';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    await mailboxApi.markReturnedAudioDownloaded(button.dataset.mailboxDownload);
    await loadPriestessMailbox();
    setPageMessage('Your returned audio has been received from the Priestess Mailbox.');
  }catch(error){
    popup?.close();
    console.error(error);
    button.disabled=false;
    button.textContent=original;
    setPageMessage(error?.message || 'This private audio download could not be prepared yet.');
  }
}
function bindPriestessMailbox(){
  const form=document.getElementById('priestessMailboxForm');
  const status=document.getElementById('priestessMailboxStatus');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const file=form.elements.audio_file?.files?.[0];
    button.disabled=true;
    status.textContent='Sending your audio through the Flowtel…';
    try{
      await mailboxApi.sendAudioToConcierge(file,{
        subject:form.elements.subject?.value || '',
        message:form.elements.message?.value || '',
      });
      form.reset();
      status.textContent='Your audio is waiting safely in Megan’s Priestess Mailbox.';
      await loadPriestessMailbox();
    }catch(error){
      console.error(error);
      button.disabled=false;
      status.textContent=error?.message || 'This audio could not be sent yet.';
    }
  });
  priestessMailboxSection.querySelectorAll('[data-mailbox-download]').forEach(button=>button.addEventListener('click',()=>downloadReturnedAudio(button)));
}
async function loadPriestessMailbox(){
  if(!mailboxApi || !currentProfile?.id || isViewingAnotherMember(currentProfile)) return;
  try{
    mailboxRows=await mailboxApi.listMyPriestessMailbox();
    renderPriestessMailbox();
  }catch(error){
    console.warn('Priestess Mailbox could not load.',error);
    priestessMailboxSection?.classList.remove('hidden');
    if(priestessMailboxSection) priestessMailboxSection.innerHTML='<div class="mailbox-empty"><p>The Priestess Mailbox will open after migration 046 is installed.</p></div>';
  }
}

function renderStaticNav(){
  if(!topNav) return;
  topNav.innerHTML=`<a class="nav-pill" href="/flow-fm/">Initiation Hall</a><a class="nav-pill active" href="/flow-fm/profile-studio/">Profile Studio</a><a class="nav-pill" href="/client/?suite=1">Return to Suite</a>`;
}
async function loadSavedProfile(){
  if(!api?.getPriestessProfile) return;
  try{
    const profile=await api.getPriestessProfile(requestedMemberId());
    profileDirtyDisplayStatus='';
    currentPriestessProfile={
      ...currentPriestessProfile,
      ...(profile || {}),
      display_name: isViewingAnotherMember(currentProfile)
        ? (profile?.priestess_name || profile?.member_name || '')
        : (currentProfile?.display_name || profile?.priestess_name || currentPriestessProfile?.display_name || ''),
      priestess_name: isViewingAnotherMember(currentProfile)
        ? (profile?.priestess_name || profile?.member_name || '')
        : (currentProfile?.display_name || profile?.priestess_name || currentPriestessProfile?.priestess_name || ''),
      legal_first_name: isViewingAnotherMember(currentProfile) ? '' : (currentProfile?.first_name || currentPriestessProfile?.legal_first_name || ''),
      legal_last_name: isViewingAnotherMember(currentProfile) ? '' : (currentProfile?.last_name || currentPriestessProfile?.legal_last_name || ''),
      first_name: isViewingAnotherMember(currentProfile) ? '' : (currentProfile?.first_name || ''),
      last_name: isViewingAnotherMember(currentProfile) ? '' : (currentProfile?.last_name || ''),
      display_status:''
    };
    renderProfileStudio(currentPriestessProfile);
    return currentPriestessProfile;
  }catch(error){
    console.warn('Saved profile could not be loaded; keeping local form visible.', error);
    setPageMessage('The Studio opened, but saved profile data could not be loaded yet. You can still begin choosing your doorway.');
    return null;
  }
}
async function hydrateFromSupabase(){
  try{
    api=await import('/shared/flowtel.js?v=0.10.56');
    mailboxApi=await import('/shared/priestess-mailbox.js?v=0.10.56');
    currentProfile=await api.getCurrentProfile();
    if(!canUseProfileStudio(currentProfile)){
      replacePageWithPhaseTwoGate({
        featureName:'Profile Studio',
        title:'Reserved for Flow FM',
        copy:'The Profile Studio is available to Flow FM and Council members tending a Priestess profile. Return to the guest flow for the Suite, Lounge, and personal Flow Map.',
      });
      return;
    }
    if(accessState) accessState.innerHTML='';
    await loadSavedProfile();
    await loadPriestessMailbox();
  }catch(error){
    console.warn('Profile Studio save connection could not initialize.', error);
    setPageMessage('The Studio form is open. The save connection could not initialize yet, so preview is available while we keep the doorway visible.');
  }
}
function init(){
  renderStaticNav();
  renderProfileStudio(currentPriestessProfile);
  startTimezoneClock();
  hydrateFromSupabase();
}
window.addEventListener('beforeunload',()=>window.clearInterval(profileClockTimer));
init();
