import { signInWithEmail, signUpWithEmail, signOut } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js";
import { createStay, getTodayStayForClient, saveReflection, closeStayPersonally, clockInPractitioner, getPreviousVisits, getDayContent } from "../shared/flowtel.js";
import { membershipFromUrl, labelForMembership, normalizeMembership } from "../shared/membership.js";

const lobbyScene=document.getElementById("lobbyScene");
const keyScene=document.getElementById("keyScene");
const preparingScene=document.getElementById("preparingScene");
const suiteScene=document.getElementById("suiteScene");
const loungeScene=document.getElementById("loungeScene");
const checkoutCompleteScene=document.getElementById("checkoutCompleteScene");

const authPanel=document.getElementById("authPanel");
const checkinForm=document.getElementById("checkinForm");
const guestCheckinFields=document.getElementById("guestCheckinFields");
const message=document.getElementById("message");
const medicineWheel=document.getElementById("medicineWheel");

let currentProfile=null;
let currentStay=null;

const SQUARESPACE_MEMBERSHIP = membershipFromUrl();
const FLOWTEL_BRIDGE_PASSWORD = "FlowtelMemberBridge!2026";

function urlParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function extractSquarespaceEmail(){
  const explicit = urlParam("email") || urlParam("memberEmail");
  if(explicit) return explicit.trim();

  try{
    const cached = localStorage.getItem("flowtel:memberEmail");
    if(cached) return cached.trim();
  }catch(error){}

  // Best-effort hooks for future Squarespace code injection.
  const candidates = [
    window.FlowtelMember?.email,
    window.Squarespace?.Member?.email,
    window.Static?.SQUARESPACE_CONTEXT?.authenticatedAccount?.email,
    window.Static?.SQUARESPACE_CONTEXT?.member?.email,
  ];

  return (candidates.find(Boolean) || "").trim();
}

function firstNameFromEmail(email){
  const local=String(email||"").split("@")[0] || "guest";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part=>part.charAt(0).toUpperCase()+part.slice(1))
    .join(" ") || "Guest";
}

function updateDoorwayCopy(){
  const title=document.getElementById("doorwayTitle");
  const note=document.getElementById("doorwayNote");
  const memberEmail=document.getElementById("memberEmail");

  if(title){
    title.textContent = SQUARESPACE_MEMBERSHIP
      ? `${labelForMembership(SQUARESPACE_MEMBERSHIP)} Entrance`
      : "Flowtel Entrance";
  }

  if(note){
    note.textContent = SQUARESPACE_MEMBERSHIP
      ? `You entered through the ${labelForMembership(SQUARESPACE_MEMBERSHIP)} doorway.`
      : "Enter through your protected Idyll Collective member doorway.";
  }

  const detectedEmail=extractSquarespaceEmail();
  if(memberEmail && detectedEmail) memberEmail.value=detectedEmail;
}

async function openMemberBridge(){
  const emailInput=document.getElementById("memberEmail");
  const email=(emailInput?.value || extractSquarespaceEmail()).trim().toLowerCase();

  if(!email){
    setMessage("Add the email you use for your Idyll Collective membership.");
    return;
  }

  try{
    setMessage("Preparing your Flowtel room...");
    try{ localStorage.setItem("flowtel:memberEmail",email); }catch(error){}

    await signOut();

    try{
      await signInWithEmail(email,FLOWTEL_BRIDGE_PASSWORD);
    }catch(signInError){
      await signUpWithEmail(email,FLOWTEL_BRIDGE_PASSWORD);
      await signInWithEmail(email,FLOWTEL_BRIDGE_PASSWORD);
    }

    currentProfile=await ensureProfile({
      firstName:firstNameFromEmail(email),
      membershipType:SQUARESPACE_MEMBERSHIP || "queendom",
      squarespaceSource:SQUARESPACE_MEMBERSHIP || "unknown",
    });

    setMessage("");

    if(shouldOpenSuiteFromConcierge() && restoreSuiteFromConcierge()){
      sessionStorage.removeItem("flowtel:openSuiteFromConcierge");
      return;
    }

    if(await openTodaySuiteIfPresent()){
      return;
    }

    showCheckIn();
  }catch(error){
    console.error(error);
    setMessage("The Squarespace bridge could not open Flowtel yet. Use Developer login or message Maddie.");
  }
}


const BETA_PASSWORD="FlowtelBeta!2026";
const BETA_ACCOUNTS=[
  {label:"Practitioner 1 · Inner Winter",email:"flowtel.practitioner1@test.local",firstName:"Priya",lastName:"Winter",role:"practitioner",cycleDay:2,feelsLike:"Inner Winter"},
  {label:"Practitioner 2 · Inner Spring",email:"flowtel.practitioner2@test.local",firstName:"Sage",lastName:"Spring",role:"practitioner",cycleDay:8,feelsLike:"Inner Spring"},
  {label:"Practitioner 3 · Inner Summer",email:"flowtel.practitioner3@test.local",firstName:"Sol",lastName:"Summer",role:"practitioner",cycleDay:18,feelsLike:"Inner Summer"},
  {label:"Practitioner 4 · Inner Autumn",email:"flowtel.practitioner4@test.local",firstName:"Amina",lastName:"Autumn",role:"practitioner",cycleDay:23,feelsLike:"Inner Autumn"},
  {label:"Guest 1 · Winter",email:"flowtel.guest1@test.local",firstName:"Wren",lastName:"West",role:"client",cycleDay:3,feelsLike:"Inner Winter"},
  {label:"Guest 2 · Spring",email:"flowtel.guest2@test.local",firstName:"Lila",lastName:"South",role:"client",cycleDay:9,feelsLike:"Inner Spring"},
  {label:"Guest 3 · Summer",email:"flowtel.guest3@test.local",firstName:"Maya",lastName:"East",role:"client",cycleDay:16,feelsLike:"Inner Summer"},
  {label:"Guest 4 · Autumn",email:"flowtel.guest4@test.local",firstName:"Noor",lastName:"North",role:"client",cycleDay:24,feelsLike:"Inner Autumn"},
];

let pendingArrivalStay=null;

function refineLobbyCopy(){
  document.querySelectorAll("h1,h2,p,button").forEach(el=>{
    const text=(el.textContent||"").trim();
    if(text==="WELCOME HOME") el.textContent="WELCOME HOME TO";
    if(text==="to the Flowtel") el.textContent="the Flowtel";
  });
}

refineLobbyCopy();
updateDoorwayCopy();

function setMessage(text){ message.textContent=text||""; }

function setProgress(step){
  document.querySelectorAll(".progress-ribbon span").forEach((item,index)=>item.classList.toggle("active",index<step));
}

function showScene(name){
  [lobbyScene,keyScene,preparingScene,suiteScene,loungeScene,checkoutCompleteScene].filter(Boolean).forEach(scene=>scene.classList.remove("active"));
  if(name==="lobby"){lobbyScene.classList.add("active");setProgress(1);}
  if(name==="key"){keyScene.classList.add("active");setProgress(2);}
  if(name==="preparing"){preparingScene.classList.add("active");setProgress(2);}
  if(name==="suite"){suiteScene.classList.add("active");setProgress(3);}
  if(name==="lounge"){loungeScene.classList.add("active");setProgress(3);renderLoungeVisits();ensureLoungeClockInButton();window.scrollTo({top:0,behavior:"smooth"});}
  if(name==="checkoutComplete"&&checkoutCompleteScene){checkoutCompleteScene.classList.add("active");setProgress(3);}
}

function canClockIn(profile){
  return ["practitioner","owner","admin"].includes(profile?.role);
}

function showCheckIn(){
  authPanel.classList.add("hidden");
  checkinForm.classList.remove("hidden");

  const name=currentProfile?.first_name||"guest";
  document.getElementById("welcomeLine").textContent=`Welcome back, ${name}.`;

  // Guests enter cycle data first, then choose whether they are checking in or clocking in.
  openGuestFields();

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
const WHEEL_DAY_RADIUS = 31;
const WHEEL_DAY_SIZE = 34;
const WHEEL_RING_GAP = 12;

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
  const radius=WHEEL_DAY_RADIUS;

  return {
    x:50 + radius*Math.cos(angle),
    y:50 - radius*Math.sin(angle),
  };
}

function renderWheel(activeRoom){
  const rooms=Array.from({length:28},(_,i)=>i+1);
  const activeNormalizedRoom=normalizedRoom(activeRoom);
  const activePosition=wheelPosition(activeNormalizedRoom);

  medicineWheel.style.setProperty("--day-radius", `${WHEEL_DAY_RADIUS}%`);
  medicineWheel.style.setProperty("--ring-base", `${WHEEL_DAY_RADIUS * 2}%`);
  medicineWheel.style.setProperty("--day-size", `${WHEEL_DAY_SIZE}px`);
  medicineWheel.style.setProperty("--ring-offset", `${WHEEL_DAY_SIZE + (WHEEL_RING_GAP * 2)}px`);

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

  <img
    class="rose-compass-center"
    src="../assets/rose_compass_center.png"
    alt=""
    aria-hidden="true"
  />

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
    : visits.map(visit=>{
        const reflections=(visit.reflections&&visit.reflections.length)
          ? visit.reflections.map(entry=>`
              <p class="visit-reflection">
                <small>${formatDate(entry.created_at)}</small><br />
                ${escapeHtml(entry.reflection)}
              </p>
            `).join("")
          : visit.reflection
            ? `<p class="visit-reflection">${escapeHtml(visit.reflection)}</p>`
            : "";

        return `
          <article class="visit-card">
            <strong>${formatDate(visit.checkin_date)} → ${formatDate(visit.checked_out_at)}</strong>
            <p>${visit.stay_length_days||1} day stay</p>
            <p>${endTypeLabel(visit.stay_end_type)}</p>
            ${reflections || "<p>No reflections saved for this visit yet.</p>"}
          </article>
        `;
      }).join("");

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


function fillArrivalFields(account){
  const cycleDayInput=document.getElementById("cycleDay");
  const feelsLikeInput=document.getElementById("feelsLike");
  if(cycleDayInput) cycleDayInput.value=account.cycleDay||"";
  if(feelsLikeInput) feelsLikeInput.value=account.feelsLike||"";
}

function renderBetaLoginPanel(){
  const panel=document.getElementById("betaLoginPanel");
  if(!panel) return;

  panel.innerHTML=BETA_ACCOUNTS.map(account=>`
    <button
      type="button"
      class="beta-login-button ${account.role==="practitioner"?"beta-practitioner":"beta-guest"}"
      data-beta-email="${account.email}"
    >
      ${account.label}
    </button>
  `).join("");

  panel.querySelectorAll("[data-beta-email]").forEach(button=>{
    button.addEventListener("click",()=>handleBetaLogin(button.dataset.betaEmail));
  });
}

async function handleBetaLogin(email){
  const account=BETA_ACCOUNTS.find(item=>item.email===email);
  if(!account) return;

  try{
    setMessage(`Opening beta account for ${account.firstName}...`);
    await signOut();

    try{
      await signInWithEmail(account.email,BETA_PASSWORD);
    }catch(signInError){
      await signUpWithEmail(account.email,BETA_PASSWORD);
      await signInWithEmail(account.email,BETA_PASSWORD);
    }

    currentProfile=await ensureProfile({
      firstName:account.firstName,
      lastName:account.lastName,
      role:account.role,
      forceBetaRole:true,
    });

    fillArrivalFields(account);
    setMessage("");

    if(await openTodaySuiteIfPresent()){
      return;
    }

    showCheckIn();
  }catch(error){
    setMessage("This beta account could not open. If email confirmation is enabled in Supabase, create the beta auth users manually first.");
    console.error(error);
  }
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

    if(await openTodaySuiteIfPresent()){
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

async function openTodaySuiteIfPresent(){
  if(!currentProfile?.id) return false;

  const params=new URLSearchParams(window.location.search);
  if(params.get("forceCheckin")==="1") return false;

  const stay=await getTodayStayForClient(currentProfile.id);
  if(!stay) return false;

  currentStay=stay;
  pendingArrivalStay=stay;
  cacheSuiteStay(stay);
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

  const input=document.getElementById("reflectionInput");
  const message=document.getElementById("reflectionMessage");
  const value=input.value.trim();

  if(!value){
    if(message) message.textContent="Write a reflection before saving.";
    return;
  }

  try{
    const saveButton=document.getElementById("saveReflectionButton");
    if(saveButton) saveButton.disabled=true;

    currentStay=await saveReflection(currentStay.id,value);
    cacheSuiteStay(currentStay);
    input.value="";
    if(message) message.textContent="Reflection saved.";

    // Refresh open previous-visit drawer if the current room is being viewed.
    const drawer=document.getElementById("visitsDrawer");
    if(drawer && !drawer.classList.contains("hidden")){
      await openVisitsForRoom(currentStay.cycle_day_claimed);
    }
  }catch(error){
    console.error(error);
    if(message) message.textContent="Reflection could not be saved. Please try again.";
  }finally{
    const saveButton=document.getElementById("saveReflectionButton");
    if(saveButton) saveButton.disabled=false;
  }
}

async function handleCheckout(){
  if(!currentStay) return;

  try{
    currentStay=await closeStayPersonally(currentStay.id,document.getElementById("checkoutInput").value);
    document.getElementById("checkoutMessage").textContent="You have personally checked out of today's stay.";
    renderLoungeVisits();

    const closeScene=document.getElementById("checkoutCompleteScene");
    if(closeScene){
      showScene("checkoutComplete");
      window.scrollTo({top:0,behavior:"smooth"});
    }
  }catch(error){
    console.error(error);
    document.getElementById("checkoutMessage").textContent="Checkout could not be completed. Please try again.";
  }
}

function openGuestFields(){
  guestCheckinFields.classList.remove("hidden");
  const arrivalChoice=document.getElementById("arrivalChoice");
  if(arrivalChoice) arrivalChoice.classList.add("is-open");
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

    try{
      const session=await clockInPractitioner(stay);
      if(session?.id) sessionStorage.setItem("flowtel:clockSessionId",session.id);
    }catch(clockError){
      console.warn("Clock-in session could not be saved yet. Run the 0.5.2 migration to enable persistent clock tracking.",clockError);
    }

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

renderBetaLoginPanel();

const memberBridgeButton=document.getElementById("memberBridgeButton");
if(memberBridgeButton) memberBridgeButton.addEventListener("click",openMemberBridge);
document.getElementById("signInButton").addEventListener("click",handleSignIn);
const guestModeButton=document.getElementById("guestModeButton");
if(guestModeButton) guestModeButton.addEventListener("click",openGuestFields);
document.getElementById("clockInButton").addEventListener("click",handleClockIn);
document.getElementById("checkInButton").addEventListener("click",handleCheckIn);
document.getElementById("saveReflectionButton").addEventListener("click",handleSaveReflection);
document.getElementById("checkoutButton").addEventListener("click",handleCheckout);
document.getElementById("returnLobbyButton").addEventListener("click",()=>showScene("lobby"));
document.getElementById("flowtelLoungeButton").addEventListener("click",()=>showScene("lounge"));
document.getElementById("backToSuiteButton").addEventListener("click",()=>showScene("suite"));
const checkoutReturnButton=document.getElementById("checkoutReturnButton");
if(checkoutReturnButton) checkoutReturnButton.addEventListener("click",()=>showScene("lobby"));
document.getElementById("closeVisitsButton").addEventListener("click",()=>document.getElementById("visitsDrawer").classList.add("hidden"));


// Auto-enter is opt-in for later Squarespace code injection.
// Example: /client/?membership=flowfm&email=member@example.com&auto=1
if((urlParam("auto")==="1" || urlParam("bridge")==="1") && extractSquarespaceEmail()){
  openMemberBridge();
}
