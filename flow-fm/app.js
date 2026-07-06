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
} from "../shared/flowtel.js";

const heroCopy=document.getElementById("heroCopy");
const currentMoonTitle=document.getElementById("currentMoonTitle");
const currentMoonMeta=document.getElementById("currentMoonMeta");
const currentAssignmentTitle=document.getElementById("currentAssignmentTitle");
const currentAssignmentCopy=document.getElementById("currentAssignmentCopy");
const progressTitle=document.getElementById("progressTitle");
const progressCopy=document.getElementById("progressCopy");
const progressPills=document.getElementById("progressPills");
const reviewQueueCard=document.getElementById("reviewQueueCard");
const reviewQueue=document.getElementById("reviewQueue");
const arcCards=document.getElementById("arcCards");
const moonPath=document.getElementById("moonPath");
const assignmentList=document.getElementById("assignmentList");
const message=document.getElementById("message");

let currentProfile=null;
let currentRecords=[];
let currentReviewRows=[];

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
      heroCopy.textContent="Viewing a connected member’s Flow FM assignment path through the mentor consent layer.";
    }
    await refreshAssignments();
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
      ? "The v0.10.0 assignment migration must be applied in Supabase before tracking can save."
      : "The Initiation Hall is open in preview mode.");
  }
}
init();
