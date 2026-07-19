import { displayNameForProfile, getCurrentProfile } from "../shared/profiles.js?v=0.4.1";
import { listMyClients } from "../shared/flowtel.js?v=0.10.52";
import { supabase } from "../shared/supabase.js";
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from "../shared/beta-access.js";

const pageEyebrow=document.getElementById("pageEyebrow");
const pageTitle=document.getElementById("pageTitle");
const intro=document.getElementById("dashboardIntro");
const viewEyebrow=document.getElementById("viewEyebrow");
const viewingName=document.getElementById("viewingName");
const viewerToggle=document.getElementById("viewerToggle");
const dashboardActions=document.querySelector(".dashboard-actions");
const filtersTitle=document.getElementById("filtersTitle");
const seasonFilter=document.getElementById("seasonFilter");
const moonPhaseFilter=document.getElementById("moonPhaseFilter");
const moonCycleFilter=document.getElementById("moonCycleFilter");
const startDateFilter=document.getElementById("startDateFilter");
const endDateFilter=document.getElementById("endDateFilter");
const clearFiltersButton=document.getElementById("clearFiltersButton");
const snapshotTitle=document.getElementById("snapshotTitle");
const snapshotCopy=document.getElementById("snapshotCopy");
const metricGrid=document.getElementById("metricGrid");
const flowMapGrid=document.getElementById("flowMapGrid");
const entryEyebrow=document.getElementById("entryEyebrow");
const entryTitle=document.getElementById("entryTitle");
const entryCount=document.getElementById("entryCount");
const entryList=document.getElementById("entryList");
const message=document.getElementById("dashboardMessage");
const openFlowMapLink=document.getElementById("openFlowMapLink");

const SEASONS=["Inner Winter","Inner Spring","Inner Summer","Inner Autumn"];
const SEASON_COPY={
  "Inner Winter":"Reflection, rest, release, and the first return home.",
  "Inner Spring":"New energy, creative sparks, and tender beginnings.",
  "Inner Summer":"Visibility, vitality, connection, and embodied power.",
  "Inner Autumn":"Refinement, truth-telling, simplification, and preparation.",
};

const POWDER_ROOM_NAMES={
  "Inner Winter":"Winter Powder Room",
  "Inner Spring":"Spring Powder Room",
  "Inner Summer":"Summer Powder Room",
  "Inner Autumn":"Autumn Powder Room",
};

const POWDER_ROOM_COPY={
  "Inner Winter":"This is where the body tells the truth. Move slowly. Nothing here needs to be fixed.",
  "Inner Spring":"This is where the first green shoots appear. Read the beginnings, the sparks, the almost-ready things.",
  "Inner Summer":"This is where the radiance speaks. Read what others remembered here. Take only what opens you.",
  "Inner Autumn":"This is where the truth sharpens. Read what others released, refined, and finally admitted.",
};

let allEntries=[];
let currentMode="self";
let currentProfile=null;

function params(){ return new URLSearchParams(window.location.search); }
function requestedClientId(){ return params().get("client"); }
function requestedScope(){ return params().get("scope"); }
function requestedSeason(){ return normalizeSeason(params().get("season")); }
function flowMapHrefFor({targetId="",scope=""}={}){
  if(targetId) return `/flow-map/?client=${encodeURIComponent(targetId)}`;
  if(scope==="all") return "/flow-map/?scope=all";
  return "/flow-map/";
}
function isMentorRole(profile){ return ["practitioner","admin","owner"].includes(profile?.role); }
function isAdminRole(profile){ return ["admin","owner"].includes(profile?.role); }
function fullName(profile){
  return displayNameForProfile(profile, "Flowtel Guest");
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
}
function formatDate(value){
  if(!value) return "—";
  const raw=String(value).slice(0,10);
  const [year,month,day]=raw.split("-").map(Number);
  if(!year||!month||!day) return raw;
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(Date.UTC(year,month-1,day)));
}
function normalizeSeason(value){
  const match=SEASONS.find(season=>season.toLowerCase()===String(value||"").toLowerCase());
  return match || "";
}
function link(label,href,active=false){
  const a=document.createElement("a");
  a.href=href;
  a.textContent=label;
  a.classList.add("return-link");
  if(active) a.classList.add("active");
  return a;
}
function powderRoomHref(season){
  return `/cycle-data/?season=${encodeURIComponent(season)}`;
}
function renderPowderRoomSeasonNav(activeSeason){
  if(!dashboardActions) return;
  dashboardActions.classList.add("powder-room-season-actions");
  dashboardActions.setAttribute("aria-label","Powder Room season navigation");
  dashboardActions.innerHTML="";
  SEASONS.filter(season=>season!==activeSeason).forEach(season=>{
    const label=powderRoomName(season).replace(/ Powder Room$/i," Room");
    dashboardActions.appendChild(link(label,powderRoomHref(season),false));
  });
}
function renderPowderRoomReturnNav(){
  let nav=document.getElementById("powderRoomBottomActions");
  if(!nav){
    nav=document.createElement("nav");
    nav.id="powderRoomBottomActions";
    nav.className="powder-room-bottom-actions";
    nav.setAttribute("aria-label","Powder Room return navigation");
    const suite=link("Return to Suite","/client/?suite=1");
    const concierge=link("Return to Concierge","/manager/");
    nav.append(suite,concierge);
    const dashboardCard=document.querySelector(".dashboard-card");
    if(dashboardCard && message) dashboardCard.insertBefore(nav,message);
    else document.querySelector(".cycle-dashboard-shell")?.appendChild(nav);
  }
  nav.classList.remove("hidden");
}
function restoreDashboardActions(){
  const nav=document.getElementById("powderRoomBottomActions");
  if(nav) nav.classList.add("hidden");
}
function countBy(rows,key){
  return rows.reduce((map,row)=>{
    const value=row?.[key] || "Unknown";
    map[value]=(map[value]||0)+1;
    return map;
  },{});
}
function topLabel(rows,key){
  const counts=countBy(rows,key);
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";
}
function uniqueSorted(rows,key){
  return [...new Set(rows.map(row=>row?.[key]).filter(Boolean))].sort();
}
function moonCycleLabel(start){
  return start ? `New Moon ${formatDate(start)}` : "Unknown Moon Cycle";
}
function powderRoomName(season){
  return POWDER_ROOM_NAMES[season] || "Powder Room";
}
function powderRoomTitle(season){
  return powderRoomName(season).toUpperCase();
}
function powderRoomCopy(season){
  return POWDER_ROOM_COPY[season] || "Anonymous reflections from guests moving through the Flowtel.";
}
function compactMoonPhase(value){
  const phase=String(value || "Moon Phase Unknown").trim();
  return /\bphase$/i.test(phase) ? phase : `${phase} Phase`;
}
function dateInRange(date,start,end){
  if(!date) return false;
  const day=String(date).slice(0,10);
  if(start && day<start) return false;
  if(end && day>end) return false;
  return true;
}
function currentFilterValues(){
  return {
    season: seasonFilter?.value || "",
    moonPhase: moonPhaseFilter?.value || "",
    moonCycle: moonCycleFilter?.value || "",
    startDate: startDateFilter?.value || "",
    endDate: endDateFilter?.value || "",
  };
}
function filteredEntries(){
  const filters=currentFilterValues();
  return allEntries.filter(row=>{
    if(filters.season && row.inner_season!==filters.season) return false;
    if(filters.moonPhase && row.moon_phase!==filters.moonPhase) return false;
    if(filters.moonCycle && row.moon_cycle_start_date!==filters.moonCycle) return false;
    if(!dateInRange(row.checkin_date,filters.startDate,filters.endDate)) return false;
    return true;
  });
}
function hydrateFilterOptions(rows){
  const selectedMoon=moonPhaseFilter.value;
  const selectedCycle=moonCycleFilter.value;

  const phases=uniqueSorted(rows,"moon_phase");
  moonPhaseFilter.innerHTML=`<option value="">All Moon Phases</option>${phases.map(phase=>`<option ${phase===selectedMoon?"selected":""}>${escapeHtml(phase)}</option>`).join("")}`;

  const cycles=uniqueSorted(rows,"moon_cycle_start_date");
  moonCycleFilter.innerHTML=`<option value="">All Moon Cycles</option>${cycles.map(cycle=>`<option value="${escapeHtml(cycle)}" ${cycle===selectedCycle?"selected":""}>${escapeHtml(moonCycleLabel(cycle))}</option>`).join("")}`;
}
function renderToggle(profile,clients,targetId,mode){
  viewerToggle.innerHTML="";
  const season=requestedSeason();
  const seasonQuery=season ? `?season=${encodeURIComponent(season)}` : "";
  viewerToggle.appendChild(link("My Data","/cycle-data/",mode==="self"));

  clients.forEach(row=>{
    const client=row.client || {};
    viewerToggle.appendChild(link(fullName(client),`/cycle-data/?client=${encodeURIComponent(row.client_id)}`,targetId===row.client_id));
  });

  if(isMentorRole(profile)){
    const label=isAdminRole(profile) ? "All Flowtel Clients" : "All My Clients";
    viewerToggle.appendChild(link(label,"/cycle-data/?scope=all",mode==="all"));
  }

  viewerToggle.appendChild(link("Powder Rooms",seasonQuery || "/cycle-data/?season=Inner%20Winter",mode==="season"));
}
async function fetchCycleEntries({subjectId=null,scope="self"}){
  const { data, error } = await supabase.rpc("flowtel_get_cycle_data_entries",{
    p_subject_id: subjectId,
    p_scope: scope,
  });
  if(error) throw error;
  return data || [];
}
async function fetchSeasonReflections(season){
  const { data, error } = await supabase.rpc("flowtel_get_collective_season_reflections",{
    p_inner_season: season || null,
    p_moon_phase: moonPhaseFilter?.value || null,
    p_start_date: startDateFilter?.value || null,
    p_end_date: endDateFilter?.value || null,
    p_moon_cycle_start: moonCycleFilter?.value || null,
  });
  if(error) throw error;
  return data || [];
}
function metric(label,value){
  return `<article class="metric-pill"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`;
}
function renderMetrics(rows){
  const reflectionCount=rows.filter(row=>String(row.reflection_text||"").trim()).length;
  const latest=rows.slice().sort((a,b)=>String(b.checkin_date||"").localeCompare(String(a.checkin_date||"")))[0];
  metricGrid.innerHTML=[
    metric("Entries",rows.length),
    metric("Reflections",reflectionCount),
    metric("Top Actual Season",topLabel(rows,"inner_season")),
    metric("Top Feels-Like",topLabel(rows,"feels_like_inner_season")),
    metric("Latest Check-In",latest?.checkin_date ? formatDate(latest.checkin_date) : "—"),
    metric("Moon Phase",topLabel(rows,"moon_phase")),
  ].join("");
}
function renderFlowMap(rows,activeSeason=""){
  const counts=countBy(rows,"inner_season");
  flowMapGrid.innerHTML=SEASONS.map(season=>`
    <article class="${activeSeason===season?"active":""}">
      <p class="eyebrow">${escapeHtml(season)}</p>
      <h3>${escapeHtml(SEASON_COPY[season])} <span>Days ${season==="Inner Winter"?"27–5":season==="Inner Spring"?"6–11":season==="Inner Summer"?"12–19":"20–26"}</span></h3>
      <p class="season-count">${counts[season] || 0}</p>
      <p>${counts[season] || 0} check-in${(counts[season]||0)===1?"":"s"} in this view.</p>
    </article>
  `).join("");
}
function entryMarkup(row,{anonymous=false}={}){
  const reflection=String(row.reflection_text||"").trim();
  const recorded=row.cycle_day_recorded ?? row.cycle_day_claimed ?? "—";
  const actual=row.cycle_day_actual ?? row.cycle_day_calculated ?? "—";
  return `
    <article class="entry-card">
      <p class="eyebrow">${anonymous?"ANONYMOUS FLOWTEL REFLECTION":"FLOWTEL ENTRY"}</p>
      <h3>${escapeHtml(formatDate(row.checkin_date || row.reflection_created_at))}</h3>
      <div class="entry-meta">
        <span>Actual Day ${escapeHtml(actual)}</span>
        <span>Recorded Day ${escapeHtml(recorded)}</span>
        <span>${escapeHtml(row.inner_season || "Unknown Season")}</span>
        <span>Feels Like: ${escapeHtml(row.feels_like_inner_season || "—")}</span>
        <span>${escapeHtml(row.moon_phase || "Moon Phase Unknown")}</span>
        ${row.moon_cycle_start_date ? `<span>${escapeHtml(moonCycleLabel(row.moon_cycle_start_date))}</span>` : ""}
        ${row.checked_out_at ? `<span>Checked Out</span>` : `<span>Still Open</span>`}
      </div>
      ${reflection ? `<p class="entry-reflection">${escapeHtml(reflection)}</p>` : `<p>No reflection was saved for this check-in.</p>`}
      ${String(row.checkout_notes||"").trim() ? `<p class="entry-reflection checkout-entry-note"><strong>Checkout note:</strong> ${escapeHtml(row.checkout_notes)}</p>` : ""}
    </article>
  `;
}
function renderPowderRoom(rows,season){
  entryEyebrow.textContent="";
  entryTitle.textContent="Notes left on the mirror";
  entryCount.textContent="";
  entryList.className="powder-note-cloud";
  entryList.innerHTML=rows.length
    ? rows.map((row,index)=>powderNoteMarkup(row,index)).join("")
    : `<div class="empty-state powder-empty"><p>No one has left a note in this Powder Room yet. The mirror is waiting.</p></div>`;
}

function powderNoteMarkup(row,index){
  const reflection=String(row.reflection_text||"").trim();
  const note=reflection || "A guest passed through this season quietly.";
  const toneClass=`powder-note--${(index % 8) + 1}`;
  const moon=compactMoonPhase(row.moon_phase);
  const actual=row.cycle_day_actual ?? row.cycle_day_recorded ?? "—";
  const dayLabel=actual === "—" || actual === null || actual === undefined ? "DAY —" : `DAY ${actual}`;
  return `
    <article class="powder-note ${toneClass}">
      <p class="powder-note-text">${escapeHtml(note)}</p>
      <p class="powder-note-meta"><span>${escapeHtml(dayLabel)}</span><span>${escapeHtml(moon)}</span></p>
    </article>
  `;
}

function renderEntries(rows,{anonymous=false,title="Entries",eyebrow="CHECK-IN LOG"}={}){
  entryList.className="entry-list";
  entryEyebrow.textContent=eyebrow;
  entryTitle.textContent=title;
  entryCount.textContent=`${rows.length} entr${rows.length===1?"y":"ies"}`;
  entryList.innerHTML=rows.length
    ? rows.map(row=>entryMarkup(row,{anonymous})).join("")
    : `<div class="empty-state"><p>No entries match this view yet.</p></div>`;
}
function rerenderStandard(){
  const rows=filteredEntries();
  renderMetrics(rows);
  renderFlowMap(rows,seasonFilter.value);
  renderEntries(rows,{title:currentMode==="all"?"Collective Client Entries":"Cycle Entries"});
}
async function rerenderSeason(){
  try{
    const season=normalizeSeason(requestedSeason() || seasonFilter.value);
    seasonFilter.value=season || "";
    moonPhaseFilter.value="";
    moonCycleFilter.value="";
    startDateFilter.value="";
    endDateFilter.value="";
    const rows=await fetchSeasonReflections(season);
    allEntries=rows;
    renderPowderRoom(rows,season);
  }catch(error){
    console.error(error);
    if(message) message.textContent=error?.message || "This Powder Room is not available yet.";
  }
}
function bindFilters(mode){
  [seasonFilter,moonPhaseFilter,moonCycleFilter,startDateFilter,endDateFilter].forEach(input=>{
    input.addEventListener("change",()=>{
      if(mode==="season") rerenderSeason();
      else rerenderStandard();
    });
  });
  clearFiltersButton.addEventListener("click",()=>{
    seasonFilter.value=requestedSeason() || "";
    moonPhaseFilter.value="";
    moonCycleFilter.value="";
    startDateFilter.value="";
    endDateFilter.value="";
    if(mode==="season") rerenderSeason();
    else rerenderStandard();
  });
}
async function init(){
  try{
    currentProfile=await getCurrentProfile();
    if(!currentProfile){
      replacePageWithPhaseTwoGate({
        featureName:"Cycle Data Dashboard",
        title:"Opening in Phase 2",
        copy:"The Cycle Data Dashboard will open in Phase 2 of beta testing. For now, return to the guest flow and keep testing check-in, Suite, Lounge, and Flow Map basics.",
        returnHref:"/enter/?membership=queendom",
        returnLabel:"Enter the Flowtel",
      });
      return;
    }
    if(!isPractitionerLevel(currentProfile)){
      replacePageWithPhaseTwoGate({
        featureName:"Cycle Data Dashboard",
        title:"Opening in Phase 2",
        copy:"The Cycle Data Dashboard is reserved for practitioner-level beta testing. Guest beta testers are helping us stabilize check-in, Suite, Lounge, and Flow Map first.",
      });
      return;
    }

    const clients=await listMyClients().catch(()=>[]);
    const targetId=requestedClientId();
    const season=requestedSeason();
    const scope=requestedScope();
    currentMode=season ? "season" : scope==="all" ? "all" : targetId ? "client" : "self";
    if(openFlowMapLink){
      openFlowMapLink.href=flowMapHrefFor({targetId,scope});
      openFlowMapLink.classList.toggle("hidden",currentMode==="season");
    }
    restoreDashboardActions();
    renderToggle(currentProfile,clients,targetId,currentMode);
    bindFilters(currentMode);

    document.body.classList.toggle("powder-room-mode",currentMode==="season");

    if(currentMode==="season"){
      renderPowderRoomSeasonNav(season);
      renderPowderRoomReturnNav();
      if(pageEyebrow) pageEyebrow.textContent="ANONYMOUS REFLECTIONS";
      pageTitle.textContent=powderRoomTitle(season);
      viewEyebrow.textContent="GIRLS' BATHROOM";
      viewingName.textContent="What happens here stays here.";
      intro.textContent=powderRoomCopy(season);
      seasonFilter.value=season || "";
      await rerenderSeason();
      return;
    }

    if(pageEyebrow) pageEyebrow.textContent="FLOW MAP";

    if(currentMode==="all"){
      pageTitle.textContent="Collective Flow Map";
      viewEyebrow.textContent=isAdminRole(currentProfile)?"ADMIN VIEW":"MENTOR VIEW";
      viewingName.textContent=isAdminRole(currentProfile)?"All Flowtel Clients":"All My Clients";
      intro.textContent=isAdminRole(currentProfile)
        ? "Founder view is open. This includes all Flowtel guest cycle data available to the platform."
        : "Mentor collective view is open. This includes connected clients who have invited your access.";
      snapshotTitle.textContent="Collective client snapshot";
      snapshotCopy.textContent="This view helps mentors and admins notice patterns across women without losing the hospitality of one woman at a time.";
      allEntries=await fetchCycleEntries({scope:"all"});
    }else if(currentMode==="client"){
      const relationship=clients.find(row=>row.client_id===targetId);
      if(!relationship && !isAdminRole(currentProfile)){
        throw new Error("This cycle dashboard is only available for connected clients.");
      }
      const client=relationship?.client || { id:targetId };
      intro.textContent="Consent-aware client view is open.";
      viewingName.textContent=fullName(client);
      snapshotTitle.textContent="Client Flow Map";
      snapshotCopy.textContent="This guest invited mentor access to their Flowtel cycle data, check-ins, reflections, and stay history while connected.";
      allEntries=await fetchCycleEntries({subjectId:targetId,scope:"client"});
    }else{
      intro.textContent="Your own Flowtel cycle data lives here first.";
      viewingName.textContent=fullName(currentProfile);
      snapshotTitle.textContent="My Flow Map";
      snapshotCopy.textContent="Practitioners are guests first and mentors second. Your own stays and cycle patterns live here before you tend anyone else’s data.";
      allEntries=await fetchCycleEntries({scope:"self"});
    }

    hydrateFilterOptions(allEntries);
    rerenderStandard();
  }catch(error){
    console.error(error);
    intro.textContent="This dashboard could not open.";
    viewingName.textContent="Access unavailable";
    metricGrid.innerHTML="";
    flowMapGrid.innerHTML="";
    entryList.innerHTML=`<div class="empty-state"><p>${escapeHtml(error?.message || "Please return to the Concierge Desk and try again.")}</p></div>`;
    if(message) message.textContent=error?.message || "Please return to the Concierge Desk and try again.";
  }
}

init();
