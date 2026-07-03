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
  const radius=42;

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
    <div class="wheel-compass-ring" aria-hidden="true"></div>
    <div class="wheel-axis wheel-axis-vertical" aria-hidden="true"></div>
    <div class="wheel-axis wheel-axis-horizontal" aria-hidden="true"></div>

    <span class="wheel-cardinal wheel-cardinal-north">NORTH</span>
    <span class="wheel-cardinal wheel-cardinal-east">EAST</span>
    <span class="wheel-cardinal wheel-cardinal-south">SOUTH</span>
    <span class="wheel-cardinal wheel-cardinal-west">WEST</span>

    <span class="wheel-season wheel-season-autumn"><em>🍁</em>Inner Autumn<small>Days 20–26</small></span>
    <span class="wheel-season wheel-season-summer"><em>☀</em>Inner Summer<small>Days 12–19</small></span>
    <span class="wheel-season wheel-season-spring"><em>🌸</em>Inner Spring<small>Days 6–11</small></span>
    <span class="wheel-season wheel-season-winter"><em>❄</em>Inner Winter<small>Days 27–5</small></span>

    <div class="wheel-gold-compass" aria-hidden="true">
      <svg class="rose-compass-svg" viewBox="0 0 200 200" role="img" aria-label="Gold rose compass">
        <defs>
          <linearGradient id="flowtelCompassGold" x1="35" y1="20" x2="165" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f8e7b4"/>
            <stop offset="0.36" stop-color="#d8a84f"/>
            <stop offset="0.68" stop-color="#b98229"/>
            <stop offset="1" stop-color="#f2d184"/>
          </linearGradient>
          <radialGradient id="flowtelCompassGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0" stop-color="#fff8e8" stop-opacity=".95"/>
            <stop offset="1" stop-color="#d8a84f" stop-opacity=".08"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="55" fill="url(#flowtelCompassGlow)" opacity=".62"/>
        <g class="compass-points" fill="url(#flowtelCompassGold)" opacity=".92">
          <path d="M100 10 L111 91 L100 82 L89 91 Z"/>
          <path d="M100 190 L89 109 L100 118 L111 109 Z"/>
          <path d="M190 100 L109 111 L118 100 L109 89 Z"/>
          <path d="M10 100 L91 89 L82 100 L91 111 Z"/>
          <path d="M164 36 L116 89 L119 76 Z" opacity=".58"/>
          <path d="M36 36 L81 76 L84 89 Z" opacity=".58"/>
          <path d="M164 164 L119 124 L116 111 Z" opacity=".58"/>
          <path d="M36 164 L84 111 L81 124 Z" opacity=".58"/>
        </g>
        <g class="rose-lines" fill="none" stroke="url(#flowtelCompassGold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M102 101c13-12 4-33-15-29-18 4-25 27-8 40 18 14 48 2 49-25" opacity=".86"/>
          <path d="M100 100c-13 7-14 25 0 32 17 8 37-5 35-25-3-28-39-37-57-13" opacity=".74"/>
          <path d="M99 100c8 11 25 10 31-2 8-15-5-33-23-31-24 2-34 31-16 48" opacity=".66"/>
          <path d="M100 100c-7-6-18-3-21 5-5 12 5 25 19 24 18-2 25-24 13-37" opacity=".58"/>
        </g>
        <g class="rose-petals" fill="none" stroke="url(#flowtelCompassGold)" stroke-width="2.2" opacity=".72">
          <ellipse cx="100" cy="82" rx="18" ry="9"/>
          <ellipse cx="118" cy="100" rx="18" ry="9" transform="rotate(90 118 100)"/>
          <ellipse cx="100" cy="118" rx="18" ry="9"/>
          <ellipse cx="82" cy="100" rx="18" ry="9" transform="rotate(90 82 100)"/>
          <ellipse cx="113" cy="87" rx="15" ry="7" transform="rotate(45 113 87)"/>
          <ellipse cx="87" cy="87" rx="15" ry="7" transform="rotate(-45 87 87)"/>
          <ellipse cx="113" cy="113" rx="15" ry="7" transform="rotate(-45 113 113)"/>
          <ellipse cx="87" cy="113" rx="15" ry="7" transform="rotate(45 87 113)"/>
        </g>
        <circle cx="100" cy="100" r="3.5" fill="url(#flowtelCompassGold)"/>
      </svg>
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
