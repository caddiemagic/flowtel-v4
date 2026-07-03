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
  Medicine wheel integrity:
  Day 1 starts at West.
  Days count COUNTER-CLOCKWISE from Day 1.
  Day 28+ returns to meet Day 1 at West.
*/
function wheelPosition(day){
  const room=Number(day)>=28?28:Number(day);
  const step=360/28;
  const angleDeg=180 - ((room-1)*step);
  const angle=angleDeg*Math.PI/180;
  const radius=43;

  return {
    x:50 + radius*Math.cos(angle),
    y:50 - radius*Math.sin(angle),
  };
}

function renderWheel(activeRoom){
  const rooms=Array.from({length:28},(_,i)=>i+1);

  medicineWheel.innerHTML =
    `<img class="wheel-rose" src="../assets/flowtel-rose.png" alt="" onerror="this.outerHTML='<div class=&quot;wheel-center&quot;>🌹</div>'" />` +
    rooms.map(room=>{
      const p=wheelPosition(room);
      const isActive=(Number(activeRoom)>=28 ? room===28 : room===Number(activeRoom));
      return `<button class="wheel-room ${isActive?"active":""}" type="button" data-room="${room}" style="left:${p.x}%;top:${p.y}%">${room===28?"28+":room}</button>`;
    }).join("");

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
