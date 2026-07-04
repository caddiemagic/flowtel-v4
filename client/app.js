import { signInWithEmail, signUpWithEmail, signOut } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js";
import { createStay, getTodayStayForClient, autoCloseOpenStayIfNeeded, saveReflection, closeStayPersonally, clockInPractitioner, getPreviousVisits, markConciergeNotesRead, getDayContent, getMoonMagic, listPractitioners, getMyPractitionerRelationship, requestPractitionerConnection } from "../shared/flowtel.js";
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

function memberBridgeEmail(){
  const emailInput=document.getElementById("memberEmail");
  return (emailInput?.value || extractSquarespaceEmail() || "").trim().toLowerCase();
}

async function completeMemberBridgeEntrance(email){
  currentProfile=await ensureProfile({
    firstName:firstNameFromEmail(email),
    membershipType:SQUARESPACE_MEMBERSHIP || "queendom",
    squarespaceSource:SQUARESPACE_MEMBERSHIP || "unknown",
  });

  setMessage("");
  await prepareDailyStayState();

  if(shouldOpenSuiteFromConcierge() && restoreSuiteFromConcierge()){
    sessionStorage.removeItem("flowtel:openSuiteFromConcierge");
    return;
  }

  if(await openTodaySuiteIfPresent()){
    return;
  }

  clearCachedSuiteStay();
  currentStay=null;
  pendingArrivalStay=null;
  showCheckIn();
}

function isAlreadyRegisteredError(error){
  const message=String(error?.message || "").toLowerCase();
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}

function isInvalidCredentialsError(error){
  const message=String(error?.message || "").toLowerCase();
  return message.includes("invalid login") || message.includes("invalid credentials");
}

async function enterWithBridgePassword(email){
  await signOut();
  await signInWithEmail(email,FLOWTEL_BRIDGE_PASSWORD);
  await completeMemberBridgeEntrance(email);
}

async function createNewMemberBridge(){
  const email=memberBridgeEmail();

  if(!email){
    setMessage("Add the email you use for your Idyll Collective membership.");
    return;
  }

  try{
    setMessage("Preparing your Flowtel profile...");
    try{ localStorage.setItem("flowtel:memberEmail",email); }catch(error){}

    await signOut();
    await signUpWithEmail(email,FLOWTEL_BRIDGE_PASSWORD);
    await signInWithEmail(email,FLOWTEL_BRIDGE_PASSWORD);
    await completeMemberBridgeEntrance(email);
  }catch(error){
    console.error("Flowtel New Member Bridge Error:", error);

    if(isAlreadyRegisteredError(error)){
      try{
        setMessage("This email already has a Flowtel room. Opening it through your member doorway...");
        await enterWithBridgePassword(email);
        return;
      }catch(signInError){
        console.error("Existing bridge account could not be opened with the bridge password:", signInError);
        if(isInvalidCredentialsError(signInError)){
          setMessage("This email already has a Flowtel room with a custom password. Choose “I've Stayed Before” and enter that password.");
          openReturningMemberLogin(false);
          return;
        }

        setMessage(`Returning Member Error: ${signInError?.message || "Unknown error"}`);
        return;
      }
    }

    setMessage(`Bridge Error: ${error?.message || "Unknown error"}`);
  }
}

async function openReturningMemberBridge(){
  const email=memberBridgeEmail();

  if(!email){
    setMessage("Add the email you use for your Idyll Collective membership.");
    return;
  }

  try{
    setMessage("Welcome back. Opening your Flowtel room...");
    try{ localStorage.setItem("flowtel:memberEmail",email); }catch(error){}
    await enterWithBridgePassword(email);
  }catch(error){
    console.error("Flowtel Returning Member Bridge Error:", error);

    if(isInvalidCredentialsError(error)){
      setMessage("This Flowtel room uses a custom password. Enter your Flowtel password below, then choose Enter the Flowtel.");
      openReturningMemberLogin(false);
      return;
    }

    setMessage(`Returning Member Error: ${error?.message || "Unknown error"}`);
  }
}

function openReturningMemberLogin(showMessage=true){
  const email=memberBridgeEmail();
  const devLoginCard=document.getElementById("devLoginCard");
  const emailField=document.getElementById("email");

  if(emailField && email) emailField.value=email;
  if(devLoginCard) devLoginCard.open=true;

  if(showMessage){
    setMessage("Welcome back. Enter your Flowtel password, then choose Enter the Flowtel.");
  }

  setTimeout(()=>document.getElementById("password")?.focus(),100);
}

async function openMemberBridge(){
  // Kept for future Squarespace auto-bridge support. During beta, auto-bridge creates a new temporary profile only when explicitly requested with ?auto=1 or ?bridge=1.
  await createNewMemberBridge();
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

const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

function flowtelDateParts(date = new Date()){
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLOWTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((acc, part) => {
    if(part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return parts;
}

function localTodayISO(){
  const parts = flowtelDateParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function flowtelDateTimeLabel(date = new Date()){
  return new Intl.DateTimeFormat(undefined, {
    timeZone: FLOWTEL_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

function isStayForLocalToday(stay){
  return !!stay && stay.checkin_date===localTodayISO();
}

function updateFlowtelTimestamp(){
  const label = `Flowtel time: ${flowtelDateTimeLabel()}`;
  document.querySelectorAll("[data-flowtel-clock]").forEach(el => { el.textContent = label; });
}

function clearCachedSuiteStay(){
  try{
    sessionStorage.removeItem("flowtel:lastSuiteStay");
    sessionStorage.removeItem("flowtel:openSuiteFromConcierge");
  }catch(error){}
}

async function prepareDailyStayState(){
  if(!currentProfile?.id) return;
  try{
    const closed = await autoCloseOpenStayIfNeeded(currentProfile.id);
    if(closed && !isStayForLocalToday(closed)){
      clearCachedSuiteStay();
      currentStay=null;
      pendingArrivalStay=null;
    }
  }catch(error){
    console.warn("Daily stay lifecycle check failed.",error);
  }
}


function setProgress(step){
  document.querySelectorAll(".progress-ribbon span").forEach((item,index)=>item.classList.toggle("active",index<step));
}

function showScene(name){
  updateFlowtelTimestamp();
  [lobbyScene,keyScene,preparingScene,suiteScene,loungeScene,checkoutCompleteScene].filter(Boolean).forEach(scene=>scene.classList.remove("active"));
  if(name==="lobby"){lobbyScene.classList.add("active");setProgress(1);}
  if(name==="key"){keyScene.classList.add("active");setProgress(2);}
  if(name==="preparing"){preparingScene.classList.add("active");setProgress(2);}
  if(name==="suite"){suiteScene.classList.add("active");setProgress(3);}
  if(name==="lounge"){loungeScene.classList.add("active");setProgress(3);renderLoungeVisits();renderLoungeCheckoutState();ensureLoungeClockInButton();window.scrollTo({top:0,behavior:"smooth"});}
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

function wheelPositionAtRadius(day, radius){
  const room=normalizedRoom(day);
  const step=360/28;

  // Day 1 sits just below WEST and Day 28+ sits just above WEST.
  // All markers are equally spaced with the normal 1/28 circle gap.
  const startAngle=180 + (step/2);
  const angleDeg=startAngle + ((room-1)*step);
  const angle=angleDeg*Math.PI/180;

  return {
    x:50 + radius*Math.cos(angle),
    y:50 - radius*Math.sin(angle),
  };
}

function wheelPosition(day){
  return wheelPositionAtRadius(day, WHEEL_DAY_RADIUS);
}

function wheelStarPosition(day){
  // The star rides on the outer gold ring instead of floating above the day bubble.
  return wheelPositionAtRadius(day, WHEEL_DAY_RADIUS + 5.4);
}

function renderWheel(activeRoom){
  const rooms=Array.from({length:28},(_,i)=>i+1);
  const activeNormalizedRoom=normalizedRoom(activeRoom);
  const activePosition=wheelPosition(activeNormalizedRoom);
  const starPosition=wheelStarPosition(activeNormalizedRoom);

  medicineWheel.style.setProperty("--day-radius", `${WHEEL_DAY_RADIUS}%`);
  medicineWheel.style.setProperty("--ring-base", `${WHEEL_DAY_RADIUS * 2}%`);
  medicineWheel.style.setProperty("--day-size", `${WHEEL_DAY_SIZE}px`);
  medicineWheel.style.setProperty("--ring-offset", `${WHEEL_DAY_SIZE + (WHEEL_RING_GAP * 2)}px`);

  medicineWheel.innerHTML = `
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

  <span class="wheel-star-marker" style="--star-x:${starPosition.x}%;--star-y:${starPosition.y}%;" aria-hidden="true">✦</span>

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


function renderLoungeCheckoutState(){
  const loungeSceneEl=document.getElementById("loungeScene");
  if(loungeSceneEl && !document.getElementById("loungeFlowtelDate")){
    const dateLine=document.createElement("p");
    dateLine.id="loungeFlowtelDate";
    dateLine.className="suite-flowtel-date lounge-flowtel-date";
    dateLine.setAttribute("data-flowtel-clock","");
    const subline=loungeSceneEl.querySelector(".suite-subline");
    if(subline) subline.insertAdjacentElement("afterend",dateLine);
  }
  updateFlowtelTimestamp();

  const card=document.getElementById("loungeCheckoutCard");
  const title=document.getElementById("loungeCheckoutTitle");
  const copy=document.getElementById("loungeCheckoutCopy");
  const input=document.getElementById("checkoutInput");
  const button=document.getElementById("checkoutButton");
  const message=document.getElementById("checkoutMessage");
  if(!card||!title||!copy||!input||!button) return;

  const checkedOut=!!currentStay?.checked_out_at || currentStay?.stay_status==="checked_out";
  card.classList.toggle("checked-out",checkedOut);

  if(checkedOut){
    title.textContent="Checked Out";
    copy.textContent=currentStay?.checkout_notes
      ? "Your checkout note is saved with this stay."
      : "This stay has been closed with care.";
    input.classList.add("hidden");
    button.classList.add("hidden");
    if(message){
      message.textContent=currentStay?.checkout_notes ? currentStay.checkout_notes : "";
      message.classList.toggle("checkout-note-saved",!!currentStay?.checkout_notes);
    }
    return;
  }

  title.textContent="Ready to check out?";
  copy.textContent="Leave a note for tomorrow’s concierge.";
  input.classList.remove("hidden");
  button.classList.remove("hidden");
  if(message) message.textContent="";
}

function openCheckoutFromSuite(){
  showScene("lounge");
  setTimeout(()=>{
    const card=document.getElementById("loungeCheckoutCard");
    if(card) card.scrollIntoView({behavior:"smooth",block:"start"});
  },80);
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

  const liveMoon = getMoonMagic();
  document.getElementById("suiteMoon").textContent=`${liveMoon.phase} · Day ${liveMoon.moonDay}`;
  document.getElementById("suiteMoonTheme").textContent=`Last New Moon: ${formatDate(liveMoon.lastNewMoonDate)} · ${liveMoon.theme}`;

  document.getElementById("suiteRoom").textContent=`Room ${room}`;
  document.getElementById("suiteSeason").textContent=`${stay.inner_season||"Inner season"} · feels like ${stay.feels_like_inner_season||"not recorded"}`;
  const dayOne=document.getElementById("suiteDayOne");
  if(dayOne) dayOne.textContent=stay.cycle_start_date ? `Day 1: ${formatDate(stay.cycle_start_date)}` : "";

  const currentRoomCard=document.querySelector(".wheel-current-room");
  if(currentRoomCard && !document.getElementById("suiteFlowtelDate")){
    const dateLine=document.createElement("p");
    dateLine.id="suiteFlowtelDate";
    dateLine.className="suite-flowtel-date";
    dateLine.setAttribute("data-flowtel-clock","");
    currentRoomCard.appendChild(dateLine);
  }
  updateFlowtelTimestamp();

  document.getElementById("roomTitle").textContent=`${content.title} · Room ${room}`;
  document.getElementById("roomAffirmation").textContent=content.affirmation;
  document.getElementById("roomPrompt").textContent=content.prompt;
  document.getElementById("roomQueenMove").textContent=content.queenMove;

  document.getElementById("reflectionInput").value="";

  renderConciergeCare(stay);
  renderPractitionerConnection();

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

  const liveMoon=getMoonMagic();
  const phase=liveMoon.phase;
  const moonDay=`Day ${liveMoon.moonDay}`;
  const theme=`Last New Moon: ${formatDate(liveMoon.lastNewMoonDate)} · ${liveMoon.theme}`;

  moonRow.innerHTML=`
    <span class="reflection-moon-label">Moon Magic</span>
    <strong>${escapeHtml(phase)} · ${escapeHtml(moonDay)}</strong>
    <small>${escapeHtml(theme)}</small>
  `;
}


function requestWakeUpText(stay){
  const key=`flowtel:wakeup:${stay?.id || "today"}`;
  localStorage.setItem(key,"true");
  renderConciergeCare(stay);
}

function hasTurndownRequest(stay){
  return !!(stay?.turndown_requested_at || stay?.turndown_status==="requested" || sessionStorage.getItem(`flowtel:turndown:${stay?.id}`)==="requested");
}


function parseConciergeNotes(stay){
  const raw=stay?.witness_note;
  if(!raw) return [];
  try{
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed)){
      return parsed.map((item,index)=>({
        id:item.id || `${stay.id || "stay"}-${index}`,
        note:item.note || item.text || "",
        by:item.by || item.practitioner || stay.witness_note_by || "your mentor",
        at:item.at || item.created_at || stay.witnessed_at || stay.updated_at,
      })).filter(item=>item.note);
    }
  }catch(error){}
  return [{
    id:`${stay?.id || "stay"}-legacy`,
    note:raw,
    by:stay?.witness_note_by || "your mentor",
    at:stay?.witnessed_at || stay?.updated_at,
  }];
}

function conciergeNotesSignature(notes){
  return notes.map(note=>`${note.id}:${note.at || ""}:${note.note}`).join("|");
}


function renderConciergeCare(stay){
  const witnessNote=document.getElementById("witnessNote");
  const witnessText=document.getElementById("witnessText");
  if(!witnessNote||!witnessText) return;

  witnessNote.classList.toggle("quiet",!stay?.witness_note && !hasTurndownRequest(stay));

  if(stay?.witness_note){
    const notes=parseConciergeNotes(stay);
    const latestNote=notes[notes.length-1];
    const readKey=`flowtel:conciergeNoteRead:${stay.id}`;
    const signature=conciergeNotesSignature(notes);
    const savedSignature=stay.concierge_notes_read_signature || localStorage.getItem(readKey);
    const hasRead=savedSignature===signature;
    witnessNote.classList.add("concierge-fulfilled");
    const latestBy=latestNote?.by || stay.witness_note_by || "your mentor";
    const noteList=notes.map((note,index)=>`
      <article class="concierge-note-entry">
        <span class="concierge-note-by">From ${escapeHtml(note.by || latestBy)}</span>
        ${note.at ? `<small>${formatDate(note.at)}</small>` : ""}
        <p>${escapeHtml(note.note)}</p>
      </article>
    `).join("");

    witnessText.innerHTML=`
      <strong>${hasRead ? "Concierge has cleansed your space." : "You have a new note."}</strong>
      ${hasRead ? "<span>Your love notes are saved in this stay.</span>" : `<span>${notes.length>1 ? `${notes.length} love notes have been left in your room.` : "A love note has been left in your room."}</span>`}
      <button type="button" class="secondary read-note-button ${hasRead ? "hidden" : ""}" id="readConciergeNoteButton">Read Note →</button>
      <div class="concierge-notes-scroll ${hasRead ? "" : "hidden"}" id="conciergeNoteText">${noteList}</div>
      <button type="button" class="secondary read-note-button hidden" id="markConciergeNoteReadButton">Mark as Read</button>
    `;
    const readButton=document.getElementById("readConciergeNoteButton");
    const markButton=document.getElementById("markConciergeNoteReadButton");
    const noteText=document.getElementById("conciergeNoteText");
    if(readButton&&noteText&&markButton){
      readButton.addEventListener("click",()=>{
        noteText.classList.remove("hidden");
        readButton.classList.add("hidden");
        markButton.classList.remove("hidden");
      });
    }
    if(markButton){
      markButton.addEventListener("click",async()=>{
        markButton.disabled=true;
        try{
          const updatedStay=await markConciergeNotesRead(stay.id,signature);
          currentStay={...stay,...updatedStay,concierge_notes_read_signature:signature};
          cacheSuiteStay(currentStay);
        }catch(error){
          console.warn("Concierge note read state could not be saved to Supabase; keeping local read state.",error);
          currentStay={...stay,concierge_notes_read_signature:signature};
        }
        localStorage.setItem(readKey,signature);
        renderConciergeCare(currentStay);
      });
    }
    return;
  }

  if(hasTurndownRequest(stay)){
    witnessText.innerHTML=`
      <strong>Turndown Service Requested</strong>
      <span>A concierge has been notified.</span>
    `;
    return;
  }

  const wakeupKey=`flowtel:wakeup:${stay?.id || "today"}`;
  const wakeupRequested=localStorage.getItem(wakeupKey)==="true";
  witnessText.innerHTML=`
    <strong>Your Concierge is available.</strong>
    <span>Need a little extra care today?</span>
    <button type="button" id="requestTurndownButton">Request Turndown Service</button>
    <small>A concierge will be notified that you've requested a little extra love today.</small>
    <button type="button" class="secondary wakeup-button" id="requestWakeUpTextButton">${wakeupRequested ? "Wake Up Text Requested" : "Request a Wake Up Text"}</button>
    <small>${wakeupRequested ? "Your next-day reminder has been noted for this beta." : "Beta preview: SMS delivery will connect after the texting platform is integrated."}</small>
  `;

  const button=document.getElementById("requestTurndownButton");
  if(button){
    button.addEventListener("click",()=>handleTurndownRequest(stay));
  }
  const wakeupButton=document.getElementById("requestWakeUpTextButton");
  if(wakeupButton&&!wakeupRequested){
    wakeupButton.addEventListener("click",()=>requestWakeUpText(stay));
  }
}


function practitionerDisplayName(profile){
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Practitioner";
}

async function renderPractitionerConnection(){
  const card=document.getElementById("practitionerCard");
  const title=document.getElementById("practitionerCardTitle");
  const text=document.getElementById("practitionerCardText");
  const directory=document.getElementById("practitionerDirectory");
  const button=document.getElementById("choosePractitionerButton");
  const note=document.getElementById("practitionerMessage");

  if(!card||!title||!text||!directory||!button) return;

  directory.classList.add("hidden");
  directory.innerHTML="";
  if(note) note.textContent="";

  try{
    const relationship=await getMyPractitionerRelationship();

    if(relationship?.status==="connected"){
      const name=practitionerDisplayName(relationship.practitioner);
      title.textContent=name;
      text.textContent="You are connected. Your practitioner can view the Flowtel stays you have chosen to share.";
      button.textContent="Connected";
      button.disabled=true;
      return;
    }

    if(relationship?.status==="requested"){
      const name=practitionerDisplayName(relationship.practitioner);
      title.textContent=`Connection requested with ${name}.`;
      text.textContent="Your practitioner will see your request at the Concierge Desk and can choose Connect.";
      button.textContent="Request Sent";
      button.disabled=true;
      return;
    }

    title.textContent="No practitioner connected.";
    text.textContent="Choose a practitioner when you are ready to share your Flowtel stays.";
    button.textContent="Choose Practitioner";
    button.disabled=false;

    button.onclick=async()=>{
      try{
        button.disabled=true;
        if(note) note.textContent="Opening practitioner directory...";
        const practitioners=await listPractitioners();

        if(!practitioners.length){
          directory.classList.remove("hidden");
          directory.innerHTML="<p>No practitioners are available yet.</p>";
          if(note) note.textContent="";
          button.disabled=false;
          return;
        }

        directory.classList.remove("hidden");
        directory.innerHTML=`
          <p class="microcopy">By connecting, you choose to share check-ins, reflections, concierge notes, and previous stays. You can disconnect later.</p>
          ${practitioners.map(practitioner=>`
            <button type="button" class="practitioner-option" data-practitioner-id="${practitioner.id}">
              Connect with ${escapeHtml(practitionerDisplayName(practitioner))}
            </button>
          `).join("")}
        `;

        directory.querySelectorAll("[data-practitioner-id]").forEach(option=>{
          option.addEventListener("click",async()=>{
            option.disabled=true;
            if(note) note.textContent="Sending connection request...";
            await requestPractitionerConnection(option.dataset.practitionerId);
            if(note) note.textContent="Connection request sent.";
            await renderPractitionerConnection();
          });
        });

        if(note) note.textContent="";
        button.disabled=false;
      }catch(error){
        console.error(error);
        if(note) note.textContent="Practitioner connection is not available yet. Run the 0.6.1 relationship migration.";
        button.disabled=false;
      }
    };
  }catch(error){
    console.warn("Practitioner relationship lookup failed.",error);
    title.textContent="Your Mentor to the Moon";
    text.textContent="Practitioner connections will appear here after the relationship migration is installed.";
    button.disabled=true;
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
    setMessage("Entering the Flowtel...");

    const email=document.getElementById("email").value.trim();
    const password=document.getElementById("password").value;

    if(!email||!password){
      setMessage("Add your email and password.");
      return;
    }

    await signInWithEmail(email,password);

    currentProfile=await ensureProfile({
      membershipType:SQUARESPACE_MEMBERSHIP || undefined,
      squarespaceSource:SQUARESPACE_MEMBERSHIP || undefined,
    });

    setMessage("");
    await prepareDailyStayState();

    if(shouldOpenSuiteFromConcierge() && restoreSuiteFromConcierge()){
      sessionStorage.removeItem("flowtel:openSuiteFromConcierge");
      return;
    }

    if(await openTodaySuiteIfPresent()){
      return;
    }

    clearCachedSuiteStay();
    currentStay=null;
    pendingArrivalStay=null;
    showCheckIn();
  }catch(error){
    setMessage("Your Passport could not be opened. Please check your email and password or message the Front Desk.");
    console.error(error);
  }
}

function readArrivalFields(){
  const cycleDay=Number(document.getElementById("cycleDay").value);
  const feelsLike=document.getElementById("feelsLike").value;

  if(!(cycleDay>=1&&cycleDay<=99)){
    setMessage("Enter a cycle day between 1 and 99.");
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
  if(!stay || !isStayForLocalToday(stay)){
    clearCachedSuiteStay();
    return false;
  }

  currentStay=stay;
  pendingArrivalStay=stay;
  renderSuite(stay);
  showScene("suite");
  window.scrollTo({top:0,behavior:"smooth"});
  return true;
}

async function openTodaySuiteIfPresent(){
  if(!currentProfile?.id) return false;

  const params=new URLSearchParams(window.location.search);
  if(params.get("forceCheckin")==="1") return false;

  const stay=await getTodayStayForClient(currentProfile.id);
  if(!stay || !isStayForLocalToday(stay)){
    clearCachedSuiteStay();
    return false;
  }

  currentStay=stay;
  pendingArrivalStay=stay;
  cacheSuiteStay(stay);
  renderSuite(stay);
  showScene("suite");
  window.scrollTo({top:0,behavior:"smooth"});
  return true;
}

async function ensureArrivalStay(){
  if(currentStay && isStayForLocalToday(currentStay)) return currentStay;
  if(pendingArrivalStay && isStayForLocalToday(pendingArrivalStay)) return pendingArrivalStay;

  currentStay=null;
  pendingArrivalStay=null;

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
    setMessage("Your room key could not be prepared. Please try again or message the Front Desk.");
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
    if(message) message.textContent="Reflection saved. Your stay has remembered this note.";

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
    cacheSuiteStay(currentStay);
    document.getElementById("checkoutMessage").textContent="You have personally checked out of today's stay.";
    renderLoungeVisits();
    renderLoungeCheckoutState();

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
    sessionStorage.setItem("flowtel:managerHandoff","true");

    try{
      const session=await clockInPractitioner(stay);
      if(session?.id) sessionStorage.setItem("flowtel:clockSessionId",session.id);
    }catch(clockError){
      console.warn("Clock-in session could not be saved yet. Run the 0.5.2 migration to enable persistent clock tracking.",clockError);
    }

    window.location.href="../manager/";
  }catch(error){
    setMessage("The Concierge Desk could not receive your clock-in. Please try again or message the Front Desk.");
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

const memberBridgeNewButton=document.getElementById("memberBridgeNewButton");
if(memberBridgeNewButton) memberBridgeNewButton.addEventListener("click",createNewMemberBridge);
const memberBridgeReturningButton=document.getElementById("memberBridgeReturningButton");
if(memberBridgeReturningButton) memberBridgeReturningButton.addEventListener("click",openReturningMemberBridge);
document.getElementById("signInButton").addEventListener("click",handleSignIn);
const guestModeButton=document.getElementById("guestModeButton");
if(guestModeButton) guestModeButton.addEventListener("click",openGuestFields);
document.getElementById("clockInButton").addEventListener("click",handleClockIn);
document.getElementById("checkInButton").addEventListener("click",handleCheckIn);
document.getElementById("saveReflectionButton").addEventListener("click",handleSaveReflection);
document.getElementById("checkoutButton").addEventListener("click",handleCheckout);
document.getElementById("returnLobbyButton").addEventListener("click",openCheckoutFromSuite);
document.getElementById("flowtelLoungeButton").addEventListener("click",()=>showScene("lounge"));
document.getElementById("backToSuiteButton").addEventListener("click",()=>{showScene("suite");window.scrollTo({top:0,behavior:"smooth"});});
const checkoutReturnButton=document.getElementById("checkoutReturnButton");
if(checkoutReturnButton) checkoutReturnButton.addEventListener("click",()=>{showScene("lobby");window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("closeVisitsButton").addEventListener("click",()=>document.getElementById("visitsDrawer").classList.add("hidden"));


// Auto-enter is opt-in for later Squarespace code injection.
// Example: /client/?membership=flowfm&email=member@example.com&auto=1
if((urlParam("auto")==="1" || urlParam("bridge")==="1") && extractSquarespaceEmail()){
  openMemberBridge();
}
