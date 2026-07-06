// Flowtel v0.10.10 — Profile Studio robust renderer.
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

let currentProfile = null;
let currentPriestessProfile = { status: 'draft', timezone: 'America/Los_Angeles' };
let api = null;

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function safeHref(value){
  const raw = String(value || '').trim();
  if(!raw) return '';
  try{
    const url = new URL(raw, window.location.origin);
    if(['http:','https:','mailto:'].includes(url.protocol)) return url.href;
  }catch(error){ console.warn('Ignoring unsafe URL', error); }
  return '';
}
function setPageMessage(text=''){
  if(message) message.textContent = text;
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
function canTendOwnProfile(profile){ return !!profile?.id; }
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
  const label = {draft:'Draft',submitted:'Submitted',approved:'Approved',needs_revision:'Needs revision'}[String(status || 'draft')] || 'Draft';
  const tone = {draft:'draft',submitted:'submitted',approved:'complete',needs_revision:'revision'}[String(status || 'draft')] || 'draft';
  return `<span class="status-pill tone-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}
function statusCopy(status='draft'){
  return {
    draft:'Your profile draft is still in your hands. Save as often as you need.',
    submitted:'Your Priestess Profile has been sent to be witnessed.',
    approved:'Your Priestess Profile has been approved for the next doorway.',
    needs_revision:'A refinement has been requested. Tend the note, soften the language, and send the next version when ready.',
  }[String(status || 'draft')] || 'Your profile draft is still in your hands. Save as often as you need.';
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
    priestessName:String(data.get('priestess_name') || '').trim(),
    legalName:String(data.get('legal_name') || '').trim(),
    websiteUrl:String(data.get('website_url') || '').trim(),
    location,
    displayLocation:displayLocationValue,
    timezone:String(data.get('timezone') || 'America/Los_Angeles'),
  };
}
function payloadFromValues(values){
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
  const name=profile.priestess_name || profile.member_name || 'Priestess Profile';
  const title=labelForPriestessTitle(profile.priestess_title || profile.modalities || 'rose-priestess');
  const locationLine=String(profile.location || '').trim();
  const timezoneLine=String(profile.timezone || '').trim();
  const website=safeHref(profile.website_url);
  const offerings=offeringLabelsFromValues(profile.offering_template_keys || profile.offerings).map(item=>`<span>${escapeHtml(item)}</span>`).join('');
  return `<article class="display-profile-card display-profile-card--simple">
    <div class="display-profile-hero"><div class="profile-photo">🌹</div><div><p class="eyebrow">${escapeHtml(title)}</p><h3>${escapeHtml(name)}</h3>${locationLine ? `<p>${escapeHtml(locationLine)}</p>` : ''}${timezoneLine ? `<p class="timezone-line">${escapeHtml(timezoneLine)}</p>` : ''}${renderProfileStatusPill(profile.status)}</div></div>
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
    priestess_name: record.priestess_name || '',
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
function refreshPreviewFromForm(form){
  const payload=profilePayloadFromForm(form);
  currentPriestessProfile={...(currentPriestessProfile || {}),priestess_name:payload.priestessName,legal_name:payload.legalName,bio:payload.bio,modalities:payload.modalities,website_url:payload.websiteUrl,offerings:payload.offerings,location:payload.location,timezone:payload.timezone};
  profileStudioPreview.innerHTML=renderDisplayProfile(currentPriestessProfile);
}
function renderProfileStudio(record=currentPriestessProfile){
  const profile=record || { status:'draft', timezone:'America/Los_Angeles' };
  const titleValue=selectedTitleValue(profile);
  const bioValue=selectedBioValue(profile);
  const offeringValues=selectedOfferingValues(profile);
  const timezone=profile.timezone || 'America/Los_Angeles';
  profileStudioIntro.textContent='Choose a prepared title, bio, and offering doorway. This profile can be refined later.';
  profileStudioPreview.innerHTML=renderDisplayProfile(renderProfileFromRecord(profile));
  profileStudioForm.innerHTML=`<form class="profile-form profile-form--simple" id="priestessProfileForm">
    <div class="profile-form-heading"><div><p class="eyebrow">YOUR FIRST DOORWAY</p><h3>Pick what is true enough for now.</h3><p>${escapeHtml(statusCopy(profile.status))}</p></div>${renderProfileStatusPill(profile.status)}</div>
    <div class="form-grid"><label><span>Profile Name</span><input name="priestess_name" value="${escapeHtml(profile.priestess_name || '')}" placeholder="First name or priestess name" /></label><label><span>Legal Name — private</span><input name="legal_name" value="${escapeHtml(profile.legal_name || '')}" placeholder="For future network documents" /></label></div>
    <label><span>Title</span><select name="title_value">${renderTitleOptions(titleValue)}</select></label>
    <label><span>Bio Template</span><select name="bio_template">${renderBioOptions(titleValue,bioValue)}</select></label>
    <div class="selected-bio-preview" data-selected-bio-preview></div>
    <fieldset class="offering-fieldset"><legend>Offerings</legend><div class="selection-chip-grid">${renderOfferingOptions(offeringValues)}</div></fieldset>
    <div class="form-grid"><label><span>Location — optional</span><input name="location" value="${escapeHtml(profile.location || '')}" placeholder="Pacific Grove, CA / Online" /></label><label><span>Your Timezone</span><select name="timezone">${renderTimezoneOptions(timezone)}</select></label></div>
    <label class="checkbox-row checkbox-row--simple"><input type="checkbox" name="display_location" ${displayLocation(profile) ? 'checked' : ''} /><span>Display my location on my Priestess Profile.</span></label>
    <label><span>External Website URL — optional</span><input name="website_url" type="url" value="${escapeHtml(profile.website_url || '')}" placeholder="https://..." /></label>
    <div class="photo-upload-note"><p class="eyebrow">PROFILE PHOTO</p><p>Photo upload can stay inside the Squarespace form/content storage for now. Flowtel will hold this place for the public profile preview.</p></div>
    ${profileReviewNotes(profile)}
    <div class="assignment-actions profile-actions"><button type="button" data-profile-action="preview">Refresh Preview</button><button type="button" data-profile-action="draft">Save Profile Draft</button><button type="button" data-profile-action="submit">Send Profile to be Witnessed</button></div>
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
    refreshPreviewFromForm(form);
  });
  bioSelect?.addEventListener('change',()=>{ refreshSelectedBioPreview(); refreshPreviewFromForm(form); });
  form.querySelectorAll('input, select').forEach(input=>input.addEventListener('input',()=>refreshPreviewFromForm(form)));
  form.querySelectorAll('[data-profile-action]').forEach(button=>button.addEventListener('click',()=>handleProfileAction(form,button.dataset.profileAction)));
}
async function handleProfileAction(form,action){
  if(action==='preview'){
    refreshPreviewFromForm(form);
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
  const payload=profilePayloadFromForm(form);
  try{
    setPageMessage(action==='submit' ? 'Sending your Priestess Profile to be witnessed...' : 'Saving your Priestess Profile draft...');
    if(action==='submit') await api.submitPriestessProfile(payload);
    else await api.savePriestessProfileDraft(payload);
    await loadSavedProfile();
    setPageMessage(action==='submit' ? 'Priestess Profile sent to be witnessed.' : 'Priestess Profile draft saved.');
  }catch(error){
    console.error(error);
    setPageMessage(error.message || 'This Priestess Profile could not be tended yet.');
  }
}
function renderStaticNav(){
  if(!topNav) return;
  topNav.innerHTML=`<a class="nav-pill" href="/flow-fm/">Initiation Hall</a><a class="nav-pill" href="/flow-fm/planning-room/">Planning Room</a><a class="nav-pill active" href="/flow-fm/profile-studio/">Profile Studio</a><a class="nav-pill" href="/client/?suite=1">Return to Suite</a>`;
}
async function loadSavedProfile(){
  if(!api?.getPriestessProfile) return;
  try{
    const profile=await api.getPriestessProfile(requestedMemberId());
    currentPriestessProfile={...currentPriestessProfile,...(profile || {})};
    renderProfileStudio(currentPriestessProfile);
  }catch(error){
    console.warn('Saved profile could not be loaded; keeping local form visible.', error);
    setPageMessage('The Studio opened, but saved profile data could not be loaded yet. You can still begin choosing your doorway.');
  }
}
async function hydrateFromSupabase(){
  try{
    api=await import('/shared/flowtel.js?v=0.10.10');
    currentProfile=await api.getCurrentProfile();
    if(accessState) accessState.innerHTML='';
    await loadSavedProfile();
  }catch(error){
    console.warn('Profile Studio save connection could not initialize.', error);
    setPageMessage('The Studio form is open. The save connection could not initialize yet, so preview is available while we keep the doorway visible.');
  }
}
function init(){
  renderStaticNav();
  renderProfileStudio(currentPriestessProfile);
  hydrateFromSupabase();
}
init();
