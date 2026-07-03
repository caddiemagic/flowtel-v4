import { signInWithEmail } from "../shared/auth.js";
import { getCurrentProfile } from "../shared/profiles.js";
import { getFrontDeskStays, witnessStay } from "../shared/flowtel.js";

const loginCard=document.getElementById("loginCard"), dashboard=document.getElementById("dashboard"), queue=document.getElementById("arrivalQueue"), managerMessage=document.getElementById("managerMessage");
const suiteReturnCard=document.getElementById("suiteReturnCard"), goToSuiteButton=document.getElementById("goToSuiteButton"), suiteReturnNote=document.getElementById("suiteReturnNote");
let allStays=[], activeFilter="queue";

function guestName(stay){return [stay.profiles?.first_name,stay.profiles?.last_name].filter(Boolean).join(" ")||stay.profiles?.email||"Guest";}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}
function daysOpen(stay){const start=new Date(stay.checkin_date);start.setHours(0,0,0,0);return Math.max(1,Math.round((new Date()-start)/86400000)+1);}
function checkedOutToday(stay){return stay.checked_out_at && new Date(stay.checked_out_at)>=startOfToday();}
function isExtended(stay){return !stay.checked_out_at && daysOpen(stay)>=14;}
function hasTurndownRequest(stay){return !!(stay.turndown_requested_at || stay.turndown_status==="requested");}
function isQueue(stay){return hasTurndownRequest(stay) && !stay.witnessed_at && stay.stay_status!=="checked_out";}
function visibleStays(){
  if(activeFilter==="in-house") return allStays.filter(s=>s.stay_status!=="checked_out");
  if(activeFilter==="queue") return allStays.filter(isQueue);
  if(activeFilter==="extended") return allStays.filter(isExtended);
  if(activeFilter==="checked-out") return allStays.filter(checkedOutToday);
  return allStays;
}
function setText(id,value){const el=document.getElementById(id);if(el) el.textContent=value;}
function updateStats(){
  setText("guestsInHouse",allStays.filter(s=>s.stay_status!=="checked_out").length);
  setText("awaitingWelcome",allStays.filter(isQueue).length);
  setText("extendedStay",allStays.filter(isExtended).length);
  setText("checkedOut",allStays.filter(checkedOutToday).length);
}
function setFilter(filter){
  activeFilter=filter;
  document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  const titles={
    "in-house":["GUESTS IN HOUSE","Guests currently in the Flowtel","All open stays remain here, but only requested care appears in the Turndown queue."],
    queue:["TURNDOWN SERVICE","🌙 Guests Awaiting Turndown Service","These guests have requested a little extra witnessing today."],
    extended:["EXTENDED STAY","Guests staying 14+ days","Longer stays are held quietly here."],
    "checked-out":["CHECKED OUT TODAY","Guests who closed today’s stay","These rooms have been personally closed today."],
  };
  setText("activeFilterLabel",titles[filter][0]);
  setText("activeFilterTitle",titles[filter][1]);
  setText("activeFilterSubtext",titles[filter][2]);
  renderQueue();
}

function getCachedSuiteStay(){
  try{
    const cached=sessionStorage.getItem("flowtel:lastSuiteStay");
    return cached?JSON.parse(cached):null;
  }catch(error){
    console.warn("Suite handoff could not be read.",error);
    return null;
  }
}
function updateSuiteReturn(){
  const stay=getCachedSuiteStay();
  if(!suiteReturnCard||!stay) return;
  const room=Number(stay.cycle_day_claimed)>=28?"28+":stay.cycle_day_claimed;
  suiteReturnCard.classList.remove("hidden");
  if(suiteReturnNote){
    suiteReturnNote.textContent=`Room ${room} is open. Return to your Suite whenever you're ready.`;
  }
}
function goToSuite(){
  sessionStorage.setItem("flowtel:openSuiteFromConcierge","true");
  window.location.href="../client/?suite=1";
}

function renderQueue(){
  const stays=visibleStays();
  if(!stays.length){queue.innerHTML="<p>✨ No guests in this category right now.</p>";return;}
  queue.innerHTML=stays.map(stay=>{
    const room=stay.cycle_day_claimed>=28?"28+":stay.cycle_day_claimed;
    return `
      <article class="guest-row">
        <div>
          <h3>${guestName(stay)}</h3>
          <p>Today's Room: ${room}</p>
          <p>Cycle Day: ${stay.cycle_day_claimed||"Not recorded"}</p>
          <p>Actual Inner Season: ${stay.inner_season||"Inner season not recorded"}</p>
        </div>
        <p>${isExtended(stay)?`${daysOpen(stay)} days`:stay.feels_like_inner_season||""}</p>
        ${isQueue(stay)?`<button data-id="${stay.id}">Open Room</button>`:`<button class="secondary" disabled>View Guest</button>`}
      </article>
    `;
  }).join("");
  document.querySelectorAll("[data-id]").forEach(button=>button.addEventListener("click",async()=>{
    const note=prompt("Leave a handwritten Concierge Note for this room");
    await witnessStay(button.dataset.id,note||"");
    await loadDesk();
  }));
}
async function loadDesk(){allStays=await getFrontDeskStays();updateStats();renderQueue();}
async function openDesk(){
  try{
    managerMessage.textContent="Opening the Concierge Desk...";
    const email=document.getElementById("managerEmail").value.trim(), password=document.getElementById("managerPassword").value;
    if(!email||!password){managerMessage.textContent="Add email and password.";return;}
    await signInWithEmail(email,password);
    const profile=await getCurrentProfile();
    if(!profile||!["owner","admin","practitioner"].includes(profile.role)){managerMessage.textContent="This key does not open the Concierge Desk yet.";return;}
    loginCard.classList.add("hidden");dashboard.classList.remove("hidden");
    updateSuiteReturn();
    await loadDesk();
  }catch(error){managerMessage.textContent=error.message;}
}
document.getElementById("managerSignInButton").addEventListener("click",openDesk);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));

if(goToSuiteButton) goToSuiteButton.addEventListener("click",goToSuite);
