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
  if(name==="lounge"){loungeScene.classList.add("active");setProgress(3);renderLoungeVisits();}
}

function canClockIn(profile){
  return ["practitioner","owner","admin"].includes(profile?.role);
}

function showCheckIn(){
  authPanel.classList.add("hidden");
  checkinForm.classList.remove("hidden");

  const name=currentProfile?.first_name||"guest";
  document.getElementById("welcomeLine").textContent=`Welcome back, ${name}.`;

  if(canClockIn(currentProfile)){
    document.getElementById("clockInButton").classList.remove("hidden");
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
  const startAngle=195;
  const sweep=330;
  const step=sweep/27;
  const angleDeg=startAngle - ((room-1)*step);
  const angle=angleDeg*Math.PI/180;
  const radius=43;

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

    <span class="wheel-season wheel-season-winter">Inner Winter<small>Days 27–5</small></span>
    <span class="wheel-season wheel-season-spring">Inner Spring<small>Days 6–11</small></span>
    <span class="wheel-season wheel-season-summer">Inner Summer<small>Days 12–19</small></span>
    <span class="wheel-season wheel-season-autumn">Inner Autumn<small>Days 20–26</small></span>

    <img class="wheel-rose" src="../assets/flowtel-rose.png" alt="" onerror="this.outerHTML='<div class=&quot;wheel-center&quot;>🌹</div>'" />
    <span class="wheel-current-star" style="--x:${activePosition.x}%;--y:${activePosition.y}%" aria-hidden="true">✦</span>
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
  document.getElementById("suiteSubline").textContent=`Room ${room} is ready. You're on Day ${stay.cycle_day_claimed} ${connector} today feels like ${stay.feels_like_inner_season}.`;

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

  const witnessNote=document.getElementById("witnessNote");
  if(stay.witness_note){
    witnessNote.classList.remove("quiet");
    document.getElementById("witnessText").textContent=stay.witness_note;
  } else {
    witnessNote.classList.add("quiet");
    document.getElementById("witnessText").textContent="No card has been left yet.";
  }

  renderWheel(stay.cycle_day_claimed);
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
    showCheckIn();
  }catch(error){
    setMessage("Your Passport could not be opened. Please check your email and password or message Maddie.");
    console.error(error);
  }
}

async function handleCheckIn(){
  try{
    const cycleDay=Number(document.getElementById("cycleDay").value);
    const feelsLike=document.getElementById("feelsLike").value;

    if(!(cycleDay>=1&&cycleDay<=40)){
      setMessage("Enter a cycle day between 1 and 40.");
      return;
    }

    if(!feelsLike){
      setMessage("Choose what today feels like.");
      return;
    }

    setMessage("");
    showScene("preparing");

    const stay=await createStay({cycleDay,feelsLike});

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

function clockIn(){
  window.location.href="../manager/";
}

document.getElementById("signInButton").addEventListener("click",handleSignIn);
document.getElementById("guestModeButton").addEventListener("click",openGuestFields);
document.getElementById("clockInButton").addEventListener("click",clockIn);
document.getElementById("checkInButton").addEventListener("click",handleCheckIn);
document.getElementById("saveReflectionButton").addEventListener("click",handleSaveReflection);
document.getElementById("checkoutButton").addEventListener("click",handleCheckout);
document.getElementById("returnLobbyButton").addEventListener("click",()=>showScene("lobby"));
document.getElementById("flowtelLoungeButton").addEventListener("click",()=>showScene("lounge"));
document.getElementById("backToSuiteButton").addEventListener("click",()=>showScene("suite"));
document.getElementById("closeVisitsButton").addEventListener("click",()=>document.getElementById("visitsDrawer").classList.add("hidden"));

.wheel-room {
  left: var(--x);
  top: var(--y);
}

.wheel-current-star {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translate(-175%, -50%);
  color: var(--gold);
  font-size: 1.8rem;
  z-index: 7;
  pointer-events: none;
}

.wheel-cardinal,
.wheel-season {
  position: absolute;
  z-index: 3;
  font-family: Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--soft-brown);
  font-size: .62rem;
}

.wheel-cardinal-north { top: 5%; left: 50%; transform: translateX(-50%); }
.wheel-cardinal-east { right: 2%; top: 50%; transform: translateY(-50%); }
.wheel-cardinal-south { bottom: 5%; left: 50%; transform: translateX(-50%); }
.wheel-cardinal-west { left: 2%; top: 50%; transform: translateY(-50%); }

.wheel-season {
  font-size: .58rem;
  opacity: .75;
}

.wheel-season small {
  display: block;
  font-size: .52rem;
  margin-top: 3px;
  letter-spacing: .08em;
  text-transform: none;
}

.wheel-season-winter { left: 16%; bottom: 22%; text-align: left; }
.wheel-season-spring { right: 14%; bottom: 22%; text-align: right; }
.wheel-season-summer { right: 13%; top: 20%; text-align: right; }
.wheel-season-autumn { left: 14%; top: 20%; text-align: left; }

.wheel-axis {
  position: absolute;
  background: rgba(109, 78, 65, .12);
  z-index: 1;
}

.wheel-axis-vertical {
  width: 1px;
  height: 78%;
  left: 50%;
  top: 11%;
}

.wheel-axis-horizontal {
  height: 1px;
  width: 78%;
  left: 11%;
  top: 50%;
}

.wheel-compass-ring {
  position: absolute;
  inset: 9%;
  border: 1px solid rgba(109, 78, 65, .13);
  border-radius: 50%;
  z-index: 1;
}
