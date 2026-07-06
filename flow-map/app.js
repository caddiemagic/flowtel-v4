import { getCurrentProfile } from "../shared/profiles.js";
import { listMyClients } from "../shared/flowtel.js";
import { supabase } from "../shared/supabase.js";

const intro=document.getElementById("flowMapIntro");
const viewEyebrow=document.getElementById("viewEyebrow");
const viewingName=document.getElementById("viewingName");
const cycleSelector=document.getElementById("cycleSelector");
const scopeToggle=document.getElementById("scopeToggle");
const openCycleDataLink=document.getElementById("openCycleDataLink");
const printFlowMapButton=document.getElementById("printFlowMapButton");
const printableFlowMapLink=document.getElementById("printableFlowMapLink");
const flowMapCanvas=document.getElementById("flowMapCanvas");
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
function flowMapHrefFor({targetId="",scope=""}={}){
  if(targetId) return `/flow-map/?client=${encodeURIComponent(targetId)}`;
  if(scope==="all") return "/flow-map/?scope=all";
  return "/flow-map/";
}
function link(label,href,active=false){
  const a=document.createElement("a");
  a.textContent=label;
  a.href=href;
  a.className=active ? "active" : "";
  return a;
}
function renderScopeToggle(profile,clients,targetId,mode){
  if(!scopeToggle) return;
  scopeToggle.innerHTML="";
  scopeToggle.appendChild(link("My Flow Map","/flow-map/",mode==="self"));
  clients.forEach(row=>{
    const client=row.client || {};
    scopeToggle.appendChild(link(fullName(client),flowMapHrefFor({targetId:row.client_id}),targetId===row.client_id));
  });
  if(isMentorRole(profile)){
    scopeToggle.appendChild(link(isAdminRole(profile)?"All Flowtel Clients":"All My Clients",flowMapHrefFor({scope:"all"}),mode==="all"));
  }
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
  const cycles=starts.map((start,index)=>{
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
  if(starts.length>=2){
    const last3Starts=starts.slice(0,3);
    cycles.splice(1,0,{
      start:"__last3",
      end:"",
      label:last3Starts.length>=3 ? "Last 3 Cycles" : "Current + Previous Cycles",
      entries:entries.filter(row=>last3Starts.includes(row.cycle_start_date)),
    });
  }
  return cycles;
}
function defaultCycleStart(cycles){
  const explicit=requestedCycle();
  if(explicit && cycles.some(cycle=>cycle.start===explicit)) return explicit;
  // Flow Map Practice defaults to the most recently completed cycle. If there is
  // no completed cycle yet, show the current cycle in progress.
  return cycles.find((cycle,index)=>index>0 && !String(cycle.start).startsWith("__"))?.start || cycles[0]?.start || "";
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
function noteTextEntriesForRow(row){
  const entries=[];
  const reflection=String(row.reflection_text||"").trim();
  const checkout=String(row.checkout_notes||"").trim();
  if(reflection){
    entries.push({row, text:reflection, source:"Check-in", at:row.checked_in_at || row.reflection_created_at});
  }
  if(checkout){
    entries.push({row, text:checkout, source:"Checkout", at:row.checked_out_at || row.reflection_created_at || row.checked_in_at});
  }
  return entries;
}
function noteCardMarkup(entry,index,densityMode="open"){
  const row=entry.row;
  const actual=row.cycle_day_actual ?? row.cycle_day_calculated ?? "—";
  const feels=row.feels_like_inner_season ? `Felt like ${(row.feels_like_inner_season.replace(/^Inner\s+/i,"").toLowerCase()==="autumn" ? "Fall" : row.feels_like_inner_season.replace(/^Inner\s+/i,""))}` : "Felt season unknown";
  const off=offCycleLabel(row);
  const clientName=row.client_name || targetClient?.name || "";
  const showClientName=currentMode!=="self" && clientName;
  return `
    <article class="map-note map-note--${(index % 9) + 1} ${densityMode!=="open" ? `map-note-${densityMode}` : ""}">
      ${showClientName ? `<p class="map-note-client">${escapeHtml(clientName)}</p>` : ""}
      <p class="map-note-text">${escapeHtml(entry.text)}</p>
      <p class="map-note-meta">
        <span>${escapeHtml(entry.source)}</span>
        <span>Day ${escapeHtml(actual)}</span>
        <span>${escapeHtml(feels)}</span>
        ${off ? `<span>${escapeHtml(off)}</span>` : ""}
      </p>
    </article>
  `;
}

function densityModeForCount(count){
  if(count>=13) return "very-dense";
  if(count>=8) return "dense";
  return "open";
}
function rowHeightForCount(count){
  const base=560;
  const extra=Math.max(0,count-3)*92;
  return base + extra;
}
function updateCanvasRoom(counts){
  if(!flowMapCanvas) return;
  const topCount=Math.max(counts["Inner Autumn"]||0, counts["Inner Summer"]||0);
  const bottomCount=Math.max(counts["Inner Winter"]||0, counts["Inner Spring"]||0);
  const topHeight=rowHeightForCount(topCount);
  const bottomHeight=rowHeightForCount(bottomCount);
  const total=topHeight+bottomHeight;
  flowMapCanvas.style.setProperty("--top-row-height", `${topHeight}px`);
  flowMapCanvas.style.setProperty("--bottom-row-height", `${bottomHeight}px`);
  flowMapCanvas.style.setProperty("--axis-y", `${(topHeight/total)*100}%`);
  flowMapCanvas.dataset.roomState=Math.max(topCount,bottomCount)>=8 ? "expanded" : "open";
}

function renderQuadrants(entries){
  const counts={};
  const seasonNotes={};
  SEASONS.forEach(season=>{
    const noteEntries=entries
      .filter(row=>row.inner_season===season)
      .flatMap(noteTextEntriesForRow);
    counts[season]=noteEntries.length;
    seasonNotes[season]=noteEntries;
  });
  updateCanvasRoom(counts);
  SEASONS.forEach(season=>{
    const holder=document.getElementById(NOTE_TARGETS[season]);
    if(!holder) return;
    const noteEntries=seasonNotes[season] || [];
    const densityMode=densityModeForCount(noteEntries.length);
    holder.dataset.density=densityMode;
    holder.innerHTML=noteEntries.length
      ? noteEntries.map((entry,index)=>noteCardMarkup(entry,index,densityMode)).join("")
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
    if(printableFlowMapLink) printableFlowMapLink.href="/flow-map/printable/";
    bindPrint();

    currentClients=await listMyClients().catch(()=>[]);
    const targetId=requestedClientId();
    const scope=requestedScope();
    currentMode=scope==="all" ? "all" : targetId ? "client" : "self";
    renderScopeToggle(currentProfile,currentClients,targetId,currentMode);

    if(currentMode==="all"){
      if(!isMentorRole(currentProfile)) throw new Error("Only mentors and admins can open a collective Flow Map.");
      viewEyebrow.textContent=isAdminRole(currentProfile)?"ADMIN FLOW MAP":"MENTOR FLOW MAP";
      viewingName.textContent=isAdminRole(currentProfile)?"All Flowtel Clients":"All My Clients";
      intro.textContent="A spacious seasonal spread of client check-ins organized by actual inner season.";
      practiceCopy.textContent="Use this spread to notice collective patterns, then return to one woman at a time. There’s always room on the moon.";
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
      practiceCopy.textContent="Use this with your client after her first completed cycle. The map gathers the notes; she names the patterns. There’s always room on the moon.";
      allEntries=await fetchCycleEntries({subjectId:targetId,scope:"client"});
    }else{
      viewEyebrow.textContent="MY FLOW MAP";
      viewingName.textContent=fullName(currentProfile);
      intro.textContent="Your check-ins from one cycle, placed into the four seasonal quadrants.";
      practiceCopy.textContent="Read your own notes and write down the themes you notice between seasons. Reflection is where the magic happens. There’s always room on the moon.";
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
