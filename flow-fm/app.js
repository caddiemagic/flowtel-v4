import { getCurrentProfile } from "../shared/profiles.js";
import { FLOW_FM_MOONS, FLOW_FM_ASSIGNMENTS, FLOW_FM_ARCS, getFlowFmInitiationStatus, getFlowFmAssignmentForMoon, getFlowFmArcForMoon } from "../shared/flowtel.js";

const currentMoonTitle=document.getElementById("currentMoonTitle");
const currentMoonMeta=document.getElementById("currentMoonMeta");
const currentAssignmentTitle=document.getElementById("currentAssignmentTitle");
const currentAssignmentCopy=document.getElementById("currentAssignmentCopy");
const arcCards=document.getElementById("arcCards");
const moonPath=document.getElementById("moonPath");
const assignmentList=document.getElementById("assignmentList");
const message=document.getElementById("message");

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
function renderCurrent(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const moon=status.moon || FLOW_FM_MOONS[0];
  const assignment=getFlowFmAssignmentForMoon(moon.index) || FLOW_FM_ASSIGNMENTS[0];
  const arc=getFlowFmArcForMoon(moon.index);
  currentMoonTitle.textContent = status.hasStartDate ? `${moon.name}` : "Moon 1 · Temple Moon";
  currentMoonMeta.textContent = status.hasStartDate
    ? `${status.monthLine} · ${moon.wing} · ${moon.season}`
    : "Your Flow FM start date is not set yet. Previewing the first room of initiation.";
  currentAssignmentTitle.textContent = `${assignment.index} · ${assignment.title}`;
  currentAssignmentCopy.textContent = `${assignment.description} ${arc ? `This belongs to the ${arc.label} arc.` : ""}`;
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
function renderAssignments(profile){
  const status=getFlowFmInitiationStatus(profile || {});
  const activeIndex=status.moon?.index || 1;
  assignmentList.innerHTML=FLOW_FM_ASSIGNMENTS.map(item=>`<article class="assignment-row ${item.index===activeIndex ? "active" : ""}">
    <span>${escapeHtml(item.index)}</span>
    <div>
      <p class="assignment-type">${escapeHtml(item.type)}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </div>
    <button type="button" disabled>${item.index===1 ? "Profile form coming next" : "Tracking coming next"}</button>
  </article>`).join("");
}
async function init(){
  try{
    const profile=await getCurrentProfile();
    renderCurrent(profile);
    renderArcs();
    renderMoonPath(profile);
    renderAssignments(profile);
    if(!profile){
      message.textContent="Sign in through the Flowtel doorway to personalize your Initiation Hall.";
    }
  }catch(error){
    console.error(error);
    renderCurrent(null);
    renderArcs();
    renderMoonPath(null);
    renderAssignments(null);
    message.textContent="The Initiation Hall is open in preview mode.";
  }
}
init();
