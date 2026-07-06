import {
  getCurrentProfile,
  FLOW_FM_MOONS,
  FLOW_FM_ASSIGNMENTS,
  FLOW_FM_ARCS,
  getFlowFmInitiationStatus,
  getFlowFmAssignmentForMoon,
  getFlowFmArcForMoon,
  listFlowFmAssignmentStatuses,
  saveFlowFmAssignmentDraft,
  submitFlowFmAssignment,
  listFlowFmAssignmentReviewQueue,
  reviewFlowFmAssignment,
  mergeAssignmentRecords,
  assignmentProgress,
  labelForAssignmentStatus,
  toneForAssignmentStatus,
  assignmentStatusCopy,
  getPriestessProfile,
  savePriestessProfileDraft,
  submitPriestessProfile,
  listPriestessProfileReviewQueue,
  reviewPriestessProfile,
  labelForPriestessProfileStatus,
  toneForPriestessProfileStatus,
  priestessProfileStatusCopy,
} from "../shared/flowtel.js";

const heroCopy=document.getElementById("heroCopy");
const currentMoonTitle=document.getElementById("currentMoonTitle");
const currentMoonMeta=document.getElementById("currentMoonMeta");
const currentAssignmentTitle=document.getElementById("currentAssignmentTitle");
const currentAssignmentCopy=document.getElementById("currentAssignmentCopy");
const progressTitle=document.getElementById("progressTitle");
const progressCopy=document.getElementById("progressCopy");
const progressPills=document.getElementById("progressPills");
const profileStudioIntro=document.getElementById("profileStudioIntro");
const profileStudioForm=document.getElementById("profileStudioForm");
const profileStudioPreview=document.getElementById("profileStudioPreview");
const profileReviewQueueCard=document.getElementById("profileReviewQueueCard");
const profileReviewQueue=document.getElementById("profileReviewQueue");
const reviewQueueCard=document.getElementById("reviewQueueCard");
const reviewQueue=document.getElementById("reviewQueue");
const arcCards=document.getElementById("arcCards");
const moonPath=document.getElementById("moonPath");
const assignmentList=document.getElementById("assignmentList");
const message=document.getElementById("message");

let currentProfile=null;
let currentRecords=[];
let currentReviewRows=[];
let currentPriestessProfile=null;
let currentProfileReviewRows=[];

function params(){ return new URLSearchParams(window.location.search); }
function requestedMemberId(){ return params().get("member") || params().get("client") || null; }
function isMentorRole(profile){ return ["practitioner","admin","owner"].includes(profile?.role); }
function isAdminRole(profile){ return ["admin","owner"].includes(profile?.role); }
function isViewingAnotherMember(profile){ return !!requestedMemberId() && requestedMemberId() !== profile?.id; }
function normalizeMembership(value){ return String(value || "").toLowerCase().replace(/[^a-z]/g, ""); }
function canTendOwnAssignments(profile){
  const membership=normalizeMembership(profile?.membership_type);
  return !!profile && (
    isMentorRole(profile) ||
    ["flowfm","flowfmmember","council"].includes(membership) ||
    !!profile.flowfm_started_at ||
    !!profile.is_initiated
  );
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
}
function seasonClass(season){
  return String(season||"").toLowerCase().replace(/[^a-z0-9]+/g,"-");
}
function monthLine(moon){
  if(!moon) return "";
  return `${moon.month} · ${moon.name} · ${moon.wing}`;
}
function formatDate(value){
  if(!value) return "—";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return String(value).slice(0,10);
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(date);
}
function safeHref(value){
  const raw=String(value || "").trim();
  if(!raw) return "";
  try{
    const url=new URL(raw, window.location.origin);
    if(["http:","https:","mailto:"].includes(url.protocol)) return url.href;
  }catch(error){
    console.warn("Ignoring unsafe assignment URL.", error);
  }
  return "";
}
function setMessage(text=""){
  if(message) message.textContent=text;
}
function statusPill(status){
  return `<span class="status-pill tone-${escapeHtml(toneForAssignmentStatus(status))}">${escapeHtml(labelForAssignmentStatus(status))}</span>`;
}
function profileStatusPill(status){
  return `<span class="status-pill tone-${escapeHtml(toneForPriestessProfileStatus(status))}">${escapeHtml(labelForPriestessProfileStatus(status))}</span>`;
}
function boolAttr(value){
  return value ? "checked" : "";
}
function csvToPills(value){
  return String(value || "")
    .split(/[,\n]/)
    .map(item=>item.trim())
    .filter(Boolean)
    .slice(0,12)
    .map(item=>`<span>${escapeHtml(item)}</span>`)
    .join("");
}
function recordForIndex(records,index){
  return (records || []).find(row=>Number(row.assignment_index)===Number(index)) || null;
}
function renderCurrent(profile,records=[]){
  const status=getFlowFmInitiationStatus(profile || {});
  const moon=status.moon || FLOW_FM_MOONS[0];
  const assignment=getFlowFmAssignmentForMoon(moon.index) || FLOW_FM_ASSIGNMENTS[0];
  const arc=getFlowFmArcForMoon(moon.index);
  const record=recordForIndex(records, assignment.index);
  const recordStatus=record?.status || "not_started";
  currentMoonTitle.textContent = status.hasStartDate ? `${moon.name}` : "Moon 1 · Temple Moon";
  currentMoonMeta.textContent = status.hasStartDate
    ? `${status.monthLine} · ${moon.wing} · ${moon.season}`
    : "Your Flow FM start date is not set yet. Previewing the first room of initiation.";
  currentAssignmentTitle.textContent = `${assignment.index} · ${assignment.title}`;
  currentAssignmentCopy.textContent = `${assignment.description} ${arc ? `This belongs to the ${arc.label} arc.` : ""} ${assignmentStatusCopy(recordStatus)}`;
}
function renderProgress(records=[]){
  const progress=assignmentProgress(records);
  const next=progress.next;
  progressTitle.textContent=`${progress.complete} of ${progress.total} rooms tended`;
  progressCopy.textContent=next
    ? `Next room: Assignment ${next.index} · ${next.title}. ${assignmentStatusCopy(next.record.status)}`
    : "Your Flow Factory has been tended through all 13 assignments.";
  progressPills.innerHTML=[
    ["Complete",progress.complete],
    ["Submitted",progress.submitted],
    ["Drafting",progress.drafting],
    ["Revision",progress.needsRevision],
  ].map(([label,value])=>`<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`).join("");
}
function renderArcs(){
  arcCards.innerHTML=FLOW_FM_ARCS.map(arc=>{
    const moons=arc.moons.map(index=>FLOW_FM_MOONS.find(moon=>moon.index===index)).filter(Boolean);
    return `<article class="arc-card">
      <p class="eyebrow">${escapeHtml(arc.range)}</p>
      <h3>${escapeHtml(arc.label)}</h3>
      <p>${escapeHtml(arc.copy)}</p>
      <div class="arc-moons">${moons.map(moon=>`<span>${escapeHtml(moon.index)} · ${escapeHtml(moon.name)}</span>`).join("")}</div>
    </article>`;
  }).join("");
}
function renderMoonPath(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const activeIndex=status.moon?.index || 1;
  moonPath.innerHTML=FLOW_FM_MOONS.map(moon=>{
    const assignment=getFlowFmAssignmentForMoon(moon.index);
    const active=moon.index===activeIndex;
    return `<article class="moon-card ${active ? "active" : ""} moon-${seasonClass(moon.season)}">
      <div class="moon-number">${escapeHtml(moon.index)}</div>
      <div>
        <p class="eyebrow">${escapeHtml(monthLine(moon))}</p>
        <h3>${escapeHtml(moon.name)}</h3>
        <p>${escapeHtml(moon.theme)}</p>
        <p class="assignment-line">Assignment: ${escapeHtml(assignment?.title || "Integration")}</p>
      </div>
    </article>`;
  }).join("");
}
function assignmentLinks(record){
  const submission=safeHref(record?.submission_url);
  const attachment=safeHref(record?.attachment_url);
  const links=[];
  if(submission) links.push(`<a href="${escapeHtml(submission)}" target="_blank" rel="noreferrer">Open assignment link</a>`);
  if(attachment) links.push(`<a href="${escapeHtml(attachment)}" target="_blank" rel="noreferrer">Open file/media link</a>`);
  return links.length ? `<div class="assignment-links">${links.join("")}</div>` : "";
}
function witnessNotes(record){
  const mentor=String(record?.mentor_note || "").trim();
  const admin=String(record?.admin_note || "").trim();
  const reviewer=record?.reviewer_name ? ` · ${record.reviewer_name}` : "";
  if(!mentor && !admin) return "";
  return `<div class="witness-note">
    <p class="eyebrow">WITNESS NOTE${escapeHtml(reviewer)}</p>
    ${mentor ? `<p>${escapeHtml(mentor)}</p>` : ""}
    ${admin ? `<p class="admin-note">Admin note: ${escapeHtml(admin)}</p>` : ""}
  </div>`;
}
function profileReviewNotes(profile){
  const mentor=String(profile?.mentor_note || "").trim();
  const admin=String(profile?.admin_note || "").trim();
  const reviewer=profile?.reviewer_name ? ` · ${profile.reviewer_name}` : "";
  if(!mentor && !admin) return "";
  return `<div class="witness-note profile-note">
    <p class="eyebrow">PROFILE NOTE${escapeHtml(reviewer)}</p>
    ${mentor ? `<p>${escapeHtml(mentor)}</p>` : ""}
    ${admin ? `<p class="admin-note">Admin note: ${escapeHtml(admin)}</p>` : ""}
  </div>`;
}
function profileLinkRows(profile){
  const links=[
    ["Book a Session", safeHref(profile?.scheduling_url)],
    ["Website", safeHref(profile?.website_url)],
    ["Instagram", safeHref(profile?.instagram_url)],
    ["TikTok", safeHref(profile?.tiktok_url)],
    ["Podcast", safeHref(profile?.podcast_url)],
  ].filter(([,href])=>href);
  return links.length ? `<div class="profile-links">${links.map(([label,href])=>`<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join("")}</div>` : "";
}
function renderDisplayProfile(profile={}){
  const photo=safeHref(profile.profile_photo_url);
  const name=profile.priestess_name || profile.member_name || "Priestess Profile";
  const queendom=profile.queendom_name || "Queendom doorway coming soon";
  const modalities=csvToPills(profile.modalities);
  const sessions=csvToPills(profile.session_types);
  return `<article class="display-profile-card">
    <div class="display-profile-hero">
      <div class="profile-photo ${photo ? "has-photo" : ""}">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" />` : `<span>🌹</span>`}</div>
      <div>
        <p class="eyebrow">${escapeHtml(queendom)}</p>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(profile.location || profile.timezone || "Location + timezone to be added")}</p>
        ${profileStatusPill(profile.status)}
      </div>
    </div>
    ${profile.bio ? `<div class="profile-section"><p>${escapeHtml(profile.bio)}</p></div>` : `<div class="profile-section empty-note"><p>Your About Me will appear here as the public-facing profile preview.</p></div>`}
    ${profile.who_she_serves ? `<div class="profile-section"><p class="eyebrow">WHO SHE SERVES</p><p>${escapeHtml(profile.who_she_serves)}</p></div>` : ""}
    ${profile.offerings ? `<div class="profile-section"><p class="eyebrow">OFFERINGS</p><p>${escapeHtml(profile.offerings)}</p></div>` : ""}
    ${modalities ? `<div class="profile-section"><p class="eyebrow">MODALITIES</p><div class="profile-tags">${modalities}</div></div>` : ""}
    ${sessions ? `<div class="profile-section"><p class="eyebrow">SESSION TYPES</p><div class="profile-tags">${sessions}</div></div>` : ""}
    ${profile.framework_language ? `<div class="profile-section"><p class="eyebrow">FRAMEWORK LANGUAGE</p><p>${escapeHtml(profile.framework_language)}</p></div>` : ""}
    ${profileLinkRows(profile)}
    ${profileReviewNotes(profile)}
  </article>`;
}
function profilePayloadFromForm(form){
  const data=new FormData(form);
  return {
    priestessName:String(data.get("priestess_name") || ""),
    legalName:String(data.get("legal_name") || ""),
    profileEmail:String(data.get("profile_email") || ""),
    profilePhotoUrl:String(data.get("profile_photo_url") || ""),
    bio:String(data.get("bio") || ""),
    modalities:String(data.get("modalities") || ""),
    whoSheServes:String(data.get("who_she_serves") || ""),
    sessionTypes:String(data.get("session_types") || ""),
    schedulingUrl:String(data.get("scheduling_url") || ""),
    websiteUrl:String(data.get("website_url") || ""),
    instagramUrl:String(data.get("instagram_url") || ""),
    tiktokUrl:String(data.get("tiktok_url") || ""),
    podcastUrl:String(data.get("podcast_url") || ""),
    queendomName:String(data.get("queendom_name") || ""),
    offerings:String(data.get("offerings") || ""),
    location:String(data.get("location") || ""),
    timezone:String(data.get("timezone") || ""),
    frameworkLanguage:String(data.get("framework_language") || ""),
    networkOptIn:!!data.get("network_opt_in"),
    revenueShareOptIn:!!data.get("revenue_share_opt_in"),
  };
}
function renderProfileStudio(profile={}, { readOnly=false } = {}){
  const record=profile || {};
  if(profileStudioIntro){
    profileStudioIntro.textContent=readOnly
      ? "Viewing this Priestess Profile through the mentor consent layer."
      : "Draft the profile your future clients will meet first. Save the language, preview the public-facing card, and send it to be witnessed when it feels alive.";
  }
  if(profileStudioPreview){
    profileStudioPreview.innerHTML=renderDisplayProfile(record);
  }
  if(!profileStudioForm) return;
  if(readOnly){
    profileStudioForm.innerHTML=`<div class="profile-readonly-panel">
      <p class="eyebrow">DISPLAY PROFILE</p>
      <h3>${escapeHtml(record.priestess_name || record.member_name || "Priestess Profile")}</h3>
      <p>${escapeHtml(priestessProfileStatusCopy(record.status))}</p>
      ${profileReviewNotes(record)}
    </div>`;
    return;
  }
  profileStudioForm.innerHTML=`<form class="profile-form" id="priestessProfileForm">
    <div class="profile-form-heading">
      <div>
        <p class="eyebrow">PROFILE INTAKE</p>
        <h3>Your public-facing doorway</h3>
        <p>${escapeHtml(priestessProfileStatusCopy(record.status))}</p>
      </div>
      ${profileStatusPill(record.status)}
    </div>
    <div class="form-grid">
      <label><span>Priestess name</span><input name="priestess_name" value="${escapeHtml(record.priestess_name || "")}" placeholder="Megan Michele" /></label>
      <label><span>Legal/profile name if different</span><input name="legal_name" value="${escapeHtml(record.legal_name || "")}" placeholder="Optional" /></label>
    </div>
    <div class="form-grid">
      <label><span>Profile email</span><input name="profile_email" type="email" value="${escapeHtml(record.profile_email || currentProfile?.email || "")}" placeholder="hello@example.com" /></label>
      <label><span>Photo URL</span><input name="profile_photo_url" type="url" value="${escapeHtml(record.profile_photo_url || "")}" placeholder="https://..." /></label>
    </div>
    <label><span>About Me / Bio</span><textarea name="bio" rows="5" placeholder="Tell her who you are, what you hold, and what she can exhale into here.">${escapeHtml(record.bio || "")}</textarea></label>
    <label><span>Modalities</span><textarea name="modalities" rows="3" placeholder="Cycle tracking, womb work, breathwork, astrology, ceremony...">${escapeHtml(record.modalities || "")}</textarea></label>
    <label><span>Who she serves</span><textarea name="who_she_serves" rows="3" placeholder="Women who are ready to...">${escapeHtml(record.who_she_serves || "")}</textarea></label>
    <label><span>Session types</span><textarea name="session_types" rows="3" placeholder="1:1 mentorship, cycle mapping session, ceremony, voice note support...">${escapeHtml(record.session_types || "")}</textarea></label>
    <label><span>Offerings</span><textarea name="offerings" rows="4" placeholder="Name your current or upcoming offers. Pricing can stay private for now.">${escapeHtml(record.offerings || "")}</textarea></label>
    <div class="form-grid">
      <label><span>Queendom name</span><input name="queendom_name" value="${escapeHtml(record.queendom_name || "")}" placeholder="The Rose Queendom" /></label>
      <label><span>Location</span><input name="location" value="${escapeHtml(record.location || "")}" placeholder="Pacific Grove, CA / Online" /></label>
    </div>
    <div class="form-grid">
      <label><span>Timezone</span><input name="timezone" value="${escapeHtml(record.timezone || "")}" placeholder="America/Los_Angeles" /></label>
      <label><span>Scheduling link</span><input name="scheduling_url" type="url" value="${escapeHtml(record.scheduling_url || "")}" placeholder="https://..." /></label>
    </div>
    <div class="form-grid">
      <label><span>Website</span><input name="website_url" type="url" value="${escapeHtml(record.website_url || "")}" placeholder="https://..." /></label>
      <label><span>Instagram</span><input name="instagram_url" type="url" value="${escapeHtml(record.instagram_url || "")}" placeholder="https://..." /></label>
    </div>
    <div class="form-grid">
      <label><span>TikTok</span><input name="tiktok_url" type="url" value="${escapeHtml(record.tiktok_url || "")}" placeholder="https://..." /></label>
      <label><span>Podcast</span><input name="podcast_url" type="url" value="${escapeHtml(record.podcast_url || "")}" placeholder="https://..." /></label>
    </div>
    <label><span>Womb / magic / framework language</span><textarea name="framework_language" rows="4" placeholder="What words, lineages, frameworks, and edges should your profile honor?">${escapeHtml(record.framework_language || "")}</textarea></label>
    <div class="profile-consent-grid">
      <label class="checkbox-row"><input type="checkbox" name="network_opt_in" ${boolAttr(record.network_opt_in)} /><span>I am interested in the Flowtel practitioner network doorway.</span></label>
      <label class="checkbox-row"><input type="checkbox" name="revenue_share_opt_in" ${boolAttr(record.revenue_share_opt_in)} /><span>I understand future Queendom booking/revenue-share details will be confirmed later.</span></label>
    </div>
    ${profileReviewNotes(record)}
    <div class="assignment-actions profile-actions">
      <button type="button" data-profile-action="preview">Refresh Preview</button>
      <button type="button" data-profile-action="draft">Save Profile Draft</button>
      <button type="button" data-profile-action="submit">Send Profile to be Witnessed</button>
    </div>
  </form>`;
  bindProfileForm();
}
function bindProfileForm(){
  const form=document.getElementById("priestessProfileForm");
  if(!form) return;
  form.querySelectorAll("[data-profile-action]").forEach(button=>{
    button.addEventListener("click",()=>handleProfileAction(form,button.dataset.profileAction));
  });
}
async function handleProfileAction(form,action){
  const payload=profilePayloadFromForm(form);
  try{
    if(action === "preview"){
      currentPriestessProfile={...(currentPriestessProfile || {}), ...{
        priestess_name:payload.priestessName,
        legal_name:payload.legalName,
        profile_email:payload.profileEmail,
        profile_photo_url:payload.profilePhotoUrl,
        bio:payload.bio,
        modalities:payload.modalities,
        who_she_serves:payload.whoSheServes,
        session_types:payload.sessionTypes,
        scheduling_url:payload.schedulingUrl,
        website_url:payload.websiteUrl,
        instagram_url:payload.instagramUrl,
        tiktok_url:payload.tiktokUrl,
        podcast_url:payload.podcastUrl,
        queendom_name:payload.queendomName,
        offerings:payload.offerings,
        location:payload.location,
        timezone:payload.timezone,
        framework_language:payload.frameworkLanguage,
        network_opt_in:payload.networkOptIn,
        revenue_share_opt_in:payload.revenueShareOptIn,
      }};
      renderProfileStudio(currentPriestessProfile,{readOnly:false});
      setMessage("Profile preview refreshed.");
      return;
    }
    setMessage(action === "submit" ? "Sending your Priestess Profile to be witnessed..." : "Saving your Priestess Profile draft...");
    if(action === "submit") await submitPriestessProfile(payload);
    else await savePriestessProfileDraft(payload);
    await refreshPriestessProfile();
    setMessage(action === "submit" ? "Priestess Profile sent to be witnessed." : "Priestess Profile draft saved.");
  }catch(error){
    console.error(error);
    setMessage(error.message || "This Priestess Profile could not be tended yet.");
  }
}
function renderProfileReviewQueue(rows=[]){
  if(!isMentorRole(currentProfile)){
    profileReviewQueueCard?.classList.add("hidden");
    return;
  }
  profileReviewQueueCard?.classList.remove("hidden");
  if(!profileReviewQueue) return;
  if(!rows.length){
    profileReviewQueue.innerHTML=`<article class="review-row empty"><p>No Priestess Profiles are waiting in the queue.</p></article>`;
    return;
  }
  profileReviewQueue.innerHTML=rows.map(row=>`<article class="review-row" data-profile-review-id="${escapeHtml(row.id)}">
    <div class="review-heading">
      <div>
        <p class="eyebrow">${escapeHtml(row.member_name)} · PROFILE REVIEW</p>
        <h3>${escapeHtml(row.priestess_name || "Priestess Profile")}</h3>
        <p>${escapeHtml(row.bio || "No About Me has been included yet.")}</p>
        <div class="assignment-links"><a href="/flow-fm/?member=${encodeURIComponent(row.member_id)}#profile-studio">Open profile studio</a></div>
      </div>
      ${profileStatusPill(row.status)}
    </div>
    <div class="review-form">
      <label><span>Mentor note</span><textarea rows="3" data-profile-review-note placeholder="Leave the note she should receive after this profile is witnessed.">${escapeHtml(row.mentor_note || "")}</textarea></label>
      ${isAdminRole(currentProfile) ? `<label><span>Admin note</span><textarea rows="3" data-profile-admin-note placeholder="Internal Flowtel note.">${escapeHtml(row.admin_note || "")}</textarea></label>` : ""}
      <div class="assignment-actions review-actions">
        <button type="button" data-profile-review-status="approved">Approve Profile</button>
        <button type="button" data-profile-review-status="needs_revision">Request Refinement</button>
      </div>
    </div>
  </article>`).join("");
  bindProfileReviewButtons();
}
function bindProfileReviewButtons(){
  profileReviewQueue?.querySelectorAll("[data-profile-review-status]").forEach(button=>{
    button.addEventListener("click",()=>handleProfileReviewAction(button.closest("[data-profile-review-id]"),button.dataset.profileReviewStatus));
  });
}
async function handleProfileReviewAction(row,status){
  if(!row) return;
  const profileId=row.dataset.profileReviewId;
  const mentorNote=row.querySelector("[data-profile-review-note]")?.value || "";
  const adminNote=row.querySelector("[data-profile-admin-note]")?.value || "";
  try{
    setMessage("Tending this Priestess Profile...");
    await reviewPriestessProfile({profileId,status,mentorNote,adminNote});
    await refreshPriestessProfile();
    await refreshProfileReviewQueue();
    setMessage(status === "approved" ? "Priestess Profile approved." : "Profile refinement note sent.");
  }catch(error){
    console.error(error);
    setMessage(error.message || "This Priestess Profile could not be reviewed yet.");
  }
}
function profileStudioLink(index){
  return Number(index) === 1
    ? `<div class="assignment-links profile-assignment-link"><a href="#profile-studio">Open Priestess Profile Studio</a></div>`
    : "";
}
async function refreshPriestessProfile(){
  if(!currentProfile){
    currentPriestessProfile=null;
    renderProfileStudio({status:"draft"},{readOnly:true});
    return;
  }
  const memberId=requestedMemberId();
  currentPriestessProfile=await getPriestessProfile(memberId);
  const readOnly=isViewingAnotherMember(currentProfile) || !canTendOwnAssignments(currentProfile);
  renderProfileStudio(currentPriestessProfile,{readOnly});
}
async function refreshProfileReviewQueue(){
  if(!isMentorRole(currentProfile)){
    renderProfileReviewQueue([]);
    return;
  }
  currentProfileReviewRows=await listPriestessProfileReviewQueue();
  renderProfileReviewQueue(currentProfileReviewRows);
}
function renderAssignmentForm(item,record,{readOnly=false}={}){
  if(readOnly){
    return `<div class="assignment-readonly">
      ${record?.submission_text ? `<p>${escapeHtml(record.submission_text)}</p>` : `<p class="empty-note">No submission has been left in this room yet.</p>`}
      ${assignmentLinks(record)}
      ${witnessNotes(record)}
    </div>`;
  }

  if(record?.status === "complete"){
    return `<div class="assignment-complete-note">
      <p>${escapeHtml(assignmentStatusCopy(record.status))}</p>
      ${record?.submission_text ? `<p>${escapeHtml(record.submission_text)}</p>` : ""}
      ${assignmentLinks(record)}
      ${witnessNotes(record)}
    </div>`;
  }

  return `<form class="assignment-form" data-assignment-form="${escapeHtml(item.index)}">
    <label>
      <span>Reflection, evidence, or next note</span>
      <textarea name="submission_text" rows="4" placeholder="What did you create? What link, file, or practice is ready to be witnessed?">${escapeHtml(record?.submission_text || "")}</textarea>
    </label>
    <div class="form-grid">
      <label>
        <span>Assignment link</span>
        <input name="submission_url" type="url" inputmode="url" placeholder="https://..." value="${escapeHtml(record?.submission_url || "")}" />
      </label>
      <label>
        <span>File or media URL</span>
        <input name="attachment_url" type="url" inputmode="url" placeholder="https://..." value="${escapeHtml(record?.attachment_url || "")}" />
      </label>
    </div>
    ${witnessNotes(record)}
    <div class="assignment-actions">
      <button type="button" data-assignment-action="draft">Save Draft</button>
      <button type="button" data-assignment-action="submit">Send to be Witnessed</button>
    </div>
  </form>`;
}
function renderAssignments(profile,records=[]){
  const status=getFlowFmInitiationStatus(profile || {});
  const activeIndex=status.moon?.index || 1;
  const merged=mergeAssignmentRecords(records);
  const readOnly=!profile || isViewingAnotherMember(profile) || !canTendOwnAssignments(profile);
  assignmentList.innerHTML=merged.map(item=>{
    const record=item.record;
    return `<article class="assignment-row ${item.index===activeIndex ? "active" : ""}" data-assignment-index="${escapeHtml(item.index)}">
      <div class="assignment-number">${escapeHtml(item.index)}</div>
      <div class="assignment-body">
        <div class="assignment-row-heading">
          <div>
            <p class="assignment-type">${escapeHtml(item.type)}</p>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          ${statusPill(record.status)}
        </div>
        <p>${escapeHtml(item.description)}</p>
        <p class="assignment-status-copy">${escapeHtml(assignmentStatusCopy(record.status))}</p>
        ${renderAssignmentForm(item,record,{readOnly})}
        ${profileStudioLink(item.index)}
      </div>
    </article>`;
  }).join("");
  bindAssignmentForms();
}
function bindAssignmentForms(){
  assignmentList.querySelectorAll("[data-assignment-form]").forEach(form=>{
    form.querySelectorAll("[data-assignment-action]").forEach(button=>{
      button.addEventListener("click",()=>handleAssignmentAction(form,button.dataset.assignmentAction));
    });
  });
}
async function handleAssignmentAction(form,action){
  const assignmentIndex=Number(form.dataset.assignmentForm);
  const formData=new FormData(form);
  const payload={
    assignmentIndex,
    submissionText:String(formData.get("submission_text") || ""),
    submissionUrl:String(formData.get("submission_url") || ""),
    attachmentUrl:String(formData.get("attachment_url") || ""),
  };

  try{
    setMessage(action === "submit" ? "Sending this assignment to be witnessed..." : "Saving this assignment draft...");
    if(action === "submit") await submitFlowFmAssignment(payload);
    else await saveFlowFmAssignmentDraft(payload);
    await refreshAssignments();
    setMessage(action === "submit" ? "Assignment sent to be witnessed." : "Assignment draft saved.");
  }catch(error){
    console.error(error);
    setMessage(error.message || "This assignment could not be tended yet.");
  }
}
function reviewLink(row){
  const href=`/flow-fm/?member=${encodeURIComponent(row.member_id)}`;
  return `<a href="${href}">Open member assignment path</a>`;
}
function renderReviewQueue(rows=[]){
  if(!isMentorRole(currentProfile)){
    reviewQueueCard.classList.add("hidden");
    return;
  }
  reviewQueueCard.classList.remove("hidden");
  if(!rows.length){
    reviewQueue.innerHTML=`<article class="review-row empty"><p>No submitted assignments are waiting in the queue.</p></article>`;
    return;
  }
  reviewQueue.innerHTML=rows.map(row=>{
    const assignment=getFlowFmAssignmentForMoon(row.assignment_index);
    const submission=safeHref(row.submission_url);
    const attachment=safeHref(row.attachment_url);
    return `<article class="review-row" data-review-id="${escapeHtml(row.id)}">
      <div class="review-heading">
        <div>
          <p class="eyebrow">${escapeHtml(row.member_name)} · ASSIGNMENT ${escapeHtml(row.assignment_index)}</p>
          <h3>${escapeHtml(assignment?.title || "Flow FM Assignment")}</h3>
          <p>${escapeHtml(row.submission_text || "No written note was included.")}</p>
          <div class="assignment-links">
            ${submission ? `<a href="${escapeHtml(submission)}" target="_blank" rel="noreferrer">Open assignment link</a>` : ""}
            ${attachment ? `<a href="${escapeHtml(attachment)}" target="_blank" rel="noreferrer">Open file/media link</a>` : ""}
            ${reviewLink(row)}
          </div>
        </div>
        ${statusPill(row.status)}
      </div>
      <div class="review-form">
        <label>
          <span>Mentor note</span>
          <textarea rows="3" data-review-note placeholder="Leave the note she should receive after this is witnessed.">${escapeHtml(row.mentor_note || "")}</textarea>
        </label>
        ${isAdminRole(currentProfile) ? `<label><span>Admin note</span><textarea rows="3" data-admin-note placeholder="Internal Flowtel note.">${escapeHtml(row.admin_note || "")}</textarea></label>` : ""}
        <div class="assignment-actions review-actions">
          <button type="button" data-review-status="reviewed">Mark Reviewed</button>
          <button type="button" data-review-status="complete">Mark Complete</button>
          <button type="button" data-review-status="needs_revision">Request Revision</button>
        </div>
      </div>
    </article>`;
  }).join("");
  bindReviewButtons();
}
function bindReviewButtons(){
  reviewQueue.querySelectorAll("[data-review-status]").forEach(button=>{
    button.addEventListener("click",()=>handleReviewAction(button.closest("[data-review-id]"),button.dataset.reviewStatus));
  });
}
async function handleReviewAction(row,status){
  if(!row) return;
  const submissionId=row.dataset.reviewId;
  const mentorNote=row.querySelector("[data-review-note]")?.value || "";
  const adminNote=row.querySelector("[data-admin-note]")?.value || "";
  try{
    setMessage("Tending this assignment review...");
    await reviewFlowFmAssignment({submissionId,status,mentorNote,adminNote});
    await refreshAssignments();
    await refreshPriestessProfile();
    await refreshProfileReviewQueue();
    await refreshReviewQueue();
    setMessage("Assignment review saved.");
  }catch(error){
    console.error(error);
    setMessage(error.message || "This assignment could not be reviewed yet.");
  }
}
async function refreshAssignments(){
  if(!currentProfile){
    currentRecords=[];
    renderCurrent(null,[]);
    renderProgress([]);
    renderAssignments(null,[]);
    return;
  }
  const memberId=requestedMemberId();
  currentRecords=await listFlowFmAssignmentStatuses(memberId);
  renderCurrent(currentProfile,currentRecords);
  renderProgress(currentRecords);
  renderAssignments(currentProfile,currentRecords);
}
async function refreshReviewQueue(){
  if(!isMentorRole(currentProfile)){
    renderReviewQueue([]);
    return;
  }
  currentReviewRows=await listFlowFmAssignmentReviewQueue();
  renderReviewQueue(currentReviewRows);
}
function renderPreview(){
  renderCurrent(null,[]);
  renderProgress([]);
  renderArcs();
  renderMoonPath(null);
  renderAssignments(null,[]);
  renderProfileStudio({status:"draft"},{readOnly:true});
  renderProfileReviewQueue([]);
  renderReviewQueue([]);
}
async function init(){
  renderPreview();
  try{
    currentProfile=await getCurrentProfile();
    renderArcs();
    renderMoonPath(currentProfile);
    if(!currentProfile){
      heroCopy.textContent="Preview the Flow FM Initiation Hall. Sign in through the Flowtel doorway to save and submit assignments.";
      setMessage("Sign in through the Flowtel doorway to personalize your Initiation Hall.");
      return;
    }
    if(isViewingAnotherMember(currentProfile)){
      heroCopy.textContent="Viewing a connected member’s Flow FM assignment path and Priestess Profile through the mentor consent layer.";
    }
    await refreshAssignments();
    await refreshPriestessProfile();
    await refreshProfileReviewQueue();
    await refreshReviewQueue();
    if(!canTendOwnAssignments(currentProfile)){
      setMessage("Flow FM assignment tracking opens for Flow FM members.");
    }else{
      setMessage("");
    }
  }catch(error){
    console.error(error);
    renderPreview();
    setMessage(error.message?.includes("function") || error.message?.includes("schema")
      ? "The v0.10.1 Priestess Profile migration must be applied in Supabase before the Studio can save."
      : "The Initiation Hall is open in preview mode.");
  }
}
init();
