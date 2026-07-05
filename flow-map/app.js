import { getCurrentProfile } from "../shared/profiles.js";
import { listMyClients } from "../shared/flowtel.js";
import { supabase } from "../shared/supabase.js";

const intro=document.getElementById("flowMapIntro");
const viewEyebrow=document.getElementById("viewEyebrow");
const viewingName=document.getElementById("viewingName");
const cycleSelector=document.getElementById("cycleSelector");
const openCycleDataLink=document.getElementById("openCycleDataLink");
const printFlowMapButton=document.getElementById("printFlowMapButton");
const practiceCopy=document.getElementById("practiceCopy");
const message=document.getElementById("flowMapMessage");

const SEASONS=["Inner Autumn","Inner Summer","Inner Winter","Inner Spring"];
const NOTE_TARGETS={
  "Inner Autumn":"notesAutumn",
  "Inner Summer":"notesSummer",
  "Inner Winter":"notesWinter",
  "Inner Spring":"notesSpring",
};

let currentProfile=null;
let allEntries=[];
let currentClients=[];
let currentMode="self";
let targetClient=null;

function params(){ return new URLSearchParams(window.location.search); }
function requestedClientId(){ return params().get("client"); }
function requestedScope(){ return params().get("scope"); }
function requestedCycle(){ return params().get("cycle"); }
function isAdminRole(profile){ return ["admin","owner"].includes(profile?.role); }
function isMentorRole(profile){ return ["practitioner","admin","owner"].includes(profile?.role); }
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
}
function fullName(profile){
  return [profile?.first_name,profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Flowtel Guest";
}
function formatDate(value){
  if(!value) return "—";
  const raw=String(value).slice(0,10);
  const [year,month,day]=raw.split("-").map(Number);
  if(!year||!month||!day) return raw;
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(Date.UTC(year,month-1,day)));
}
function formatTime(value){
  if(!value) return "—";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(date);
}
function addDays(dateString,days){
  if(!dateString) return "";
  const [y,m,d]=String(dateString).slice(0,10).split("-").map(Number);
  if(!y||!m||!d) return "";
  const date=new Date(Date.UTC(y,m-1,d+days));
  return date.toISOString().slice(0,10);
}
function cycleDataHref(){
  const clientId=requestedClientId();
  const scope=requestedScope();
  if(clientId) return `/cycle-data/?client=${encodeURIComponent(clientId)}`;
  if(scope==="all") return "/cycle-data/?scope=all";
  return "/cycle-data/";
}
function fetchHrefForCycle(cycleStart){
  const url=new URL(window.location.href);
  if(cycleStart) url.searchParams.set("cycle",cycleStart);
  else url.searchParams.delete("cycle");
  return `${url.pathname}${url.search}`;
}
async function fetchCycleEntries({subjectId=null,scope="self"}){
  const { data, error } = await supabase.rpc("flowtel_get_cycle_data_entries",{
    p_subject_id: subjectId,
    p_scope: scope,
  });
  if(error) throw error;
  return data || [];
}
function buildCycles(entries){
  const starts=[...new Set(entries.map(row=>row.cycle_start_date).filter(Boolean))].sort().reverse();
  if(!starts.length){
    return [{start:"",end:"",label:"Current Cycle",entries}];
  }
  return starts.map((start,index)=>{
    const previousNewerStart=starts[index-1] || "";
    const end=previousNewerStart ? addDays(previousNewerStart,-1) : "";
    const label=index===0
      ? `Current Cycle · ${formatDate(start)}${end ? ` – ${formatDate(end)}` : " · in progress"}`
      : `${index===1 ? "Previous Cycle" : `Cycle ${index+1}`} · ${formatDate(start)}${end ? ` – ${formatDate(end)}` : ""}`;
    return {
      start,
      end,
      label,
      entries:entries.filter(row=>row.cycle_start_date===start),
    };
  });
}
function defaultCycleStart(cycles){
  const explicit=requestedCycle();
  if(explicit && cycles.some(cycle=>cycle.start===explicit)) return explicit;
  // Flow Map Practice defaults to the most recently completed cycle. If there is
  // no completed cycle yet, show the current cycle in progress.
  return cycles[1]?.start || cycles[0]?.start || "";
}
function hydrateCycleSelector(cycles,selectedStart){
  cycleSelector.innerHTML=cycles.map(cycle=>`<option value="${escapeHtml(cycle.start)}" ${cycle.start===selectedStart?"selected":""}>${escapeHtml(cycle.label)}</option>`).join("");
  if(!cycles.length) cycleSelector.innerHTML=`<option value="">Current Cycle</option>`;
}
function offCycleLabel(row){
  const actual=Number(row.cycle_day_actual ?? row.cycle_day_calculated);
  const recorded=Number(row.cycle_day_recorded ?? row.cycle_day_claimed);
  if(!Number.isFinite(actual)||!Number.isFinite(recorded)||actual===recorded) return "";
  const diff=recorded-actual;
  return diff>0 ? `${diff} day${diff===1?"":"s"} ahead` : `${Math.abs(diff)} day${Math.abs(diff)===1?"":"s"} behind`;
}
function seasonKey(season){
  return String(season || "").replace(/^Inner\s+/i,"").toLowerCase();
}
function noteMarkup(row,index){
  const reflection=String(row.reflection_text||"").trim() || "A quiet check-in. No note left.";
  const actual=row.cycle_day_actual ?? row.cycle_day_calculated ?? "—";
  const feels=row.feels_like_inner_season ? `Feels like ${row.feels_like_inner_season.replace(/^Inner\s+/i,"")}` : "Felt season unknown";
  const time=formatTime(row.checked_in_at || row.reflection_created_at);
  const off=offCycleLabel(row);
  const clientName=row.client_name || targetClient?.name || "";
  const showClientName=currentMode!=="self" && clientName;
  return `
    <article class="map-note map-note--${(index % 9) + 1}">
      ${showClientName ? `<p class="map-note-client">${escapeHtml(clientName)}</p>` : ""}
      <p class="map-note-text">${escapeHtml(reflection)}</p>
      <p class="map-note-meta">
        <span>Day ${escapeHtml(actual)}</span>
        <span>${escapeHtml(feels)}</span>
        <span>${escapeHtml(time)}</span>
        ${off ? `<span>${escapeHtml(off)}</span>` : ""}
      </p>
    </article>
  `;
}
function renderQuadrants(entries){
  SEASONS.forEach(season=>{
    const holder=document.getElementById(NOTE_TARGETS[season]);
    if(!holder) return;
    const rows=entries.filter(row=>row.inner_season===season);
    holder.innerHTML=rows.length
      ? rows.map((row,index)=>noteMarkup(row,index)).join("")
      : `<div class="map-empty">10/10 no notes.</div>`;
  });
}
function selectedCycle(cycles){
  const selected=cycleSelector.value;
  return cycles.find(cycle=>cycle.start===selected) || cycles[0] || {entries:[]};
}
function bindCycleSelector(cycles){
  cycleSelector.addEventListener("change",()=>{
    const selected=selectedCycle(cycles);
    history.replaceState(null,"",fetchHrefForCycle(selected.start));
    renderQuadrants(selected.entries);
  });
}
function bindPrint(){
  printFlowMapButton.addEventListener("click",()=>window.print());
}
async function init(){
  try{
    currentProfile=await getCurrentProfile();
    if(!currentProfile){
      intro.textContent="Please sign in through your Suite or Concierge Desk to open your Flow Map.";
      viewingName.textContent="No active session";
      return;
    }

    if(openCycleDataLink) openCycleDataLink.href=cycleDataHref();
    bindPrint();

    currentClients=await listMyClients().catch(()=>[]);
    const targetId=requestedClientId();
    const scope=requestedScope();
    currentMode=scope==="all" ? "all" : targetId ? "client" : "self";

    if(currentMode==="all"){
      if(!isMentorRole(currentProfile)) throw new Error("Only mentors and admins can open a collective Flow Map.");
      viewEyebrow.textContent=isAdminRole(currentProfile)?"ADMIN FLOW MAP":"MENTOR FLOW MAP";
      viewingName.textContent=isAdminRole(currentProfile)?"All Flowtel Clients":"All My Clients";
      intro.textContent="A spacious seasonal spread of client check-ins organized by actual inner season.";
      practiceCopy.textContent="Use this spread to notice collective patterns, then return to one woman at a time.";
      allEntries=await fetchCycleEntries({scope:"all"});
    }else if(currentMode==="client"){
      const relationship=currentClients.find(row=>row.client_id===targetId);
      if(!relationship && !isAdminRole(currentProfile)){
        throw new Error("This Flow Map is only available for connected clients.");
      }
      const client=relationship?.client || {id:targetId};
      targetClient={ id:targetId, name:fullName(client) };
      viewEyebrow.textContent="CLIENT FLOW MAP";
      viewingName.textContent=targetClient.name;
      intro.textContent="A consent-aware Flow Map for this guest’s cycle reflections.";
      practiceCopy.textContent="Use this with your client after her first completed cycle. The map gathers the notes; she names the patterns.";
      allEntries=await fetchCycleEntries({subjectId:targetId,scope:"client"});
    }else{
      viewEyebrow.textContent="MY FLOW MAP";
      viewingName.textContent=fullName(currentProfile);
      intro.textContent="Your check-ins from one cycle, placed into the four seasonal quadrants.";
      practiceCopy.textContent="Read your own notes and write down the themes you notice between seasons. Reflection is where the magic happens.";
      allEntries=await fetchCycleEntries({scope:"self"});
    }

    const cycles=buildCycles(allEntries);
    const chosenStart=defaultCycleStart(cycles);
    hydrateCycleSelector(cycles,chosenStart);
    bindCycleSelector(cycles);
    const cycle=cycles.find(item=>item.start===chosenStart) || cycles[0] || {entries:[]};
    renderQuadrants(cycle.entries || []);
  }catch(error){
    console.error(error);
    intro.textContent="This Flow Map could not open.";
    viewingName.textContent="Access unavailable";
    renderQuadrants([]);
    if(message) message.textContent=error?.message || "Please return to your Suite or Concierge Desk and try again.";
  }
}

init();
