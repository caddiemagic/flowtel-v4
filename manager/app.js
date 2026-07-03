import { signInWithEmail, signUpWithEmail, signOut } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js";
import { getFrontDeskStays, witnessStay, clockOutPractitioner, getFlowFmInitiationStatus, listConnectionRequestsForPractitioner, connectWithGuest, listMyClients } from "../shared/flowtel.js";

const loginCard=document.getElementById("loginCard"), dashboard=document.getElementById("dashboard"), queue=document.getElementById("arrivalQueue"), managerMessage=document.getElementById("managerMessage");
const suiteReturnCard=document.getElementById("suiteReturnCard"), goToSuiteButton=document.getElementById("goToSuiteButton"), suiteReturnNote=document.getElementById("suiteReturnNote");
let allStays=[], activeFilter="queue";
let clockInContext=null;
let currentManagerProfile=null;

const BETA_PASSWORD="FlowtelBeta!2026";
const BETA_PRACTITIONERS=[
  {label:"Practitioner 1 · Inner Winter",email:"flowtel.practitioner1@test.local",firstName:"Priya",lastName:"Winter",role:"practitioner",cycleDay:2,innerSeason:"Inner Winter",wing:"West Wing",flowfmStartedAt:"2025-11-01"},
  {label:"Practitioner 2 · Inner Spring",email:"flowtel.practitioner2@test.local",firstName:"Sage",lastName:"Spring",role:"practitioner",cycleDay:8,innerSeason:"Inner Spring",wing:"South Wing",flowfmStartedAt:"2025-12-01"},
  {label:"Practitioner 3 · Inner Summer",email:"flowtel.practitioner3@test.local",firstName:"Sol",lastName:"Summer",role:"practitioner",cycleDay:18,innerSeason:"Inner Summer",wing:"East Wing",flowfmStartedAt:"2025-06-01"},
  {label:"Practitioner 4 · Inner Autumn",email:"flowtel.practitioner4@test.local",firstName:"Amina",lastName:"Autumn",role:"practitioner",cycleDay:23,innerSeason:"Inner Autumn",wing:"North Wing",flowfmStartedAt:"2025-08-01"},
];

const BETA_CLIENT_RELATIONSHIPS={
  "flowtel.practitioner1@test.local":["flowtel.guest3@test.local"],
  "flowtel.practitioner2@test.local":["flowtel.guest4@test.local"],
  "flowtel.practitioner3@test.local":["flowtel.guest1@test.local"],
  "flowtel.practitioner4@test.local":["flowtel.guest2@test.local"],
};

function getClockInContext(){
  try{
    const cached=sessionStorage.getItem("flowtel:lastSuiteStay");
    return cached?JSON.parse(cached):null;
  }catch(error){
    console.warn("Clock-in context could not be read.",error);
    return null;
  }
}

function oppositeWingForWing(wing){
  return {
    "East Wing":"West Wing",
    "West Wing":"East Wing",
    "North Wing":"South Wing",
    "South Wing":"North Wing",
  }[wing]||null;
}

function assignedWingForPractitioner(){
  return oppositeWingForWing(clockInContext?.wing);
}

function assignmentLine(){
  const ownWing=clockInContext?.wing;
  const assigned=assignedWingForPractitioner();

  if(ownWing&&assigned){
    return `You are clocked into the ${ownWing}. Today you are tending the ${assigned}.`;
  }

  return "You are clocked into the Concierge Desk. Today you can view all turndown requests.";
}



function renderBetaPractitionerPanel(){
  const panel=document.getElementById("betaManagerLoginPanel");
  if(!panel) return;

  panel.innerHTML=BETA_PRACTITIONERS.map(account=>`
    <button type="button" class="beta-login-button" data-beta-email="${account.email}">
      ${account.label}
    </button>
  `).join("");

  panel.querySelectorAll("[data-beta-email]").forEach(button=>{
    button.addEventListener("click",()=>handleBetaManagerLogin(button.dataset.betaEmail));
  });
}

function betaClockInContext(account){
  return {
    id:`beta-clockin-${account.email}`,
    client_id:null,
    cycle_day_claimed:account.cycleDay,
    cycle_day_calculated:account.cycleDay,
    inner_season:account.innerSeason,
    feels_like_inner_season:account.innerSeason,
    wing:account.wing,
    court:account.innerSeason?.replace("Inner ","")+" Court",
    checkin_date:new Date().toISOString().slice(0,10),
  };
}

async function handleBetaManagerLogin(email){
  const account=BETA_PRACTITIONERS.find(item=>item.email===email);
  if(!account) return;

  try{
    managerMessage.textContent=`Opening beta Concierge Desk for ${account.firstName}...`;
    await signOut();

    try{
      await signInWithEmail(account.email,BETA_PASSWORD);
    }catch(signInError){
      await signUpWithEmail(account.email,BETA_PASSWORD);
      await signInWithEmail(account.email,BETA_PASSWORD);
    }

    currentManagerProfile=await ensureProfile({
      firstName:account.firstName,
      lastName:account.lastName,
      role:"practitioner",
      forceBetaRole:true,
      flowfmStartedAt:account.flowfmStartedAt,
    });

    clockInContext=betaClockInContext(account);
    sessionStorage.setItem("flowtel:lastSuiteStay",JSON.stringify(clockInContext));

    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    updateSuiteReturn();
    updateTodayFlow();
    await loadDesk();
  }catch(error){
    managerMessage.textContent="This beta practitioner could not open. If email confirmation is enabled in Supabase, create the beta auth users manually first.";
    console.error(error);
  }
}

function isClientOfCurrentPractitioner(stay){
  const practitionerEmail=currentManagerProfile?.email;
  const guestEmail=stay.profiles?.email;
  if(!practitionerEmail||!guestEmail) return false;
  return (BETA_CLIENT_RELATIONSHIPS[practitionerEmail]||[]).includes(guestEmail);
}

function assignedWingForQueue(){
  return assignedWingForPractitioner();
}

function canOpenTurndownRoom(stay){
  const assigned=assignedWingForQueue();
  if(!assigned) return isQueue(stay);
  return isQueue(stay) && stay.wing===assigned;
}

function updatePractitionerIdentity(){
  const profile=currentManagerProfile || {};
  const initiation=getFlowFmInitiationStatus(profile);
  const name=[profile.first_name,profile.last_name].filter(Boolean).join(" ") || profile.email || "Concierge";

  setText("practitionerIdentityName",name);

  if(profile.role==="practitioner" || profile.role==="owner" || profile.role==="admin"){
    const moonName=initiation.moon?.name || "Moon not set";
    const monthLine=initiation.monthLine || "Month not set";
    const theme=initiation.moon?.theme ? ` · ${initiation.moon.theme}` : "";
    setText("practitionerIdentityLevel",`${initiation.level} · ${moonName} · ${monthLine}${theme}`);
    const progress=document.getElementById("initiationProgressBar");
    if(progress){
      const percent=initiation.moonIndex ? Math.min(100,(initiation.moonIndex/13)*100) : 0;
      progress.style.width=`${percent}%`;
    }
  }else{
    setText("practitionerIdentityLevel","Guest access");
    const progress=document.getElementById("initiationProgressBar");
    if(progress) progress.style.width="0%";
  }
}

function updateTodayFlow(){
  const ownWing=clockInContext?.wing;
  const assigned=assignedWingForPractitioner();

  updatePractitionerIdentity();

  if(ownWing&&assigned){
    setText("deskAssignmentTitle",`You are clocked into the ${ownWing}.`);
    setText("deskAssignmentNote",`Today you are tending guests in the ${assigned}.`);
  }else{
    setText("deskAssignmentTitle","The Concierge Desk is open.");
    setText("deskAssignmentNote","Clock in through your Suite to receive a wing assignment, or view all turndown requests here.");
  }
}

function guestName(stay){return [stay.profiles?.first_name,stay.profiles?.last_name].filter(Boolean).join(" ")||stay.profiles?.email||"Guest";}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}
function daysOpen(stay){const start=new Date(stay.checkin_date);start.setHours(0,0,0,0);return Math.max(1,Math.round((new Date()-start)/86400000)+1);}
function checkedOutToday(stay){return stay.checked_out_at && new Date(stay.checked_out_at)>=startOfToday();}
function isExtended(stay){return !stay.checked_out_at && daysOpen(stay)>=14;}
function hasTurndownRequest(stay){return !!(stay.turndown_requested_at || stay.turndown_status==="requested");}
function isQueue(stay){return hasTurndownRequest(stay) && !stay.witnessed_at && stay.stay_status!=="checked_out";}
function visibleStays(){
  if(activeFilter==="in-house") return allStays.filter(s=>s.stay_status!=="checked_out");
  if(activeFilter==="queue") return allStays.filter(stay=>isQueue(stay) && (!assignedWingForQueue() || stay.wing===assignedWingForQueue()));
  if(activeFilter==="extended") return allStays.filter(isExtended);
  if(activeFilter==="checked-out") return allStays.filter(checkedOutToday);
  return allStays;
}
function setText(id,value){const el=document.getElementById(id);if(el) el.textContent=value;}
function updateStats(){
  setText("guestsInHouse",allStays.filter(s=>s.checkin_date===new Date().toISOString().slice(0,10)).length);
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
    suiteReturnNote.textContent=`Room ${room} is open. Clock out when you're ready to return to your Suite.`;
  }
}
async function goToSuite(){
  try{
    const clockSessionId=sessionStorage.getItem("flowtel:clockSessionId");
    if(clockSessionId){
      await clockOutPractitioner(clockSessionId);
      sessionStorage.removeItem("flowtel:clockSessionId");
    }
  }catch(error){
    console.warn("Clock-out session could not be saved yet.",error);
  }

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
        ${canOpenTurndownRoom(stay)
          ? `<button data-id="${stay.id}">Open Room</button>`
          : isClientOfCurrentPractitioner(stay)
            ? `<span class="guest-row-status">Connected client</span>`
            : `<span class="guest-row-status">Not assigned to your wing</span>`}
      </article>
    `;
  }).join("");
  document.querySelectorAll("[data-id]").forEach(button=>button.addEventListener("click",async()=>{
    const note=prompt("Leave a handwritten Concierge Note for this room");
    await witnessStay(button.dataset.id,note||"");
    await loadDesk();
  }));
}

function relationshipGuestName(row){
  const client=row?.client || {};
  return [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email || "Guest";
}

async function renderConnectionRequests(){
  const holder=document.getElementById("connectionRequests");
  if(!holder) return;

  try{
    const requests=await listConnectionRequestsForPractitioner();
    if(!requests.length){
      holder.innerHTML="<p>No new connection requests.</p>";
      return;
    }

    holder.innerHTML=requests.map(row=>`
      <article class="guest-row connection-row">
        <div>
          <h3>${relationshipGuestName(row)}</h3>
          <p>Would like to connect and share Flowtel stays.</p>
        </div>
        <button type="button" data-connect-id="${row.id}">Connect</button>
      </article>
    `).join("");

    holder.querySelectorAll("[data-connect-id]").forEach(button=>{
      button.addEventListener("click",async()=>{
        button.disabled=true;
        await connectWithGuest(button.dataset.connectId);
        await renderConnectionRequests();
        await renderMyClients();
      });
    });
  }catch(error){
    console.warn("Connection requests are not available yet.",error);
    holder.innerHTML="<p>Connection requests will appear after the relationship migration is installed.</p>";
  }
}

async function renderMyClients(){
  const holder=document.getElementById("myClientsList");
  if(!holder) return;

  try{
    const clients=await listMyClients();
    if(!clients.length){
      holder.innerHTML="<p>No connected clients yet.</p>";
      return;
    }

    holder.innerHTML=clients.map(row=>`
      <article class="guest-row connection-row">
        <div>
          <h3>${relationshipGuestName(row)}</h3>
          <p>Connected client</p>
        </div>
      </article>
    `).join("");
  }catch(error){
    console.warn("Client list is not available yet.",error);
    holder.innerHTML="<p>Connected clients will appear after the relationship migration is installed.</p>";
  }
}


async function loadDesk(){allStays=await getFrontDeskStays();updateStats();renderQueue();await renderConnectionRequests();await renderMyClients();}
async function openDesk(){
  try{
    managerMessage.textContent="Opening the Concierge Desk...";
    const email=document.getElementById("managerEmail").value.trim(), password=document.getElementById("managerPassword").value;
    if(!email||!password){managerMessage.textContent="Add email and password.";return;}
    await signInWithEmail(email,password);
    const profile=await getCurrentProfile();
    currentManagerProfile=profile;
    if(!profile||!["owner","admin","practitioner"].includes(profile.role)){managerMessage.textContent="This key does not open the Concierge Desk yet.";return;}
    clockInContext=getClockInContext();
    loginCard.classList.add("hidden");dashboard.classList.remove("hidden");
    updateSuiteReturn();
    updateTodayFlow();
    await loadDesk();
  }catch(error){managerMessage.textContent=error.message;}
}
renderBetaPractitionerPanel();

document.getElementById("managerSignInButton").addEventListener("click",openDesk);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));

if(goToSuiteButton) goToSuiteButton.addEventListener("click",goToSuite);
