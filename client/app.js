import { signInWithEmail } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js";
import { createStay, saveReflection, closeStayPersonally, getPreviousVisits, getDayContent } from "../shared/flowtel.js";

const lobbyScene=document.getElementById("lobbyScene");
const keyScene=document.getElementById("keyScene");
const preparingScene=document.getElementById("preparingScene");
const suiteScene=document.getElementById("suiteScene");
const loungeScene=document.getElementById("loungeScene");

const authPanel=document.getElementById("authPanel");
const checkinForm=document.getElementById("checkinForm");
const guestCheckinFields=document.getElementById("guestCheckinFields");
const message=document.getElementById("message");
const medicineWheel=document.getElementById("medicineWheel");

let currentProfile=null;
let currentStay=null;
let pendingArrivalStay=null;

function refineLobbyCopy(){
  document.querySelectorAll("h1,h2,p,button").forEach(el=>{
    const text=(el.textContent||"").trim();
    if(text==="WELCOME HOME") el.textContent="WELCOME HOME TO";
    if(text==="to the Flowtel") el.textContent="the Flowtel";
  });
}

refineLobbyCopy();

function setMessage(text){ message.textContent=text||""; }

function setProgress(step){
  document.querySelectorAll(".progress-ribbon span").forEach((item,index)=>item.classList.toggle("active",index<step));
}

function showScene(name){
  [lobbyScene,keyScene,preparingScene,suiteScene,loungeScene].forEach(scene=>scene.classList.remove("active"));
  if(name==="lobby"){lobbyScene.classList.add("active");setProgress(1);}
  if(name==="key"){keyScene.classList.add("active");setProgress(2);}
  if(name==="preparing"){preparingScene.classList.add("active");setProgress(2);}
  if(name==="suite"){suiteScene.classList.add("active");setProgress(3);}
  if(name==="lounge"){loungeScene.classList.add("active");setProgress(3);renderLoungeVisits();ensureLoungeClockInButton();}
}

function canClockIn(profile){
  return ["practitioner","owner","admin"].includes(profile?.role);
}

function showCheckIn(){
  authPanel.classList.add("hidden");
  checkinForm.classList.remove("hidden");

  const name=currentProfile?.first_name||"guest";
  document.getElementById("welcomeLine").textContent=`Welcome back, ${name}.`;

  // Release 0.4.2 arrival flow:
  // guests enter cycle data first, then choose Check In or Clock In.
  openGuestFields();
  const arrivalChoice=document.getElementById("arrivalChoice");
  if(arrivalChoice){
    arrivalChoice.classList.add("is-open");
  }

  const clockInButton=document.getElementById("clockInButton");
  if(clockInButton){
    clockInButton.classList.toggle("hidden",!canClockIn(currentProfile));
  }
}

function formatDate(dateString){
  if(!dateString) return "Open";
  return new Date(dateString).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}

function endTypeLabel(type){
  if(type==="manual") return "Personally checked out";
  if(type==="automatic") return "Automatically checked out";
  return "Stay still open";
}

/*
  Medicine Wheel Compass integrity:
  Day 1 sits directly below WEST.
  Day 28+ sits directly above WEST.
  Days move COUNTER-CLOCKWISE around the compass.

  Compass math uses a 330° sweep from the lower-west gate to the upper-west gate:
  WEST = 180°
  SOUTH = 270°
  EAST = 360° / 0°
  NORTH = 90°
*/
function normalizedRoom(day){
  const value=Number(day);
  if(!Number.isFinite(value)) return 1;
  return value>=28?28:Math.max(1,Math.min(28,value));
}

function wheelPosition(day){
  const room=normalizedRoom(day);
  const step=360/28;

  // Day 1 sits just below WEST and Day 28+ sits just above WEST.
  // All markers are equally spaced with the normal 1/28 circle gap.
  const startAngle=180 + (step/2);
  const angleDeg=startAngle + ((room-1)*step);
  const angle=angleDeg*Math.PI/180;
  const radius=44.25;

  return {
    x:50 + radius*Math.cos(angle),
    y:50 - radius*Math.sin(angle),
  };
}

function renderWheel(activeRoom){
  const rooms=Array.from({length:28},(_,i)=>i+1);
  const activeNormalizedRoom=normalizedRoom(activeRoom);
  const activePosition=wheelPosition(activeNormalizedRoom);

  medicineWheel.innerHTML = `
    <span class="wheel-cardinal wheel-cardinal-north">NORTH</span>
    <span class="wheel-cardinal wheel-cardinal-east">EAST</span>
    <span class="wheel-cardinal wheel-cardinal-south">SOUTH</span>
    <span class="wheel-cardinal wheel-cardinal-west">WEST</span>

    <span class="wheel-season wheel-season-autumn"><em>🍁</em>Inner Autumn<small>Days 20–26</small></span>
    <span class="wheel-season wheel-season-summer"><em>☀</em>Inner Summer<small>Days 12–19</small></span>
    <span class="wheel-season wheel-season-spring"><em>🌸</em>Inner Spring<small>Days 6–11</small></span>
    <span class="wheel-season wheel-season-winter"><em>❄</em>Inner Winter<small>Days 27–5</small></span>

    <div class="wheel-number-ring wheel-number-ring-inner" aria-hidden="true"></div>
    <div class="wheel-number-ring wheel-number-ring-outer" aria-hidden="true"></div>

    <div class="rose-compass-center">
      <svg class="rose-compass-svg" viewBox="0 0 220 220" role="img" aria-label="Gold rose compass">
        <defs>
          <linearGradient id="flowtelCompassGold" x1="42" y1="18" x2="178" y2="202" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff0be"/>
            <stop offset="0.28" stop-color="#d8a84f"/>
            <stop offset="0.54" stop-color="#b77d24"/>
            <stop offset="0.78" stop-color="#f2d289"/>
            <stop offset="1" stop-color="#a96f1d"/>
          </linearGradient>
          <linearGradient id="flowtelCompassSoftGold" x1="60" y1="32" x2="160" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff7d7"/>
            <stop offset="0.5" stop-color="#d8a84f"/>
            <stop offset="1" stop-color="#b98229"/>
          </linearGradient>
          <radialGradient id="flowtelCompassGlow" cx="50%" cy="50%" r="58%">
            <stop offset="0" stop-color="#fff9e8" stop-opacity=".96"/>
            <stop offset="0.55" stop-color="#f5d995" stop-opacity=".20"/>
            <stop offset="1" stop-color="#d8a84f" stop-opacity=".02"/>
          </radialGradient>
        </defs>
        <circle cx="110" cy="110" r="64" fill="url(#flowtelCompassGlow)" opacity=".9"/>
        <g class="compass-points" fill="url(#flowtelCompassGold)">
          <path d="M110 8 L121 96 L110 86 L99 96 Z"/>
          <path d="M110 212 L99 124 L110 134 L121 124 Z" opacity=".82"/>
          <path d="M212 110 L124 121 L134 110 L124 99 Z" opacity=".72"/>
          <path d="M8 110 L96 99 L86 110 L96 121 Z" opacity=".72"/>
          <path d="M181 39 L126 94 L130 79 Z" opacity=".52"/>
          <path d="M39 39 L90 79 L94 94 Z" opacity=".52"/>
          <path d="M181 181 L130 141 L126 126 Z" opacity=".52"/>
          <path d="M39 181 L94 126 L90 141 Z" opacity=".52"/>
        </g>
        <g class="sacred-guide-rings" fill="none" stroke="url(#flowtelCompassSoftGold)" stroke-width="1" opacity=".34">
          <circle cx="110" cy="110" r="46"/>
          <circle cx="110" cy="110" r="72" stroke-dasharray="2 8"/>
        </g>
        <g class="rose-petals" fill="rgba(255,253,249,.20)" stroke="url(#flowtelCompassGold)" stroke-width="2.2" opacity=".78">
          <ellipse cx="110" cy="82" rx="24" ry="10"/>
          <ellipse cx="110" cy="138" rx="24" ry="10"/>
          <ellipse cx="82" cy="110" rx="10" ry="24"/>
          <ellipse cx="138" cy="110" rx="10" ry="24"/>
          <ellipse cx="130" cy="90" rx="20" ry="8" transform="rotate(45 130 90)"/>
          <ellipse cx="90" cy="90" rx="20" ry="8" transform="rotate(-45 90 90)"/>
          <ellipse cx="130" cy="130" rx="20" ry="8" transform="rotate(-45 130 130)"/>
          <ellipse cx="90" cy="130" rx="20" ry="8" transform="rotate(45 90 130)"/>
        </g>
        <g class="rose-lines" fill="none" stroke="url(#flowtelCompassGold)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M112 111c16-14 5-40-18-35-22 5-30 32-10 48 22 17 58 3 59-30" opacity=".90"/>
          <path d="M110 110c-15 8-16 30 0 38 20 10 45-6 42-30-3-34-47-45-69-16" opacity=".76"/>
          <path d="M109 110c10 13 30 12 38-3 9-18-6-39-28-37-29 3-41 38-20 57" opacity=".68"/>
          <path d="M110 110c-8-7-22-4-25 6-6 14 6 30 22 28 22-2 31-28 16-44" opacity=".58"/>
        </g>
        <g class="rose-flourishes" fill="none" stroke="url(#flowtelCompassSoftGold)" stroke-width="1.6" stroke-linecap="round" opacity=".58">
          <path d="M74 78c-12 2-18 10-16 19 2 7 11 6 13 0"/>
          <path d="M146 78c12 2 18 10 16 19-2 7-11 6-13 0"/>
          <path d="M74 142c-12-2-18-10-16-19 2-7 11-6 13 0"/>
          <path d="M146 142c12-2 18-10 16-19-2-7-11-6-13 0"/>
        </g>
        <circle cx="110" cy="110" r="4" fill="url(#flowtelCompassGold)"/>
      </svg>
      <span class="rose-compass-proof">ROSE COMPASS 0.4.5</span>
    </div>
    <span class="wheel-current-star" style="--x:${activePosition.x}%;--y:${activePosition.y}%" aria-hidden="true">◆</span>
    ${rooms.map(room=>{
      const p=wheelPosition(room);
      const isActive=room===activeNormalizedRoom;
      return `<button class="wheel-room ${isActive?"active":""}" type="button" data-room="${room}" style="--x:${p.x}%;--y:${p.y}%" aria-label="Open previous visits for Room ${room===28?"28 plus":room}">${room===28?"28+":room}</button>`;
    }).join("")}
  `;

  medicineWheel.querySelectorAll("[data-room]").forEach(button=>{
    button.addEventListener("click",()=>openVisitsForRoom(button.dataset.room));
  });
}

async function openVisitsForRoom(room){
  if(!currentProfile) return;

  const visits=await getPreviousVisits(currentProfile.id,room);
  const drawer=document.getElementById("visitsDrawer");
  const list=document.getElementById("visitsList");

  document.getElementById("visitsRoomLabel").textContent=`ROOM ${room}`;
  document.getElementById("visitsTitle").textContent=`Previous Visits to Room ${room}`;

  list.innerHTML = !visits.length
    ? "<p>You have not recorded a previous visit to this room yet.</p>"
    : visits.map(visit=>`
        <article class="visit-card">
          <strong>${formatDate(visit.checkin_date)} → ${formatDate(visit.checked_out_at)}</strong>
          <p>${visit.stay_length_days||1} day stay</p>
          <p>${endTypeLabel(visit.stay_end_type)}</p>
          ${visit.reflection?`<p class="visit-reflection">${visit.reflection}</p>`:""}
        </article>
      `).join("");

  drawer.classList.remove("hidden");
}

async function renderLoungeVisits(){
  if(!currentProfile) return;

  const visits=await getPreviousVisits(currentProfile.id);
  const list=document.getElementById("loungeVisitsList");

  list.innerHTML = !visits.length
    ? "<p>No previous visits yet.</p>"
    : visits.slice(0,10).map(visit=>`
        <article class="visit-card">
          <strong>Room ${visit.cycle_day_claimed>=28?"28+":visit.cycle_day_claimed}</strong>
          <p>${formatDate(visit.checkin_date)} → ${formatDate(visit.checked_out_at)}</p>
          <p>${visit.stay_length_days||1} day stay · ${endTypeLabel(visit.stay_end_type)}</p>
        </article>
      `).join("");
}

function renderKey(stay){
  const name=currentProfile?.first_name||"Guest";
  const room=stay.cycle_day_claimed>=28?"28+":stay.cycle_day_claimed;

  document.getElementById("keyGuestName").textContent=`${name}, your key is ready.`;
  document.getElementById("keyRoomLine").textContent=`Room ${room}`;
  document.getElementById("keyCourtLine").textContent=stay.court||"Season Court";
}

function renderSuite(stay){
  currentStay=stay;

  const name=currentProfile?.first_name||"guest";
  const room=stay.cycle_day_claimed>=28?"28+":stay.cycle_day_claimed;
  const content=getDayContent(stay.cycle_day_claimed);

  document.getElementById("suiteWelcome").textContent=`Welcome home, ${name}.`;

  const connector=stay.inner_season===stay.feels_like_inner_season?"and":"but";
  document.getElementById("suiteSubline").textContent=`You're on Day ${stay.cycle_day_claimed} ${connector} today feels like ${stay.feels_like_inner_season}.`;

  document.getElementById("loungeCourtTitle").textContent=`Welcome to the ${stay.court || "Season Court"}.`;

  document.getElementById("suiteMoon").textContent=`${stay.moon_phase||"Moon phase"} · Day ${stay.moon_day||""}`;
  document.getElementById("suiteMoonTheme").textContent=stay.moon_theme||"";

  document.getElementById("suiteRoom").textContent=`Room ${room}`;
  document.getElementById("suiteSeason").textContent=`${stay.inner_season||"Inner season"} · feels like ${stay.feels_like_inner_season||"not recorded"}`;

  document.getElementById("roomTitle").textContent=`${content.title} · Room ${room}`;
  document.getElementById("roomAffirmation").textContent=content.affirmation;
  document.getElementById("roomPrompt").textContent=content.prompt;
  document.getElementById("roomQueenMove").textContent=content.queenMove;

  document.getElementById("reflectionInput").value=stay.reflection||"";

  renderConciergeCare(stay);

  renderWheel(stay.cycle_day_claimed);
  refineWheelLegend();
  renderReflectionMoonMagic(stay);
}

function refineWheelLegend(){
  const label=document.querySelector(".you-are-here");
  if(!label) return;

  label.textContent="YOU ARE HERE";
  if(!document.getElementById("wheelLegendHelper")){
    const helper=document.createElement("p");
    helper.id="wheelLegendHelper";
    helper.className="wheel-legend-helper";
    helper.textContent="Click on a day to see your previous visits below.";
    label.insertAdjacentElement("afterend",helper);
  }
}


function renderReflectionMoonMagic(stay){
  const reflectionInput=document.getElementById("reflectionInput");
  if(!reflectionInput) return;

  const legacyMoonCard=document.querySelector(".moon-card");
  if(legacyMoonCard){
    legacyMoonCard.setAttribute("aria-hidden","true");
  }

  let moonRow=document.getElementById("reflectionMoonMagic");
  if(!moonRow){
    moonRow=document.createElement("div");
    moonRow.id="reflectionMoonMagic";
    moonRow.className="reflection-moon-magic";
    reflectionInput.insertAdjacentElement("beforebegin",moonRow);
  }

  const phase=stay?.moon_phase || "Moon phase";
  const moonDay=stay?.moon_day ? `Day ${stay.moon_day}` : "Moon day";
  const theme=stay?.moon_theme || "A quiet reflection field for today's moon.";

  moonRow.innerHTML=`
    <span class="reflection-moon-label">Moon Magic</span>
    <strong>${escapeHtml(phase)} · ${escapeHtml(moonDay)}</strong>
    <small>${escapeHtml(theme)}</small>
  `;
}

function hasTurndownRequest(stay){
  return !!(stay?.turndown_requested_at || stay?.turndown_status==="requested" || sessionStorage.getItem(`flowtel:turndown:${stay?.id}`)==="requested");
}

function renderConciergeCare(stay){
  const witnessNote=document.getElementById("witnessNote");
  const witnessText=document.getElementById("witnessText");
  if(!witnessNote||!witnessText) return;

  witnessNote.classList.toggle("quiet",!stay?.witness_note && !hasTurndownRequest(stay));

  if(stay?.witness_note){
    witnessNote.classList.add("concierge-fulfilled");
    witnessText.innerHTML=`
      <strong>🌹 Your Concierge stopped by today.</strong>
      <span>✨ A note has been left in your room.</span>
      <button type="button" class="secondary read-note-button" id="readConciergeNoteButton">Read Note →</button>
      <p class="concierge-note-text hidden" id="conciergeNoteText">${escapeHtml(stay.witness_note)}</p>
    `;
    const readButton=document.getElementById("readConciergeNoteButton");
    const noteText=document.getElementById("conciergeNoteText");
    if(readButton&&noteText){
      readButton.addEventListener("click",()=>{
        noteText.classList.remove("hidden");
        readButton.classList.add("hidden");
      });
    }
    return;
  }

  if(hasTurndownRequest(stay)){
    witnessText.innerHTML=`
      <strong>🌙 Turndown Service Requested</strong>
      <span>A concierge has been notified.</span>
    `;
    return;
  }

  witnessText.innerHTML=`
    <strong>Your Concierge is available.</strong>
    <span>Need a little extra care today?</span>
    <button type="button" id="requestTurndownButton">🌙 Request Turndown Service</button>
    <small>A concierge will be notified that you've requested a little extra love today.</small>
  `;

  const button=document.getElementById("requestTurndownButton");
  if(button){
    button.addEventListener("click",()=>handleTurndownRequest(stay));
  }
}

function escapeHtml(value){
  return String(value||"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

async function handleTurndownRequest(stay){
  if(!stay?.id) return;

  const button=document.getElementById("requestTurndownButton");
  if(button) button.disabled=true;

  try{
    const { requestTurndownService } = await import("../shared/turndown.js");
    const updatedStay=await requestTurndownService(stay.id);
    currentStay={...stay,...updatedStay,turndown_requested_at:updatedStay?.turndown_requested_at||new Date().toISOString(),turndown_status:updatedStay?.turndown_status||"requested"};
  }catch(error){
    console.warn("Turndown request could not be saved through Supabase yet; keeping local request state.",error);
    sessionStorage.setItem(`flowtel:turndown:${stay.id}`,"requested");
    currentStay={...stay,turndown_requested_at:new Date().toISOString(),turndown_status:"requested"};
  }

  cacheSuiteStay(currentStay);
  renderConciergeCare(currentStay);
}

async function handleSignIn(){
  try{
    setMessage("Opening your Flowtel Passport...");

    const email=document.getElementById("email").value.trim();
    const password=document.getElementById("password").value;

    if(!email||!password){
      setMessage("Add your email and password.");
      return;
    }

    await signInWithEmail(email,password);

    currentProfile=await getCurrentProfile();
    if(!currentProfile) currentProfile=await ensureProfile({});

    setMessage("");

    if(shouldOpenSuiteFromConcierge() && restoreSuiteFromConcierge()){
      sessionStorage.removeItem("flowtel:openSuiteFromConcierge");
      return;
    }

    showCheckIn();
  }catch(error){
    setMessage("Your Passport could not be opened. Please check your email and password or message Maddie.");
    console.error(error);
  }
}

function readArrivalFields(){
  const cycleDay=Number(document.getElementById("cycleDay").value);
  const feelsLike=document.getElementById("feelsLike").value;

  if(!(cycleDay>=1&&cycleDay<=40)){
    setMessage("Enter a cycle day between 1 and 40.");
    return null;
  }

  if(!feelsLike){
    setMessage("Choose what today feels like.");
    return null;
  }

  return {cycleDay,feelsLike};
}

function cacheSuiteStay(stay){
  try{
    sessionStorage.setItem("flowtel:lastSuiteStay",JSON.stringify(stay));
  }catch(error){
    console.warn("Suite stay could not be cached for Concierge handoff.",error);
  }
}

function getCachedSuiteStay(){
  try{
    const cached=sessionStorage.getItem("flowtel:lastSuiteStay");
    return cached?JSON.parse(cached):null;
  }catch(error){
    console.warn("Cached Suite stay could not be read.",error);
    return null;
  }
}

function shouldOpenSuiteFromConcierge(){
  const params=new URLSearchParams(window.location.search);
  return params.get("suite")==="1" || sessionStorage.getItem("flowtel:openSuiteFromConcierge")==="true";
}

function restoreSuiteFromConcierge(){
  const stay=getCachedSuiteStay();
  if(!stay) return false;

  currentStay=stay;
  pendingArrivalStay=stay;
  renderSuite(stay);
  showScene("suite");
  return true;
}

async function ensureArrivalStay(){
  if(currentStay) return currentStay;
  if(pendingArrivalStay) return pendingArrivalStay;

  const arrival=readArrivalFields();
  if(!arrival) return null;

  pendingArrivalStay=await createStay(arrival);
  currentStay=pendingArrivalStay;
  cacheSuiteStay(currentStay);
  return currentStay;
}

async function handleCheckIn(){
  try{
    setMessage("");
    showScene("preparing");

    const stay=await ensureArrivalStay();
    if(!stay){
      showScene("lobby");
      return;
    }

    setTimeout(()=>{
      renderKey(stay);
      showScene("key");

      setTimeout(()=>{
        renderSuite(stay);
        showScene("suite");
      },950);
    },650);
  }catch(error){
    showScene("lobby");
    setMessage("Your room key could not be prepared. Please try again or message Maddie.");
    console.error(error);
  }
}

async function handleSaveReflection(){
  if(!currentStay) return;

  currentStay=await saveReflection(currentStay.id,document.getElementById("reflectionInput").value);
  document.getElementById("reflectionInput").value="";
  document.getElementById("reflectionMessage").textContent="Reflection saved.";
}

async function handleCheckout(){
  if(!currentStay) return;

  currentStay=await closeStayPersonally(currentStay.id,document.getElementById("checkoutInput").value);
  document.getElementById("checkoutMessage").textContent="You have personally checked out of today's stay.";
  renderLoungeVisits();
}

function openGuestFields(){
  guestCheckinFields.classList.remove("hidden");
  document.getElementById("arrivalChoice").classList.add("is-open");
}

async function handleClockIn(){
  if(!canClockIn(currentProfile)){
    setMessage("Clocking into the Flowtel is reserved for practitioners and the internal team.");
    return;
  }

  try{
    setMessage("");
    const stay=await ensureArrivalStay();
    if(!stay) return;

    cacheSuiteStay(stay);
    sessionStorage.setItem("flowtel:clockInStayId",stay.id);
    sessionStorage.setItem("flowtel:clockInAt",new Date().toISOString());
    window.location.href="../manager/";
  }catch(error){
    setMessage("The Concierge Desk could not receive your clock-in. Please try again or message Maddie.");
    console.error(error);
  }
}

function ensureLoungeClockInButton(){
  if(!canClockIn(currentProfile)||!loungeScene) return;
  if(document.getElementById("loungeClockInButton")) return;

  const button=document.createElement("button");
  button.id="loungeClockInButton";
  button.type="button";
  button.className="secondary lounge-clockin-button";
  button.textContent="Clock Into the Flowtel";
  button.addEventListener("click",handleClockIn);

  const target=loungeScene.querySelector(".suite-actions")||loungeScene.querySelector(".video-lounge-card")||loungeScene;
  target.appendChild(button);
}

document.getElementById("signInButton").addEventListener("click",handleSignIn);
document.getElementById("guestModeButton").addEventListener("click",openGuestFields);
document.getElementById("clockInButton").addEventListener("click",handleClockIn);
document.getElementById("checkInButton").addEventListener("click",handleCheckIn);
document.getElementById("saveReflectionButton").addEventListener("click",handleSaveReflection);
document.getElementById("checkoutButton").addEventListener("click",handleCheckout);
document.getElementById("returnLobbyButton").addEventListener("click",()=>showScene("lobby"));
document.getElementById("flowtelLoungeButton").addEventListener("click",()=>showScene("lounge"));
document.getElementById("backToSuiteButton").addEventListener("click",()=>showScene("suite"));
document.getElementById("closeVisitsButton").addEventListener("click",()=>document.getElementById("visitsDrawer").classList.add("hidden"));
