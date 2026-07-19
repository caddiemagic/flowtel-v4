import { displayNameForProfile, getCurrentProfile } from "../shared/profiles.js?v=0.4.1";
import { listMyClients } from "../shared/flowtel.js?v=0.10.52";
import { supabase } from "../shared/supabase.js";

const intro=document.getElementById("flowMapIntro");
const viewEyebrow=document.getElementById("viewEyebrow");
const viewingName=document.getElementById("viewingName");
const cycleSelector=document.getElementById("cycleSelector");
const cycleSelectorWrap=document.getElementById("cycleSelectorWrap");
const guestCycleToolbar=document.getElementById("guestCycleToolbar");
const guestCycleSummary=document.getElementById("guestCycleSummary");
const guestCycleNav=document.getElementById("guestCycleNav");
const scopeToggle=document.getElementById("scopeToggle");
const openCycleDataLink=document.getElementById("openCycleDataLink");
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
function isGuestFacingMode(){ return currentMode==="self" || currentMode==="client"; }
function isAdminRole(profile){ return ["admin","owner"].includes(profile?.role); }
function isMentorRole(profile){ return ["practitioner","admin","owner"].includes(profile?.role); }
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
}
function fullName(profile){
  return displayNameForProfile(profile, "Flowtel Guest");
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
  if(cycleStart){
    url.searchParams.set("cycle", cycleStart==="__all" ? "all" : cycleStart);
  }else{
    url.searchParams.delete("cycle");
  }
  return `${url.pathname}${url.search}`;
}
async function fetchCycleEntries({subjectId=null,scope="self"}){
  const args={
    p_subject_id: subjectId,
    p_scope: scope,
  };
  const { data, error } = await supabase.rpc("flowtel_get_flow_map_entries",args);
  if(!error) return data || [];

  // Keep the Flow Map available if the front end is deployed moments before
  // migration 030. The legacy RPC remains a temporary fallback, but it only
  // returns the latest reflection per stay.
  const missingFunction=error?.code==="PGRST202" || error?.code==="42883" || /flowtel_get_flow_map_entries/i.test(error?.message || "");
  if(!missingFunction) throw error;

  const fallback=await supabase.rpc("flowtel_get_cycle_data_entries",args);
  if(fallback.error) throw fallback.error;
  return fallback.data || [];
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
  return cycles;
}
function defaultCycleStart(cycles){
  const explicit=requestedCycle();
  if(explicit==="all") return "__all";
  if(explicit && cycles.some(cycle=>cycle.start===explicit)) return explicit;
  if(isGuestFacingMode()) return cycles[0]?.start || "__all";
  // Admin + mentor collective views default to the most recently completed cycle.
  return cycles.find((cycle,index)=>index>0 && !String(cycle.start).startsWith("__"))?.start || cycles[0]?.start || "";
}
function hydrateCycleSelector(cycles,selectedStart){
  const options=cycles.map(cycle=>`<option value="${escapeHtml(cycle.start)}" ${cycle.start===selectedStart?"selected":""}>${escapeHtml(cycle.label)}</option>`);
  if(isGuestFacingMode()) options.push(`<option value="__all" ${selectedStart==="__all"?"selected":""}>All Cycles</option>`);
  cycleSelector.innerHTML=options.join("");
  if(!cycles.length) cycleSelector.innerHTML=`<option value="__all">All Cycles</option>`;
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
function moonPhaseLabel(value){
  const phase=String(value || "Moon Phase Unknown").trim();
  if(!phase) return "Moon Phase Unknown";
  return /\bphase$/i.test(phase) ? phase : `${phase} Phase`;
}
function noteTextEntriesForRow(row){
  const entries=[];
  const reflection=String(row.reflection_text||"").trim();
  const checkout=String(row.checkout_notes||"").trim();
  if(reflection){
    entries.push({row, text:reflection, source:"Check-in", at:row.reflection_created_at || row.checked_in_at, moonPhase:moonPhaseLabel(row.moon_phase)});
  }
  if(checkout){
    entries.push({row, text:checkout, source:"Checkout", at:row.reflection_created_at || row.checked_out_at || row.checked_in_at, moonPhase:moonPhaseLabel(row.moon_phase)});
  }
  return entries;
}
function noteCardMarkup(entry,index,densityMode="open"){
  const row=entry.row;
  const actual=row.cycle_day_actual ?? row.cycle_day_calculated ?? row.cycle_day_recorded ?? row.cycle_day_claimed ?? "—";
  const dayLabel=actual === "—" || actual === null || actual === undefined ? "DAY —" : `DAY ${actual}`;
  return `
    <article class="map-note map-note--${(index % 9) + 1} ${densityMode!=="open" ? `map-note-${densityMode}` : ""}">
      <p class="map-note-text">${escapeHtml(entry.text)}</p>
      <p class="map-note-meta map-note-meta--note-tags">
        <span>${escapeHtml(dayLabel)}</span>
        <span>${escapeHtml(entry.moonPhase || moonPhaseLabel(row.moon_phase))}</span>
      </p>
    </article>
  `;
}

function densityModeForCount(count){
  if(count>=8) return "very-dense";
  if(count>=3) return "dense";
  return "open";
}
function rowHeightForCount(count){
  const base=680;
  const threshold=2;
  const extra=Math.max(0,count-threshold)*165;
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
    holder.dataset.count=String(noteEntries.length);
    holder.innerHTML=noteEntries.length
      ? noteEntries.map((entry,index)=>noteCardMarkup(entry,index,densityMode)).join("")
      : `<div class="map-empty">10/10 no notes.</div>`;
  });
}
function selectedCycle(cycles){
  const selected=cycleSelector.value;
  if(selected==="__all") return {start:"__all",label:"All Cycles",entries:allEntries};
  return cycles.find(cycle=>cycle.start===selected) || cycles[0] || {entries:[]};
}
function guestCycleOptions(cycles){
  const current=cycles[0] ? {label:"Current Cycle", token:cycles[0].start} : null;
  const last=cycles[1] ? {label:"Last Cycle", token:cycles[1].start} : null;
  const all=allEntries.length ? {label:"All Cycles", token:"__all"} : null;
  return [current,last,all].filter(Boolean);
}
function renderGuestCycleControls(cycles,selectedToken){
  if(!guestCycleToolbar || !guestCycleSummary || !guestCycleNav) return;
  const options=guestCycleOptions(cycles);
  const active=options.find(option=>option.token===selectedToken) || options[0];
  guestCycleSummary.textContent=active?.label || "All Cycles";
  guestCycleNav.innerHTML=options
    .filter(option=>option.token!== (active?.token || selectedToken))
    .map(option=>`<button type="button" data-cycle-token="${escapeHtml(option.token)}">${escapeHtml(option.label)}</button>`)
    .join("");
  guestCycleNav.querySelectorAll("button").forEach(button=>{
    button.addEventListener("click",()=>{
      cycleSelector.value=button.dataset.cycleToken || "__all";
      const selected=selectedCycle(cycles);
      history.replaceState(null,"",fetchHrefForCycle(selected.start));
      renderQuadrants(selected.entries);
      renderGuestCycleControls(cycles,selected.start);
    });
  });
}
function syncCycleControlVisibility(cycles,selectedToken){
  const guestMode=isGuestFacingMode();
  document.body.classList.toggle("guest-flow-map-mode", guestMode);
  if(guestCycleToolbar) guestCycleToolbar.classList.toggle("hidden", !guestMode);
  if(cycleSelectorWrap) cycleSelectorWrap.classList.toggle("hidden", guestMode);
  document.querySelectorAll(".view-disclosure").forEach(node=>node.classList.toggle("hidden", guestMode));
  if(guestMode) renderGuestCycleControls(cycles,selectedToken);
}
function bindCycleSelector(cycles){
  cycleSelector.addEventListener("change",()=>{
    const selected=selectedCycle(cycles);
    history.replaceState(null,"",fetchHrefForCycle(selected.start));
    renderQuadrants(selected.entries);
    syncCycleControlVisibility(cycles,selected.start);
  });
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

    currentClients=await listMyClients().catch(()=>[]);
    const targetId=requestedClientId();
    const scope=requestedScope();
    currentMode=scope==="all" ? "all" : targetId ? "client" : "self";
    renderScopeToggle(currentProfile,currentClients,targetId,currentMode);

    if(currentMode==="all"){
      if(!isMentorRole(currentProfile)) throw new Error("Only mentors and admins can open a collective Flow Map.");
      viewEyebrow.textContent=isAdminRole(currentProfile)?"ADMIN FLOW MAP":"MENTOR FLOW MAP";
      viewingName.textContent="Collective View";
      intro.textContent="A spacious seasonal spread of client check-ins organized by actual inner season.";
      practiceCopy.textContent="After the first full cycle, review check-ins and journal entries for patterns. Use the printable Flow Map, then meet with a mentor to discuss discoveries.";
      allEntries=await fetchCycleEntries({scope:"all"});
    }else if(currentMode==="client"){
      const relationship=currentClients.find(row=>row.client_id===targetId);
      if(!relationship && !isAdminRole(currentProfile)){
        throw new Error("This Flow Map is only available for connected clients.");
      }
      const client=relationship?.client || {id:targetId};
      targetClient={ id:targetId, name:fullName(client) };
      viewEyebrow.textContent="CLIENT FLOW MAP";
      viewingName.textContent="Client View";
      intro.textContent="A consent-aware Flow Map for this guest’s cycle reflections.";
      practiceCopy.textContent="After the first full cycle, review check-ins and journal entries for patterns. Use the printable Flow Map, then meet with a mentor to discuss discoveries.";
      allEntries=await fetchCycleEntries({subjectId:targetId,scope:"client"});
    }else{
      viewEyebrow.textContent="MY FLOW MAP";
      viewingName.textContent="Cycle View";
      intro.textContent="Your check-ins from one cycle, placed into the four seasonal quadrants.";
      practiceCopy.textContent="After your first full cycle of check-ins, review your notes and journal entries for patterns. Use the printable Flow Map to mark what you notice, then meet with your mentor to discuss what your cycle revealed.";
      allEntries=await fetchCycleEntries({scope:"self"});
    }

    const cycles=buildCycles(allEntries);
    const chosenStart=defaultCycleStart(cycles);
    hydrateCycleSelector(cycles,chosenStart);
    bindCycleSelector(cycles);
    const cycle=chosenStart==="__all"
      ? {start:"__all", entries:allEntries}
      : cycles.find(item=>item.start===chosenStart) || cycles[0] || {entries:[]};
    syncCycleControlVisibility(cycles,cycle.start || chosenStart);
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
