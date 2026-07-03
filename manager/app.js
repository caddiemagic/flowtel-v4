import { signInWithEmail } from "../shared/auth.js";
import { getCurrentProfile } from "../shared/profiles.js";
import { getFrontDeskStays, witnessStay } from "../shared/flowtel.js";

const loginCard=document.getElementById("loginCard"), dashboard=document.getElementById("dashboard"), queue=document.getElementById("arrivalQueue"), managerMessage=document.getElementById("managerMessage");
let allStays=[], activeFilter="queue";

function guestName(stay){return [stay.profiles?.first_name,stay.profiles?.last_name].filter(Boolean).join(" ")||stay.profiles?.email||"Guest";}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}
function daysOpen(stay){const start=new Date(stay.checkin_date);start.setHours(0,0,0,0);return Math.max(1,Math.round((new Date()-start)/86400000)+1);}
function checkedOutToday(stay){return stay.checked_out_at && new Date(stay.checked_out_at)>=startOfToday();}
function isExtended(stay){return !stay.checked_out_at && daysOpen(stay)>=14;}
function isQueue(stay){return !stay.witnessed_at && stay.stay_status!=="checked_out" && !isExtended(stay);}
function visibleStays(){
  if(activeFilter==="in-house") return allStays.filter(s=>s.stay_status!=="checked_out");
  if(activeFilter==="queue") return allStays.filter(isQueue);
  if(activeFilter==="extended") return allStays.filter(isExtended);
  if(activeFilter==="witnessed") return allStays.filter(s=>!!s.witnessed_at);
  if(activeFilter==="checked-out") return allStays.filter(checkedOutToday);
  return allStays;
}
function updateStats(){
  document.getElementById("guestsInHouse").textContent=allStays.filter(s=>s.stay_status!=="checked_out").length;
  document.getElementById("awaitingWelcome").textContent=allStays.filter(isQueue).length;
  document.getElementById("extendedStay").textContent=allStays.filter(isExtended).length;
  document.getElementById("witnessedToday").textContent=allStays.filter(s=>!!s.witnessed_at).length;
  document.getElementById("checkedOut").textContent=allStays.filter(checkedOutToday).length;
}
function setFilter(filter){
  activeFilter=filter;
  document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  const titles={
    "in-house":["GUESTS IN HOUSE","Guests currently in the Flowtel"],
    queue:["QUEUE / NEW ARRIVALS","🌹 Guests Awaiting Welcome"],
    extended:["EXTENDED STAY","Guests staying 14+ days"],
    witnessed:["RECENTLY WITNESSED","Guests with Concierge Cards"],
    "checked-out":["CHECKED OUT TODAY","Guests who closed today’s stay"],
  };
  document.getElementById("activeFilterLabel").textContent=titles[filter][0];
  document.getElementById("activeFilterTitle").textContent=titles[filter][1];
  renderQueue();
}
function renderQueue(){
  const stays=visibleStays();
  if(!stays.length){queue.innerHTML="<p>✨ No guests in this category right now.</p>";return;}
  queue.innerHTML=stays.map(stay=>`
    <article class="guest-row">
      <div>
        <h3>${guestName(stay)}</h3>
        <p>Room ${stay.cycle_day_claimed>=28?"28+":stay.cycle_day_claimed} · ${stay.inner_season||"Inner season not recorded"}</p>
      </div>
      <p>${isExtended(stay)?`${daysOpen(stay)} days`:stay.feels_like_inner_season||""}</p>
      ${isQueue(stay)?`<button data-id="${stay.id}">Open Door</button>`:`<button class="secondary" disabled>View Guest</button>`}
    </article>
  `).join("");
  document.querySelectorAll("[data-id]").forEach(button=>button.addEventListener("click",async()=>{
    const note=prompt("Leave a Concierge Card");
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
    await loadDesk();
  }catch(error){managerMessage.textContent=error.message;}
}
document.getElementById("managerSignInButton").addEventListener("click",openDesk);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));
