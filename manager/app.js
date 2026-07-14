import { signInWithEmail, signUpWithEmail, signOut } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js";
import { getFrontDeskStays, witnessStay, prepareRoomAfterCheckout, clockOutPractitioner, getFlowFmInitiationStatus, listConnectionRequestsForPractitioner, connectWithGuest, listMyClients } from "../shared/flowtel.js";

const loginCard=document.getElementById("loginCard"), dashboard=document.getElementById("dashboard"), queue=document.getElementById("arrivalQueue"), managerMessage=document.getElementById("managerMessage");
const suiteReturnCard=document.getElementById("suiteReturnCard"), goToSuiteButton=document.getElementById("goToSuiteButton"), suiteReturnNote=document.getElementById("suiteReturnNote");
const initiationHallButton=document.getElementById("initiationHallButton"), initiationHallNote=document.getElementById("initiationHallNote");
let allStays=[], activeFilter="queue";
let currentConnectionRequestsCount=0;
let currentClientsCount=0;
let clockInContext=null;
let currentManagerProfile=null;
const boundConnectionButtons=new WeakSet();
const boundClientDataButtons=new WeakSet();

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

const FLOWTEL_AFFIRMATIONS=[
  "My womb is the root of all wealth in my life",
  "I create wealth by expressing my truth",
  "I allow money to flow through me",
  "My creative power is my currency",
  "I welcome new avenues for wealth to flow into my life",
  "The universe loves to spoil me",
  "My bank account is always overflowing",
  "I treat money with respect and reverence",
  "My womb is a magnet for wealth and overflow",
  "I am grateful for all of the money I have right now",
  "I trust the natural intelligence that lives within my womb",
  "Money always returns to me multiplied",
  "The more I spend, the more I receive",
  "I spend money in wise and fun ways",
  "I always get what I want",
  "I use money to make my life easier",
  "My angels complete tasks on my behalf so that I can rest",
  "I welcome new forms of abundance into my life",
  "I am resourced from within",
  "I have autonomy and authority over my own life force energy",
  "Wealth flows naturally from my womb’s wisdom",
  "My womb is fertile with ideas",
  "I am worthy of increasing my income",
  "I am generously paid to exist",
  "I have more than enough money to meet all of my needs",
  "More money means more peace",
  "My womb leads, and wealth follows",
  "My cyclical nature is my greatest financial advantage",
  "Money loves to flow through me",
  "Money belongs in my hands",
  "I release all fears of being wealthy",
  "Money is safe with me",
  "Spending money on myself is a form of self love",
  "My time is worth millions",
  "Money is a currency of love",
  "I adorn myself in luxury",
  "I invest in who I am becoming",
  "My energy is currency",
  "Money loves to multiply in my hands",
  "I am financially free",
  "Wealth is encoded into my feminine essence",
  "Everyone I meet helps me succeed",
  "I honor my inner seasons and they multiply my prosperity",
  "I am richly supported by life",
  "Prosperity flows to and through me",
  "My pleasure expands my capacity to receive",
  "My boundaries protect and multiply my abundance",
  "I am happy, healthy, and wealthy",
  "I get paid to be myself",
  "I am safe to have more than enough",
  "I love checking my bank account",
  "I am the source, the creator, and the vessel of wealth",
  "Making money comes easily to me",
  "People love to pay me for my energy",
  "Money loves to see me happy",
  "Money is always there for me",
  "All my needs are met",
  "Money loves to make my dreams come true",
  "I see abundance everywhere I look",
  "I magnetize money from the north, south, east, and west",
  "Money grows on trees for me",
  "I am available for overflow in all areas of my life",
  "Money is a vessel that divine love flows through",
  "My magic blesses me and everyone I serve",
  "I make good decisions with my money",
  "The more peaceful I feel, the more money I receive",
  "Money loves calm, clear direction",
  "My energy feels like luxury to others",
  "Abundance is drawn to me",
  "Opportunities to make more money fall into my lap",
  "I am open to receiving more money",
  "What I want wants me more",
  "My time is more valuable than money",
  "My sensitivity is my superpower",
  "Money wants me to be free and happy",
  "More money is always on the way to me",
  "I am divinely compensated for the love I spread in this world",
  "I am safe to receive large amounts of money",
  "My desires are sacred instructions towards abundance",
  "I have all the resources I need to take the next step",
  "Receiving large sums of money is normal to me",
  "My voice is worth millions",
  "I am finally secure and stable",
  "I am the creator of my reality",
  "Money loves to please me",
  "I am living the life of my dreams",
  "Money magnifies my brilliance",
  "Making money tastes like honey"
];

const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

function flowtelDateISO(date = new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{
    timeZone:FLOWTEL_TIME_ZONE,
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).formatToParts(date).reduce((acc,part)=>{
    if(part.type!=="literal") acc[part.type]=part.value;
    return acc;
  },{});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function flowtelDateTimeLabel(date = new Date()){
  return new Intl.DateTimeFormat(undefined,{
    timeZone:FLOWTEL_TIME_ZONE,
    month:"short",
    day:"numeric",
    year:"numeric",
    hour:"numeric",
    minute:"2-digit",
    timeZoneName:"short"
  }).format(date);
}

function updateConciergeClock(){
  let line=document.getElementById("conciergeFlowtelClock");
  const hero=document.querySelector(".hero");
  if(hero&&!line){
    line=document.createElement("p");
    line.id="conciergeFlowtelClock";
    line.className="concierge-flowtel-clock";
    const note=document.getElementById("conciergeHeaderNote");
    if(note) note.insertAdjacentElement("afterend",line);
    else hero.appendChild(line);
  }
  if(line) line.textContent=`Flowtel time: ${flowtelDateTimeLabel()}`;
}

function affirmationForSession(){
  const email=currentManagerProfile?.email || "flowtel";
  const today=flowtelDateISO();
  let seed=0;
  `${email}:${today}`.split("").forEach(char=>{seed=(seed+char.charCodeAt(0)*17)%100000;});
  return FLOWTEL_AFFIRMATIONS[seed%FLOWTEL_AFFIRMATIONS.length];
}

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
  // Flowtel polarity routing:
  // practitioners serve the opposite wing from the wing they are clocked into.
  return oppositeWingForWing(clockInContext?.wing);
}

function normalizeWing(wing){
  return String(wing || "").trim().toLowerCase();
}

function wingsMatch(a,b){
  return normalizeWing(a) === normalizeWing(b);
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
    cycle_day_recorded:account.cycleDay,
    cycle_day_actual:account.cycleDay,
    inner_season:account.innerSeason,
    feels_like_inner_season:account.innerSeason,
    wing:account.wing,
    court:account.innerSeason?.replace("Inner ","")+" Court",
    checkin_date:flowtelDateISO(),
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
  return isQueue(stay) && wingsMatch(stay.wing, assigned);
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
      const marker=document.getElementById("initiationMoonMarker");
      if(marker) marker.style.left=`${percent}%`;
      const note=document.getElementById("conciergeHeaderNote");
      if(note) note.textContent=affirmationForSession();
    }
  }else{
    setText("practitionerIdentityLevel","Guest access");
    const progress=document.getElementById("initiationProgressBar");
    if(progress) progress.style.width="0%";
  }
}

function markInitiationHallClockIn(){
  sessionStorage.setItem("flowtel:courseworkClockedIn","true");
  sessionStorage.setItem("flowtel:courseworkClockedInAt",new Date().toISOString());
  if(clockInContext?.id){
    sessionStorage.setItem("flowtel:courseworkClockInStayId",clockInContext.id);
  }
}

function updateInitiationHallAccess(){
  if(!initiationHallButton) return;
  initiationHallButton.classList.toggle("is-clocked-in",!!clockInContext);
  if(initiationHallNote){
    initiationHallNote.textContent=clockInContext
      ? "You are clocked in. Initiation Hall coursework is part of your practitioner duty."
      : "Open the Hall from the Desk. Coursework counts as being on duty inside the Flowtel.";
  }
}

function updateTodayFlow(){
  updateConciergeClock();
  const ownWing=clockInContext?.wing;
  const assigned=assignedWingForPractitioner();

  updatePractitionerIdentity();
  updateInitiationHallAccess();

  if(ownWing&&assigned){
    const day=clockInContext?.cycle_day_actual || clockInContext?.cycle_day_calculated || clockInContext?.cycle_day_claimed || "—";
    setText("deskAssignmentTitle",`You’re on day ${day} and clocked into the ${ownWing}.`);
    setText("deskAssignmentNote",`Today you are tending guests in the ${assigned}.`);
  }else{
    setText("deskAssignmentTitle","The Concierge Desk is open.");
    setText("deskAssignmentNote","Clock in through your Suite to receive a wing assignment, or view all turndown requests here.");
  }
}

function titleCaseNamePart(value){
  return String(value || "")
    .trim()
    .replace(/\s+/g," ")
    .split(" ")
    .map(part=>part ? part.charAt(0).toUpperCase()+part.slice(1).toLowerCase() : "")
    .join(" ");
}

function isLikelyInitials(value){
  const cleaned=String(value || "").replace(/[^A-Za-z]/g,"");
  return cleaned.length > 0 && cleaned.length <= 3 && cleaned === cleaned.toUpperCase();
}

function nameFromEmail(email){
  const local=String(email || "").split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(titleCaseNamePart)
    .join(" ");
}

function guestName(stay){
  const profile=stay.profiles || stay.client || {};
  let first=titleCaseNamePart(profile.first_name || "");
  const last=titleCaseNamePart(profile.last_name || "");
  const emailGuess=nameFromEmail(profile.email || stay.client_email || "");
  const emailFirst=emailGuess.split(" ")[0];

  if((!first || isLikelyInitials(profile.first_name)) && emailFirst && !isLikelyInitials(emailFirst)){
    first=emailFirst;
  }

  return [first,last].filter(Boolean).join(" ") || profile.email || "Guest";
}

function directSeasonName(value){
  const cleaned=String(value || "").replace(/^Inner\s+/i,"").trim();
  return cleaned.toLowerCase()==="autumn" ? "Fall" : cleaned;
}

function escapeHtml(value){
  return String(value||"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}
function utcDateFromISO(iso){
  const [year,month,day]=String(iso||currentFlowtelDate()).slice(0,10).split("-").map(Number);
  return Date.UTC(year,month-1,day);
}
function daysBetweenISO(startISO,endISO){
  return Math.max(1,Math.round((utcDateFromISO(endISO)-utcDateFromISO(startISO))/86400000)+1);
}
function daysOpen(stay){return daysBetweenISO(stayFlowtelDate(stay),currentFlowtelDate());}
function checkedOutToday(stay){return flowtelDateFromValue(stay.checked_out_at)===currentFlowtelDate();}
function isExtended(stay){return !stay.checked_out_at && daysOpen(stay)>=14;}
function isOpenStay(stay){
  return !["checked_out","room_prepared"].includes(stay.stay_status) && !stay.checked_out_at;
}

function turndownStatus(stay){
  return String(stay?.turndown_status || "").trim().toLowerCase();
}

function hasTurndownRequest(stay){
  const status=turndownStatus(stay);
  return status==="requested" || status==="completed" || status==="fulfilled" || !!stay.turndown_requested_at || !!stay.turndown_completed_at;
}

function isTurndownFulfilled(stay){
  const status=turndownStatus(stay);
  return status==="completed" || status==="fulfilled" || !!stay.turndown_completed_at;
}

function turndownCompletedBy(stay){
  const witness=[stay.witness_profile?.first_name,stay.witness_profile?.last_name].filter(Boolean).join(" ");
  return stay.turndown_completed_by_name || stay.witness_note_by || witness || "Your Concierge";
}

function turndownTime(stay){
  const value=stay.turndown_requested_at || stay.updated_at || stay.checked_in_at;
  return value ? new Date(value).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "Today";
}

function isAssignedToPractitioner(stay){
  const assigned=assignedWingForQueue();
  return !assigned || wingsMatch(stay.wing, assigned);
}

function isAwaitingTurndown(stay){
  return isOpenStay(stay) && hasTurndownRequest(stay) && !isTurndownFulfilled(stay) && isAssignedToPractitioner(stay);
}

function isCompletedTurndown(stay){
  return isOpenStay(stay) && stayFlowtelDate(stay)===currentFlowtelDate() && hasTurndownRequest(stay) && isTurndownFulfilled(stay) && isAssignedToPractitioner(stay);
}

function needsCheckoutConfirmation(stay){
  return checkedOutToday(stay) && !stay.witnessed_at;
}

function currentFlowtelDate(){
  return flowtelDateISO();
}

function flowtelDateFromValue(value){
  if(!value) return "";
  const raw=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date=new Date(raw);
  if(Number.isNaN(date.getTime())) return raw.slice(0,10);
  return flowtelDateISO(date);
}

function stayFlowtelDate(stay){
  return stay.checkin_date || flowtelDateFromValue(stay.checked_in_at || stay.created_at);
}

function stayActualDay(stay){
  const value=Number(stay?.cycle_day_actual ?? stay?.cycle_day_calculated ?? stay?.cycle_day_claimed);
  return Number.isFinite(value) ? value : null;
}

function stayRecordedDay(stay){
  const value=Number(stay?.cycle_day_recorded ?? stay?.cycle_day_claimed ?? stayActualDay(stay));
  return Number.isFinite(value) ? value : null;
}

function roomLabelForDay(day){
  const value=Number(day);
  if(!Number.isFinite(value)) return "—";
  return value>=28 ? "28+" : String(value);
}

function cycleDayDetail(stay){
  const actual=stayActualDay(stay);
  const recorded=stayRecordedDay(stay);
  if(actual===null && recorded===null) return "Cycle Day: Not recorded";
  if(recorded!==null && actual!==null && recorded!==actual){
    return `Actual Cycle Day: ${actual} · Recorded: ${recorded}`;
  }
  return `Cycle Day: ${actual ?? recorded}`;
}

function todayOpenStays(){
  const today=currentFlowtelDate();
  return allStays.filter(stay=>isOpenStay(stay) && stayFlowtelDate(stay)===today);
}

function awaitingTurndownStays(){
  return allStays.filter(isAwaitingTurndown);
}

function completedTurndownStays(){
  return allStays.filter(isCompletedTurndown);
}

function visibleStays(){
  if(activeFilter==="in-house") return todayOpenStays();
  if(activeFilter==="queue") return awaitingTurndownStays();
  if(activeFilter==="extended") return allStays.filter(isExtended);
  if(activeFilter==="clients") return [];
  return allStays;
}
function setText(id,value){const el=document.getElementById(id);if(el) el.textContent=value;}

function updateStats(){
  const awaitingCount=awaitingTurndownStays().length;
  const inHouse=todayOpenStays().length;
  const extendedCount=allStays.filter(isExtended).length;

  setText("awaitingTurndownCount",awaitingCount);
  setText("guestsInHouse",inHouse);
  setText("extendedStay",extendedCount);
  setText("clientsCount",currentClientsCount);
  setText("clientConnectionCount",currentConnectionRequestsCount);

  const queueCard=document.querySelector(".queue");
  if(queueCard) queueCard.classList.toggle("has-requests",activeFilter==="queue" && awaitingCount>0);

  const turndownCard=document.querySelector('[data-filter="queue"]');
  if(turndownCard) turndownCard.classList.toggle("has-alert",awaitingCount>0);

  const clientsCard=document.querySelector('[data-filter="clients"]');
  if(clientsCard) clientsCard.classList.toggle("has-alert",currentConnectionRequestsCount>0);

  const inHouseCard=document.querySelector('[data-filter="in-house"]');
  if(inHouseCard) inHouseCard.classList.remove("has-alert");

  const extendedCard=document.querySelector('[data-filter="extended"]');
  if(extendedCard) extendedCard.classList.remove("has-alert");
}
function setFilter(filter){
  activeFilter=filter;
  document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  updateStats();
  const titles={
    "queue":["AWAITING TURNDOWN","Guests Awaiting Turndown Service","These guests are in your assigned wing and have requested extra care."],
    "clients":["MENTOR RELATIONSHIPS","Your Clients + Mentor Requests","Connected clients and new mentor requests live here."],
    "in-house":["GUESTS IN HOUSE","Guests currently in the Flowtel","All open stays for today appear here."],
    "extended":["EXTENDED STAY","Guests staying 14+ days","Longer stays are held quietly here."],
  };
  const chosen=titles[filter] || titles.queue;
  setText("activeFilterLabel",chosen[0]);
  setText("activeFilterTitle",chosen[1]);
  setText("activeFilterSubtext",chosen[2]);
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
  const room=roomLabelForDay(stayActualDay(stay));
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

function practitionerCareLabel(){
  const profile=currentManagerProfile || {};
  const initiation=getFlowFmInitiationStatus(profile);
  const name=[profile.first_name,profile.last_name].filter(Boolean).join(" ") || profile.email || "Your concierge";
  return `${initiation.level || "Concierge"} ${name}`;
}

function renderGuestStayRow(stay,{mode="in-house"}={}){
  const room=roomLabelForDay(stayActualDay(stay));
  const checkoutItem=needsCheckoutConfirmation(stay);
  const turndownItem=hasTurndownRequest(stay);
  const completedItem=isCompletedTurndown(stay);
  const awaitingItem=isAwaitingTurndown(stay);
  const actionLabel=checkoutItem?"Clean Room":awaitingItem?"Complete Turndown":"Open Room";
  const action=checkoutItem?"clean":"witness";
  const isRequestCard=mode==="awaiting" || mode==="completed" || turndownItem || completedItem;
  const feelsLike=directSeasonName(stay.feels_like_inner_season || stay.feels_like || stay.feels_like_season) || "Not recorded";
  const statusLine=checkoutItem
    ? `<p>Checkout confirmation · ${new Date(stay.checked_out_at).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</p>`
    : completedItem
      ? `<p class="completed-status">${escapeHtml(turndownCompletedBy(stay))} has tended to this guest.</p>`
      : turndownItem
        ? `<p>Turndown request · ${turndownTime(stay)}</p>`
        : `<p>Checked in · ${stay.checked_in_at ? new Date(stay.checked_in_at).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : stayFlowtelDate(stay)}</p>`;
  const rowClass=checkoutItem ? "checkout-row" : completedItem ? "completed-turndown-row" : turndownItem ? "turndown-row" : "in-house-row";
  const showAction=mode!=="completed" && mode!=="in-house";
  const detailLines=isRequestCard
    ? `
        <p>${cycleDayDetail(stay)}</p>
        <p>Actual Inner Season: ${stay.inner_season||"Inner season not recorded"}</p>
        <p>Feels Like: ${feelsLike}</p>
      `
    : `
        <p>Today's Room: ${room}</p>
        <p>${cycleDayDetail(stay)}</p>
        <p>Actual Inner Season: ${stay.inner_season||"Inner season not recorded"}</p>
        <p>Wing: ${stay.wing||"Not assigned"}</p>
      `;

  return `
    <article class="guest-row ${rowClass}">
      <div>
        <h3>${escapeHtml(guestName(stay))}</h3>
        ${statusLine}
        ${detailLines}
      </div>
      ${showAction ? `<button data-id="${stay.id}" data-action="${action}">${actionLabel}</button>` : (mode==="completed" ? `<span class="completed-pill">Completed</span>` : "")}
    </article>
  `;
}

function renderTurndownServiceQueue(){
  const awaiting=awaitingTurndownStays();
  const completed=completedTurndownStays();

  if(!awaiting.length && !completed.length){
    queue.innerHTML="<p>No guests are awaiting Turndown Service right now.</p>";
    return;
  }

  queue.innerHTML=`
    <section class="queue-section active-requests">
      <p class="queue-section-label">Open Requests</p>
      ${awaiting.length ? awaiting.map(stay=>renderGuestStayRow(stay,{mode:"awaiting"})).join("") : "<p>No active turndown requests.</p>"}
    </section>
    <section class="queue-section completed-requests">
      <p class="queue-section-label">Completed Requests</p>
      ${completed.length ? completed.map(stay=>renderGuestStayRow(stay,{mode:"completed"})).join("") : "<p>No completed requests yet today.</p>"}
    </section>
  `;

  bindQueueActions();
}

function bindQueueActions(){
  document.querySelectorAll("[data-id][data-action]").forEach(button=>button.addEventListener("click",async()=>{
    button.disabled=true;
    const originalText=button.textContent;
    button.textContent=button.dataset.action==="clean" ? "Preparing..." : "Completing...";
    if(managerMessage) managerMessage.textContent="";

    try{
      let updatedStay=null;
      if(button.dataset.action==="clean"){
        updatedStay=await prepareRoomAfterCheckout(button.dataset.id,practitionerCareLabel());
      }else{
        const note=prompt("Leave a handwritten Concierge Note for this room");
        updatedStay=await witnessStay(button.dataset.id,note||"");
      }

      if(updatedStay?.id){
        allStays=allStays.map(stay=>stay.id===updatedStay.id ? {...stay,...updatedStay} : stay);
        updateStats();
        renderQueue();
      }

      await loadDesk();
      if(managerMessage) managerMessage.textContent="Turndown service has been completed.";
    }catch(error){
      console.error("Concierge action failed.",error);
      button.disabled=false;
      button.textContent=originalText;
      if(managerMessage){
        managerMessage.textContent=error?.message
          ? `Concierge action could not be saved: ${error.message}`
          : "Concierge action could not be saved. Please check the Supabase migration and try again.";
      }
    }
  }));
}

function renderQueue(){
  if(activeFilter==="clients"){
    const requests=document.getElementById("connectionRequests")?.innerHTML || "<p>No new mentor requests.</p>";
    const clients=document.getElementById("myClientsList")?.innerHTML || "<p>No connected clients yet.</p>";
    queue.innerHTML=`
      <div class="relationship-queue">
        <section>
          <p class="eyebrow">MENTOR REQUESTS</p>
          ${requests}
        </section>
        <section>
          <p class="eyebrow">YOUR CLIENTS</p>
          ${clients}
        </section>
      </div>
    `;
    bindConnectionButtons(queue);
    bindClientDataButtons(queue);
    return;
  }

  if(activeFilter==="queue"){
    renderTurndownServiceQueue();
    return;
  }

  const stays=visibleStays();
  if(!stays.length){queue.innerHTML="<p>No guests in this category right now.</p>";return;}
  queue.innerHTML=stays.map(stay=>renderGuestStayRow(stay,{mode:activeFilter})).join("");
  bindQueueActions();
}

function relationshipGuestName(row){
  const client=row?.client || {};
  return [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email || "Guest";
}

function bindConnectionButtons(scope=document){
  scope.querySelectorAll("[data-connect-id]").forEach(button=>{
    if(boundConnectionButtons.has(button)) return;
    boundConnectionButtons.add(button);
    button.addEventListener("click",async()=>{
      const originalText=button.textContent;
      button.disabled=true;
      button.textContent="Connecting...";
      if(managerMessage) managerMessage.textContent="";

      try{
        await connectWithGuest(button.dataset.connectId);
        await renderConnectionRequests();
        await renderMyClients();
        if(activeFilter==="clients") renderQueue();
        if(managerMessage) managerMessage.textContent="Mentor connection complete.";
      }catch(error){
        console.error("Mentor connection failed.",error);
        button.disabled=false;
        button.textContent=originalText;
        if(managerMessage){
          managerMessage.textContent=error?.message
            ? `Mentor connection could not be saved: ${error.message}`
            : "Mentor connection could not be saved. Please confirm the latest mentor migration is installed.";
        }
      }
    });
  });
}

async function renderConnectionRequests(){
  const holder=document.getElementById("connectionRequests");
  if(!holder) return;

  try{
    const requests=await listConnectionRequestsForPractitioner();
    currentConnectionRequestsCount=requests.length;
    setText("clientConnectionCount",requests.length);
    updateStats();
    if(!requests.length){
      holder.innerHTML="<p>No new mentor requests.</p>";
      return;
    }

    holder.innerHTML=requests.map(row=>`
      <article class="guest-row connection-row">
        <div>
          <h3>${relationshipGuestName(row)}</h3>
          <p>Would like you to be their Mentor to the Moon.</p>
        </div>
        <button type="button" data-connect-id="${row.id}">Connect</button>
      </article>
    `).join("");
  }catch(error){
    console.warn("Connection requests are not available yet.",error);
    currentConnectionRequestsCount=0;
    setText("clientConnectionCount","0");
    updateStats();
    holder.innerHTML="<p>Mentor requests will appear after the relationship migration is installed.</p>";
  }
}


function openClientCycleData(clientId){
  if(!clientId) return;
  window.location.href=`/cycle-data/?client=${encodeURIComponent(clientId)}`;
}

function bindClientDataButtons(scope=document){
  scope.querySelectorAll("[data-view-client-data]").forEach(button=>{
    if(boundClientDataButtons.has(button)) return;
    boundClientDataButtons.add(button);
    button.addEventListener("click",()=>openClientCycleData(button.dataset.viewClientData));
  });
}

async function renderMyClients(){
  const holder=document.getElementById("myClientsList");
  if(!holder) return;

  try{
    const clients=await listMyClients();
    currentClientsCount=clients.length;
    setText("clientsCount",clients.length);
    updateStats();
    if(!clients.length){
      holder.innerHTML="<p>No connected clients yet.</p>";
      return;
    }

    holder.innerHTML=clients.map(row=>`
      <article class="guest-row connection-row">
        <div>
          <h3>${relationshipGuestName(row)}</h3>
          <p>Mentor connection active.</p>
        </div>
        <button type="button" data-view-client-data="${row.client_id}">View Data</button>
      </article>
    `).join("");

    bindClientDataButtons(holder);
  }catch(error){
    console.warn("Client list is not available yet.",error);
    currentClientsCount=0;
    setText("clientsCount","0");
    updateStats();
    holder.innerHTML="<p>Connected guests will appear after the relationship migration is installed.</p>";
  }
}


async function loadDesk(){
  allStays=await getFrontDeskStays();
  await renderConnectionRequests();
  await renderMyClients();
  updateStats();
  renderQueue();
}
async function openDesk(){
  try{
    managerMessage.textContent="Opening the Concierge Desk...";
    const email=document.getElementById("managerEmail").value.trim(), password=document.getElementById("managerPassword").value;
    if(!email||!password){managerMessage.textContent="Add email and password.";return;}
    await signInWithEmail(email,password);
    const profile=await getCurrentProfile();
    currentManagerProfile=profile;
    if(!profile||!isPractitionerLevel(profile)){
      replacePageWithPhaseTwoGate({
        featureName:"Concierge Desk",
        title:"Opening in Phase 2",
        copy:"The Concierge Desk will open in Phase 2 of beta testing for practitioner-level users. Phase 1 is focused on guest check-in, Suite, Lounge, and Flow Map.",
      });
      return;
    }
    clockInContext=getClockInContext();
    loginCard.classList.add("hidden");dashboard.classList.remove("hidden");
    updateSuiteReturn();
    updateTodayFlow();
    await loadDesk();
  }catch(error){managerMessage.textContent=error.message;}
}
async function autoOpenExistingManager(){
  try{
    const profile=await getCurrentProfile();
    if(profile && !isPractitionerLevel(profile)){
      replacePageWithPhaseTwoGate({
        featureName:"Concierge Desk",
        title:"Opening in Phase 2",
        copy:"The Concierge Desk will open in Phase 2 of beta testing for practitioner-level users. Phase 1 is focused on guest check-in, Suite, Lounge, and Flow Map.",
      });
      return;
    }
    if(!profile) return;
    currentManagerProfile=profile;
    clockInContext=getClockInContext();
    if(loginCard) loginCard.classList.add("hidden");
    if(dashboard) dashboard.classList.remove("hidden");
    updateSuiteReturn();
    updateTodayFlow();
    await loadDesk();
  }catch(error){
    console.warn("Auto Concierge open skipped.",error);
  }
}

renderBetaPractitionerPanel();
autoOpenExistingManager();

document.getElementById("managerSignInButton").addEventListener("click",openDesk);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));

if(goToSuiteButton) goToSuiteButton.addEventListener("click",goToSuite);
if(initiationHallButton) initiationHallButton.addEventListener("click",markInitiationHallClockIn);
