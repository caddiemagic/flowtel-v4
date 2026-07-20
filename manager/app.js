import { signInWithEmail, signUpWithEmail, signOut } from "../shared/auth.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js?v=0.4.1";
import { isPractitionerLevel } from "../shared/beta-access.js";
import { ownerRecognizeTeamMember, listAdminTeamMapPresences } from "../shared/team-map.js?v=0.10.56";
import { getFrontDeskStays, witnessStay, prepareRoomAfterCheckout, clockOutPractitioner, getFlowFmInitiationStatus, listConnectionRequestsForPractitioner, connectWithGuest, listMyClients, getTodayStayForClient, currentUserHasConciergeAccess } from "../shared/flowtel.js?v=0.10.50";
import { listCaddieReviewRequests, completeCaddieReviewRequest } from "../shared/caddie-magic-reviews.js?v=0.4.4";
import { listCompassPlayers } from "../shared/caddie-magic-compass.js?v=0.4.4";
import { listUpcomingGolfEvents } from "../shared/caddie-magic-schedule.js?v=0.4.4";
import { moonCycleForDate, adjacentMoonCycle, moonCycleDays, moonLabelForDate, normalizeCaddieMoonPhase, shortCalendarDate } from "../shared/caddie-magic-moon-calendar.js?v=0.4.4";
import { createPlayerInvitation, listPlayerInvitations, listCaddieMagicPlayers, revokePlayerInvitation, setCaddieMagicPlayerAccess, buildPlayerInviteUrl } from "../shared/caddie-magic-access.js?v=0.4.4";
import { getHonorsDashboard, getHonorsLedger, honorsCalculation, listHonorsPractitioners, recordHonorsEntry } from "../shared/flowtel-honors.js?v=0.10.56";
import { createMailboxDownloadUrl, listAdminPriestessMailbox, markMailboxFileReceived, returnEditedAudio } from "../shared/priestess-mailbox.js?v=0.10.56";

const loginCard=document.getElementById("loginCard"), dashboard=document.getElementById("dashboard"), queue=document.getElementById("arrivalQueue"), managerMessage=document.getElementById("managerMessage");
const suiteReturnCard=document.getElementById("suiteReturnCard"), goToSuiteButton=document.getElementById("goToSuiteButton"), suiteReturnNote=document.getElementById("suiteReturnNote");
const initiationHallButton=document.getElementById("initiationHallButton"), initiationHallNote=document.getElementById("initiationHallNote");
let allStays=[], activeFilter="queue";
let caddiePlayers=[];
let caddiePlayerInvitations=[];
let caddiePlayerAccessAvailable=true;
let caddieReviewRequests=[];
let caddieReviewServiceAvailable=true;
let caddieCompassPlayers=[];
let caddieCompassServiceAvailable=true;
let upcomingGolfEvents=[];
let upcomingGolfServiceAvailable=true;
let upcomingGolfCalendarCycleStart="";
let currentConnectionRequestsCount=0;
let currentClientsCount=0;
let clockInContext=null;
let currentManagerProfile=null;
let adminTeamMapRows=[];
let adminTeamMapServiceAvailable=true;
let honorsPractitioners=[];
let honorsDashboardRows=[];
let honorsLedgerRows=[];
let honorsServiceAvailable=true;
let priestessMailboxRows=[];
let priestessMailboxServiceAvailable=true;
let deskRefreshTimer=null;
let deskRefreshInFlight=false;
const DESK_REFRESH_INTERVAL_MS=45000;
const boundConnectionButtons=new WeakSet();
const boundTeamMembershipButtons=new WeakSet();
const adminTeamMapDialog=document.getElementById("adminTeamMapDialog");
const adminTeamMapDialogClose=document.getElementById("adminTeamMapDialogClose");
const adminTeamMapDialogContent=document.getElementById("adminTeamMapDialogContent");

function isOwnerOrAdmin(profile=currentManagerProfile){
  return ["owner","admin"].includes(String(profile?.role || "").toLowerCase());
}

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
    startDeskAutoRefresh();
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


function normalizedMembership(value){
  return String(value || "").trim().toLowerCase().replace(/[^a-z]/g,"");
}

function isRecognizedConciergeTeamProfile(profile={}){
  const membership=normalizedMembership(profile.membership_type);
  const role=String(profile.role || "").trim().toLowerCase();
  return Number(profile.membership_rank || 0)>=2
    || membership==="council"
    || membership==="flowfm"
    || membership.startsWith("flowfm")
    || ["practitioner","admin","owner"].includes(role)
    || !!profile.flowfm_started_at
    || profile.is_initiated===true;
}

function ownerReceivesAllTurndownRequests(){
  return isOwnerOrAdmin(currentManagerProfile);
}

function assignedWingForQueue(){
  // Phase 1 owner routing: the owner Concierge receives every active request.
  // Future practitioner access keeps the established opposite-wing assignment.
  if(ownerReceivesAllTurndownRequests()) return null;
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
    setText("deskAssignmentNote", isOwnerOrAdmin()
      ? "Owner access is open. View beta guests and mentor requests here, or return to your Suite to clock in for a wing assignment."
      : "Return to your Suite to check in, then clock into the Concierge Desk for a wing assignment.");
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
  return isOpenStay(stay)
    && stayFlowtelDate(stay)===currentFlowtelDate()
    && hasTurndownRequest(stay)
    && !isTurndownFulfilled(stay)
    && isAssignedToPractitioner(stay);
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
  if(["clients","caddie-players","caddie-reviews","caddie-compass","upcoming-golf","admin-team-map","honors","priestess-mailbox"].includes(activeFilter)) return [];
  return allStays;
}
function setText(id,value){const el=document.getElementById(id);if(el) el.textContent=value;}

function updateStats(){
  const awaitingCount=awaitingTurndownStays().length;
  const inHouse=todayOpenStays().length;
  const extendedCount=allStays.filter(isExtended).length;

  const caddieReviewCount=caddieReviewRequests.filter(request=>request.status==="requested").length;
  const caddieInviteCount=caddiePlayerInvitations.filter(invite=>invite.status==="invited").length;
  const caddieCompassReplyCount=caddieCompassPlayers.filter(player=>player.needs_reply).length;
  const upcomingGolfCount=upcomingGolfEvents.filter(event=>String(event.date_end||event.date_start)>=managerTodayISO()).length;
  const honorsAvailable=honorsDashboardRows.reduce((sum,row)=>sum+(Number(row.available_points)||0),0);
  const mailboxAwaiting=priestessMailboxRows.filter(row=>row.direction==="to_admin" && !row.received_at).length;

  setText("awaitingTurndownCount",awaitingCount);
  setText("caddiePlayerCount",caddiePlayers.filter(player=>player.caddie_magic_access).length);
  setText("caddieInviteCount",caddieInviteCount);
  setText("caddieReviewCount",caddieReviewCount);
  setText("caddieCompassCount",caddieCompassReplyCount);
  setText("caddieCompassPlayerCount",caddieCompassPlayers.length);
  setText("upcomingGolfCount",upcomingGolfCount);
  setText("guestsInHouse",inHouse);
  setText("extendedStay",extendedCount);
  setText("clientsCount",currentClientsCount);
  setText("clientConnectionCount",currentConnectionRequestsCount);
  setText("adminTeamMapCount",adminTeamMapRows.length);
  setText("honorsAvailablePoints",formatPoints(honorsAvailable));
  setText("honorsPractitionerCount",honorsDashboardRows.length);
  setText("priestessMailboxCount",mailboxAwaiting);

  const queueCard=document.querySelector(".queue");
  if(queueCard) queueCard.classList.toggle("has-requests",activeFilter==="queue" && awaitingCount>0);

  const turndownCard=document.querySelector('[data-filter="queue"]');
  if(turndownCard) turndownCard.classList.toggle("has-alert",awaitingCount>0);

  const caddiePlayersCard=document.querySelector('[data-filter="caddie-players"]');
  if(caddiePlayersCard) caddiePlayersCard.classList.toggle("has-alert",caddieInviteCount>0);

  const caddieReviewCard=document.querySelector('[data-filter="caddie-reviews"]');
  if(caddieReviewCard) caddieReviewCard.classList.toggle("has-alert",caddieReviewCount>0);

  const caddieCompassCard=document.querySelector('[data-filter="caddie-compass"]');
  if(caddieCompassCard) caddieCompassCard.classList.toggle("has-alert",caddieCompassReplyCount>0);

  const upcomingGolfCard=document.querySelector('[data-filter="upcoming-golf"]');
  if(upcomingGolfCard) upcomingGolfCard.classList.toggle("has-alert",upcomingGolfCount>0);

  const clientsCard=document.querySelector('[data-filter="clients"]');
  if(clientsCard) clientsCard.classList.toggle("has-alert",currentConnectionRequestsCount>0);

  const mailboxCard=document.querySelector('[data-filter="priestess-mailbox"]');
  if(mailboxCard) mailboxCard.classList.toggle("has-alert",mailboxAwaiting>0);

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
    "queue":["AWAITING TURNDOWN","Guests Awaiting Turndown Service",ownerReceivesAllTurndownRequests()
      ? "Every active request from today’s Flowtel is routed to the owner Concierge."
      : "These guests are in your assigned wing and have requested extra care."],
    "caddie-players":["CADDIE MAGIC PLAYERS","Private Beta Invitations + Player Access","Invite player-only testers, copy their clubhouse link, and manage Caddie Magic access without opening Flowtel."],
    "caddie-reviews":["CADDIE MAGIC","Players Awaiting a Caddie Review","Review their Score Map, study the patterns, and send a private Caddie Note back."],
    "caddie-compass":["CADDIE COMPASS","Assignments + Messages","Open each player’s five-club map, create assignments, and reply to private Messages."],
    "upcoming-golf":["UPCOMING GOLF","Caddie Magic Moon Calendar","See upcoming rounds, tournaments, and trips across each moon-to-moon cycle."],
    "clients":["MENTOR RELATIONSHIPS","Your Clients + Mentor Requests","Connected clients and new mentor requests live here."],
    "admin-team-map":["ADMIN TEAM MAP","The Flowtel in Motion","Every eligible team member who has checked in during the last 28 Flowtel Days appears in her current calculated Inner Season."],
    "honors":["FLOWTEL HONORS","Contribution, Points + Redemption Ledger","Record 77/23 contributions, direct-line Honors, bonuses, adjustments, and redemptions without rewriting history."],
    "priestess-mailbox":["PRIESTESS MAILBOX","Audio Handoffs + Returned Files","Download practitioner recordings, mark them received, and return edited audio through the same private thread."],
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
  if(!suiteReturnCard || !isPractitionerLevel(currentManagerProfile)) return;
  const stay=clockInContext || getCachedSuiteStay();
  suiteReturnCard.classList.remove("hidden");

  if(stay){
    const room=roomLabelForDay(stayActualDay(stay));
    if(suiteReturnNote){
      suiteReturnNote.textContent=`Room ${room} is open. Clock out when you're ready to return to your Suite.`;
    }
    if(goToSuiteButton) goToSuiteButton.textContent="Clock Out";
    return;
  }

  if(suiteReturnNote){
    suiteReturnNote.textContent="Return to your Suite to check in, then clock into the Concierge Desk for a wing assignment.";
  }
  if(goToSuiteButton) goToSuiteButton.textContent="Return to Suite";
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
        <p>Wing: ${stay.wing||"Not assigned"}</p>
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
      ${showAction
        ? `<button data-id="${stay.id}" data-action="${action}">${actionLabel}</button>`
        : mode==="completed"
          ? `<span class="completed-pill">Completed</span>`
          : mode==="in-house" && ownerReceivesAllTurndownRequests() && !isRecognizedConciergeTeamProfile(stay.profiles || {})
            ? `<button type="button" data-recognize-team-member="${stay.client_id}">Add to Concierge Team</button>`
            : ""}
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


function caddieAccessDate(value){
  if(!value) return "—";
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value));
}

function renderCaddiePlayerRow(player){
  const name=player.player_name || player.email || "Caddie Magic Player";
  const enabled=player.caddie_magic_access===true;
  return `
    <article class="guest-row caddie-player-row">
      <div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(player.email || "")} · Player-only access ${enabled ? "active" : "paused"}${player.flowtel_access ? " · Also has Flowtel access" : " · Flowtel blocked"}</p>
      </div>
      <div class="caddie-player-actions">
        ${player.player_profile_id ? `<a href="/caddie-magic/score-map/?player=${encodeURIComponent(player.player_profile_id)}&from=manager">Open Score Map</a>` : ""}
        <button type="button" data-toggle-caddie-player="${player.user_id}" data-enabled="${enabled ? "1" : "0"}">${enabled ? "Pause Access" : "Restore Access"}</button>
      </div>
    </article>`;
}

function renderCaddieInvitationRow(invite){
  const name=[invite.first_name,invite.last_name].filter(Boolean).join(" ") || invite.email;
  const isOpen=invite.status==="invited";
  const inviteUrl=buildPlayerInviteUrl(invite.invite_code, invite.email);
  return `
    <article class="guest-row caddie-invite-row ${isOpen ? "is-open" : ""}">
      <div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(invite.email)} · ${escapeHtml(invite.status)} · Invited ${escapeHtml(caddieAccessDate(invite.created_at))}</p>
        ${isOpen ? `<code>${escapeHtml(inviteUrl)}</code>` : ""}
      </div>
      <div class="caddie-player-actions">
        ${isOpen ? `<button type="button" data-copy-caddie-invite="${escapeHtml(invite.invite_code)}" data-invite-email="${escapeHtml(invite.email)}">Copy Invite Link</button><button type="button" data-revoke-caddie-invite="${invite.invitation_id}">Revoke</button>` : ""}
      </div>
    </article>`;
}

function renderCaddiePlayersQueue(){
  if(!caddiePlayerAccessAvailable){
    queue.innerHTML="<p>Player-Only Access is not installed yet. Run database/migration-044-caddie-magic-player-only-access-private-beta.sql.</p>";
    return;
  }
  const openInvites=caddiePlayerInvitations.filter(invite=>invite.status==="invited");
  queue.innerHTML=`
    <section class="caddie-invite-builder">
      <p class="eyebrow">INVITE A PLAYER</p>
      <form id="caddieInviteForm" class="caddie-invite-form">
        <label>Email<input id="caddieInviteEmail" type="email" required placeholder="player@example.com"></label>
        <label>First Name<input id="caddieInviteFirstName" type="text" placeholder="First"></label>
        <label>Last Name<input id="caddieInviteLastName" type="text" placeholder="Last"></label>
        <label>Expires <span>Optional</span><input id="caddieInviteExpires" type="date"></label>
        <button type="submit">Create Player Invite</button>
      </form>
      <p id="caddieInviteMessage"></p>
    </section>
    <section class="relationship-queue">
      <section>
        <p class="eyebrow">ACTIVE PLAYERS</p>
        ${caddiePlayers.length ? caddiePlayers.map(renderCaddiePlayerRow).join("") : "<p>No Caddie Magic players have activated yet.</p>"}
      </section>
      <section>
        <p class="eyebrow">INVITATIONS · ${openInvites.length} OPEN</p>
        ${caddiePlayerInvitations.length ? caddiePlayerInvitations.map(renderCaddieInvitationRow).join("") : "<p>No player invitations yet.</p>"}
      </section>
    </section>`;
  bindCaddiePlayerActions();
}

function bindCaddiePlayerActions(){
  document.getElementById("caddieInviteForm")?.addEventListener("submit",async(event)=>{
    event.preventDefault();
    const message=document.getElementById("caddieInviteMessage");
    if(message) message.textContent="Creating the player invitation...";
    try{
      const expiresValue=document.getElementById("caddieInviteExpires")?.value;
      const invite=await createPlayerInvitation({
        email:document.getElementById("caddieInviteEmail")?.value,
        firstName:document.getElementById("caddieInviteFirstName")?.value,
        lastName:document.getElementById("caddieInviteLastName")?.value,
        expiresAt:expiresValue ? `${expiresValue}T23:59:59` : null,
      });
      await navigator.clipboard?.writeText(buildPlayerInviteUrl(invite.invite_code, invite.email));
      if(message) message.textContent="Invitation created. The private player link was copied to your clipboard.";
      await loadCaddiePlayerAccess();
      renderCaddiePlayersQueue();
      updateStats();
    }catch(error){
      if(message) message.textContent=error?.message || "The player invitation could not be created.";
    }
  });

  document.querySelectorAll("[data-copy-caddie-invite]").forEach(button=>button.addEventListener("click",async()=>{
    await navigator.clipboard.writeText(buildPlayerInviteUrl(button.dataset.copyCaddieInvite, button.dataset.inviteEmail || ""));
    button.textContent="Copied";
  }));

  document.querySelectorAll("[data-revoke-caddie-invite]").forEach(button=>button.addEventListener("click",async()=>{
    if(!window.confirm("Revoke this Caddie Magic invitation?")) return;
    await revokePlayerInvitation(button.dataset.revokeCaddieInvite);
    await loadCaddiePlayerAccess();
    renderCaddiePlayersQueue();
    updateStats();
  }));

  document.querySelectorAll("[data-toggle-caddie-player]").forEach(button=>button.addEventListener("click",async()=>{
    const currentlyEnabled=button.dataset.enabled==="1";
    await setCaddieMagicPlayerAccess(button.dataset.toggleCaddiePlayer,!currentlyEnabled);
    await loadCaddiePlayerAccess();
    renderCaddiePlayersQueue();
    updateStats();
  }));
}

async function loadCaddiePlayerAccess(){
  try{
    [caddiePlayers,caddiePlayerInvitations]=await Promise.all([
      listCaddieMagicPlayers(),
      listPlayerInvitations(),
    ]);
    caddiePlayerAccessAvailable=true;
  }catch(error){
    console.warn("Caddie Magic player access is not available yet.",error);
    caddiePlayers=[];
    caddiePlayerInvitations=[];
    caddiePlayerAccessAvailable=false;
  }
}

function caddieReviewTime(value){
  if(!value) return "Requested recently";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));
}

function caddieReviewPlayerName(request){
  return request?.player_name || request?.player_email || "Caddie Magic Player";
}

function renderCaddieReviewRow(request,{completed=false}={}){
  const scoreMapUrl=`/caddie-magic/score-map/?player=${encodeURIComponent(request.player_profile_id)}&from=manager`;
  return `
    <article class="guest-row caddie-review-row ${completed ? "caddie-review-completed" : ""}">
      <div>
        <h3>${escapeHtml(caddieReviewPlayerName(request))}</h3>
        <p>${completed ? "Caddie Review completed" : "Requested a review of scores and swing thoughts"} · ${escapeHtml(caddieReviewTime(completed ? request.completed_at : request.requested_at))}</p>
        ${request.player_email ? `<p>${escapeHtml(request.player_email)}</p>` : ""}
      </div>
      <div class="caddie-review-actions">
        <a href="${scoreMapUrl}">Open Scorecard</a>
        ${completed
          ? `<span class="completed-pill">Note Sent</span>`
          : `<button type="button" data-complete-caddie-review="${request.request_id}">Send Caddie Note</button>`}
      </div>
    </article>
  `;
}

function renderCaddieReviewQueue(){
  if(!caddieReviewServiceAvailable){
    queue.innerHTML="<p>Caddie Review Service is not installed yet. Run database/migration-041-caddie-magic-review-service.sql.</p>";
    return;
  }

  const awaiting=caddieReviewRequests.filter(request=>request.status==="requested");
  const completed=caddieReviewRequests.filter(request=>request.status==="completed").slice(0,20);

  if(!awaiting.length && !completed.length){
    queue.innerHTML="<p>No Caddie Review requests yet.</p>";
    return;
  }

  queue.innerHTML=`
    <section class="queue-section active-requests">
      <p class="queue-section-label">Open Requests</p>
      ${awaiting.length ? awaiting.map(request=>renderCaddieReviewRow(request)).join("") : "<p>No players are waiting for a review.</p>"}
    </section>
    <section class="queue-section completed-requests">
      <p class="queue-section-label">Completed Reviews</p>
      ${completed.length ? completed.map(request=>renderCaddieReviewRow(request,{completed:true})).join("") : "<p>No completed Caddie Reviews yet.</p>"}
    </section>
  `;

  bindCaddieReviewActions();
}

function bindCaddieReviewActions(){
  document.querySelectorAll("[data-complete-caddie-review]").forEach(button=>{
    button.addEventListener("click",async()=>{
      const note=window.prompt("Leave a private Caddie Note with the patterns you see in this player’s scores and swing thoughts.");
      if(note===null) return;
      if(!String(note).trim()){
        if(managerMessage) managerMessage.textContent="Leave a Caddie Note before completing the review.";
        return;
      }

      const originalText=button.textContent;
      button.disabled=true;
      button.textContent="Sending Note...";
      try{
        await completeCaddieReviewRequest(button.dataset.completeCaddieReview,note);
        if(managerMessage) managerMessage.textContent="Caddie Review complete. The private note is waiting in the player’s profile.";
        await loadCaddieReviews();
        updateStats();
        renderQueue();
      }catch(error){
        console.error("Caddie Review completion failed.",error);
        button.disabled=false;
        button.textContent=originalText;
        if(managerMessage) managerMessage.textContent=error?.message || "The Caddie Review could not be completed.";
      }
    });
  });
}

async function loadCaddieReviews(){
  try{
    caddieReviewRequests=await listCaddieReviewRequests();
    caddieReviewServiceAvailable=true;
  }catch(error){
    console.warn("Caddie Review requests are not available yet.",error);
    caddieReviewRequests=[];
    caddieReviewServiceAvailable=false;
  }
}

function renderCaddieCompassPlayer(player){
  const baseUrl=`/caddie-magic/compass/admin/?player=${encodeURIComponent(player.player_profile_id)}&from=manager`;
  const url=player.needs_reply ? `${baseUrl}#messages` : baseUrl;
  const clubs=[player.north_club,player.east_club,player.west_club,player.south_club].filter(Boolean).join(" · ");
  return `
    <article class="guest-row caddie-compass-row ${player.needs_reply ? "needs-reply" : ""}">
      <div>
        <h3>${escapeHtml(player.player_name || player.player_email || "Caddie Magic Player")}</h3>
        <p>${escapeHtml(clubs || "Compass saved")}</p>
        <p>${Number(player.active_assignment_count || 0)} active assignment${Number(player.active_assignment_count || 0)===1?"":"s"} · ${Number(player.completed_assignment_count || 0)} completed</p>
      </div>
      <div class="caddie-compass-actions">
        ${player.needs_reply ? `<span class="compass-reply-pill">Message Waiting</span>` : `<span class="completed-pill">Compass Open</span>`}
        <a href="${url}">${player.needs_reply ? "Reply to Message" : "Open Compass"}</a>
      </div>
    </article>
  `;
}

function renderCaddieCompassQueue(){
  if(!caddieCompassServiceAvailable){
    queue.innerHTML="<p>Caddie Compass is not installed yet. Run database/migration-042-caddie-magic-compass-assignments-dispatches.sql.</p>";
    return;
  }
  if(!caddieCompassPlayers.length){
    queue.innerHTML="<p>No players have saved a Caddie Compass yet.</p>";
    return;
  }
  queue.innerHTML=`
    <section class="queue-section active-requests">
      <p class="queue-section-label">Compass Players</p>
      ${caddieCompassPlayers.map(renderCaddieCompassPlayer).join("")}
    </section>
  `;
}

async function loadCaddieCompassPlayers(){
  try{
    caddieCompassPlayers=await listCompassPlayers();
    caddieCompassServiceAvailable=true;
  }catch(error){
    console.warn("Caddie Compass players are not available yet.",error);
    caddieCompassPlayers=[];
    caddieCompassServiceAvailable=false;
  }
}

function managerTodayISO(){return flowtelDateISO(new Date());}
function managerAddDaysISO(iso,days){
  const [year,month,day]=String(iso).slice(0,10).split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
function managerDateISO(date){
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,"0");
  const day=String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}
function managerGolfDate(value){
  if(!value) return "";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(`${String(value).slice(0,10)}T12:00:00`));
}
function managerGolfType(value){return ({round:"Round",tournament:"Tournament",golf_trip:"Golf Trip"})[value] || String(value||"").replaceAll("_"," ");}
function managerShortMoonPhase(value){return normalizeCaddieMoonPhase(value);}
function golfEventOccursOn(event,iso){return String(event.date_start)<=iso && String(event.date_end)>=iso;}
function golfEventDateRange(event){return event.date_start===event.date_end ? managerGolfDate(event.date_start) : `${managerGolfDate(event.date_start)} – ${managerGolfDate(event.date_end)}`;}
function golfEventForecastForDate(event,iso){
  const rows=Array.isArray(event.moon_forecast)?event.moon_forecast:[];
  return rows.find(row=>row.date===iso)||null;
}
function renderGolfCalendarDay(day){
  const iso=day.date;
  const dayEvents=upcomingGolfEvents.filter(event=>golfEventOccursOn(event,iso));
  const classes=["golf-calendar-day"];
  if(iso===managerTodayISO()) classes.push("is-today");
  const eventBadge=day.exactEvent?`<span class="golf-calendar-moon-event">${escapeHtml(day.exactEvent)}</span>`:"";
  const chips=dayEvents.slice(0,3).map(event=>{
    const forecast=golfEventForecastForDate(event,iso);
    const url=`/caddie-magic/compass/admin/?player=${encodeURIComponent(event.player_profile_id)}&from=manager`;
    const moon=forecast ? `Day ${forecast.moon_day} · ${moonLabelForDate(iso,forecast.moon_phase)}` : `Moon Day ${day.moonDay}`;
    return `<a class="golf-calendar-chip" href="${url}" title="${escapeHtml(event.player_name)} · ${escapeHtml(event.event_title)} · ${escapeHtml(moon)}"><strong>${escapeHtml(event.player_name)}</strong><span>${escapeHtml(event.event_title)}</span></a>`;
  }).join("");
  const more=dayEvents.length>3?`<span class="golf-calendar-more">+${dayEvents.length-3} more</span>`:"";
  return `<div class="${classes.join(" ")}"><div class="golf-calendar-date-line"><span class="golf-calendar-moon-day">Day ${day.moonDay}</span><span class="golf-calendar-date">${escapeHtml(shortCalendarDate(iso))}</span></div>${eventBadge}<div class="golf-calendar-events">${chips}${more}</div></div>`;
}
function renderUpcomingGolfList(){
  const upcoming=[...upcomingGolfEvents].sort((a,b)=>String(a.date_start).localeCompare(String(b.date_start))).slice(0,20);
  if(!upcoming.length) return `<p>No upcoming rounds, tournaments, or golf trips have been added yet.</p>`;
  return upcoming.map(event=>{
    const place=[event.course,event.location].filter(Boolean).join(" · ");
    const forecast=Array.isArray(event.moon_forecast)?event.moon_forecast:[];
    const url=`/caddie-magic/compass/admin/?player=${encodeURIComponent(event.player_profile_id)}&from=manager`;
    return `<article class="upcoming-golf-row"><div><span>${escapeHtml(managerGolfType(event.event_type))} · ${escapeHtml(golfEventDateRange(event))}</span><h3>${escapeHtml(event.event_title)}</h3><p>${escapeHtml(event.player_name)}${place?` · ${escapeHtml(place)}`:""}</p><div class="upcoming-golf-moons">${forecast.map(day=>`<small>${escapeHtml(shortCalendarDate(day.date))} · Day ${escapeHtml(day.moon_day)} · ${escapeHtml(moonLabelForDate(day.date,day.moon_phase))}</small>`).join("")}</div></div><a href="${url}">Open Player Compass</a></article>`;
  }).join("");
}
function currentGolfMoonCycle(){
  if(!upcomingGolfCalendarCycleStart) upcomingGolfCalendarCycleStart=moonCycleForDate(managerTodayISO()).startDate;
  return moonCycleForDate(upcomingGolfCalendarCycleStart);
}
function bindUpcomingGolfCalendarActions(){
  document.querySelectorAll("[data-golf-moon-step]").forEach(button=>button.addEventListener("click",()=>{
    const cycle=adjacentMoonCycle(currentGolfMoonCycle().startDate,Number(button.dataset.golfMoonStep||0));
    upcomingGolfCalendarCycleStart=cycle.startDate;
    renderUpcomingGolfCalendar();
  }));
  document.querySelector("[data-golf-moon-today]")?.addEventListener("click",()=>{
    upcomingGolfCalendarCycleStart=moonCycleForDate(managerTodayISO()).startDate;
    renderUpcomingGolfCalendar();
  });
}
function renderUpcomingGolfCalendar(){
  if(!upcomingGolfServiceAvailable){queue.innerHTML="<p>Upcoming Golf is not installed yet. Run database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql.</p>";return;}
  const cycle=currentGolfMoonCycle();
  const dayCells=moonCycleDays(cycle).map(renderGolfCalendarDay);
  while(dayCells.length%7!==0) dayCells.push('<div class="golf-calendar-day is-empty" aria-hidden="true"></div>');
  queue.innerHTML=`<section class="upcoming-golf-calendar"><div class="golf-calendar-toolbar"><div><p class="queue-section-label">Moon Calendar</p><h3>${escapeHtml(cycle.name)}</h3><p class="golf-calendar-cycle-range">${escapeHtml(shortCalendarDate(cycle.startDate))} – ${escapeHtml(shortCalendarDate(cycle.endDate))} · ${cycle.year}</p></div><div class="golf-calendar-actions"><button type="button" data-golf-moon-step="-1" aria-label="Previous moon">←</button><button type="button" data-golf-moon-today>Current Moon</button><button type="button" data-golf-moon-step="1" aria-label="Next moon">→</button></div></div><div class="golf-calendar-grid">${dayCells.join("")}</div><div class="golf-calendar-key"><span>New Moon</span><span>First Quarter Moon</span><span>Full Moon</span><span>Last Quarter Moon</span></div></section><section class="queue-section upcoming-golf-list"><p class="queue-section-label">Upcoming Events</p>${renderUpcomingGolfList()}</section>`;
  bindUpcomingGolfCalendarActions();
}
async function loadUpcomingGolfEvents(){
  try{
    upcomingGolfEvents=await listUpcomingGolfEvents(managerTodayISO(),managerAddDaysISO(managerTodayISO(),540));
    upcomingGolfServiceAvailable=true;
  }catch(error){
    console.warn("Upcoming Golf is not available yet.",error);
    upcomingGolfEvents=[];
    upcomingGolfServiceAvailable=false;
  }
}


function formatPoints(value=0){
  const number=Number(value)||0;
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(number);
}
function formatMoney(value=0){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value)||0);
}
function managerDateLabel(value,{withTime=false}={}){
  if(!value) return 'Not recorded';
  const raw=String(value);
  const date=/^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00Z`)
    : new Date(value);
  if(Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-US',withTime
    ? {timeZone:FLOWTEL_TIME_ZONE,month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}
    : {timeZone:FLOWTEL_TIME_ZONE,month:'short',day:'numeric',year:'numeric'}).format(date);
}
function safeManagerImage(value){
  const raw=String(value||'').trim();
  if(!raw) return '/assets/flowtel-pinkrose.png';
  if(raw.startsWith('/')) return raw;
  try{
    const url=new URL(raw,window.location.origin);
    return ['http:','https:'].includes(url.protocol)?url.href:'/assets/flowtel-pinkrose.png';
  }catch(error){ return '/assets/flowtel-pinkrose.png'; }
}
function normalizedMapSeason(value){
  const clean=String(value||'').toLowerCase().replace(/[^a-z]/g,'');
  return {innerwinter:'Inner Winter',winter:'Inner Winter',innerspring:'Inner Spring',spring:'Inner Spring',innersummer:'Inner Summer',summer:'Inner Summer',innerautumn:'Inner Autumn',autumn:'Inner Autumn',fall:'Inner Autumn',innerfall:'Inner Autumn'}[clean]||'Inner Winter';
}
function displayCycleDay(value){
  const day=Number(value);
  if(!Number.isFinite(day)) return '—';
  return day>=28?'28+':String(Math.max(1,day));
}
function adminMapPortrait(row){
  const name=row.display_name||'Flow FM Priestess';
  return `<button class="admin-map-presence ${row.checked_in_today?'is-here-today':''}" type="button" data-admin-map-member="${escapeHtml(row.member_id)}">
    <span class="admin-map-photo"><img src="${escapeHtml(safeManagerImage(row.profile_photo_url))}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" /></span>
    <strong>${escapeHtml(name)}</strong>
    <small>Cycle Day ${escapeHtml(displayCycleDay(row.cycle_day))}</small>
    <em>${row.checked_in_today?'HERE TODAY':`LAST SEEN ${escapeHtml(managerDateLabel(row.last_checkin_date).toUpperCase())}`}</em>
  </button>`;
}
function adminMapClients(row){
  if(Array.isArray(row.current_clients)) return row.current_clients;
  if(typeof row.current_clients==='string'){
    try{ return JSON.parse(row.current_clients)||[]; }catch(error){ return []; }
  }
  return [];
}
function openAdminMapProfile(memberId){
  const row=adminTeamMapRows.find(item=>String(item.member_id)===String(memberId));
  if(!row||!adminTeamMapDialog||!adminTeamMapDialogContent) return;
  const clients=adminMapClients(row);
  adminTeamMapDialogContent.innerHTML=`<article class="admin-team-profile-card">
    <div class="admin-team-profile-photo"><img src="${escapeHtml(safeManagerImage(row.profile_photo_url))}" alt="${escapeHtml(row.display_name||'Flow FM Priestess')}" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" /></div>
    <p class="eyebrow">28-DAY TEAM MAP</p>
    <h2>${escapeHtml(row.display_name||'Flow FM Priestess')}</h2>
    <p class="admin-team-priestess-title">${escapeHtml(row.priestess_title||'Flow FM Priestess')}</p>
    <div class="admin-team-profile-pills"><span>Cycle Day ${escapeHtml(displayCycleDay(row.cycle_day))}</span><span>${escapeHtml(normalizedMapSeason(row.actual_inner_season))}</span><span>Last check-in ${escapeHtml(managerDateLabel(row.last_checkin_date))}</span></div>
    <section><p class="eyebrow">CURRENT CLIENTS · ${escapeHtml(row.current_client_count||0)}</p>${clients.length?`<div class="admin-team-client-list">${clients.map(client=>`<button type="button" data-view-client-data="${escapeHtml(client.client_id)}">${escapeHtml(client.display_name||'Flowtel Guest')}</button>`).join('')}</div>`:'<p class="admin-team-empty">No current clients are connected.</p>'}</section>
    <section><p class="eyebrow">UPCOMING CALLS · ${escapeHtml(row.upcoming_call_count||0)}</p><p class="admin-team-empty">${escapeHtml(row.upcoming_calls_note||'Calendar connection coming soon.')}</p></section>
  </article>`;
  bindClientDataButtons(adminTeamMapDialogContent);
  if(typeof adminTeamMapDialog.showModal==='function') adminTeamMapDialog.showModal();
  else adminTeamMapDialog.setAttribute('open','');
}
function renderAdminTeamMap(){
  if(!adminTeamMapServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>The 28-Day Team Map is waiting for migration 046.</h3><p>No member-facing Team Map data has been changed.</p></div>';
    return;
  }
  const seasons=['Inner Winter','Inner Spring','Inner Summer','Inner Autumn'];
  const labels={
    'Inner Winter':'WEST · INNER WINTER',
    'Inner Spring':'SOUTH · INNER SPRING',
    'Inner Summer':'EAST · INNER SUMMER',
    'Inner Autumn':'NORTH · INNER AUTUMN',
  };
  queue.innerHTML=`<section class="admin-team-map-view">
    <header class="admin-team-map-summary"><div><p class="eyebrow">LAST 28 FLOWTEL DAYS</p><h3>${adminTeamMapRows.length} ${adminTeamMapRows.length===1?'Priestess has':'Priestesses have'} moved through the Flowtel.</h3><p>Portraits are placed by each woman’s calculated cycle position from her latest stay. This owner view does not change today’s member-facing Team Map.</p></div><span>FLOWTEL TIME</span></header>
    <div class="admin-team-map-grid">${seasons.map(season=>{const rows=adminTeamMapRows.filter(row=>normalizedMapSeason(row.actual_inner_season)===season);return `<section class="admin-team-quadrant season-${season.split(' ')[1].toLowerCase()}"><header><p>${labels[season]}</p><span>${rows.length}</span></header><div class="admin-team-presence-field">${rows.length?rows.map(adminMapPortrait).join(''):'<p class="admin-team-map-empty">This chamber is quiet.</p>'}</div></section>`;}).join('')}</div>
  </section>`;
  queue.querySelectorAll('[data-admin-map-member]').forEach(button=>button.addEventListener('click',()=>openAdminMapProfile(button.dataset.adminMapMember)));
}
async function loadAdminTeamMap(){
  try{
    adminTeamMapRows=await listAdminTeamMapPresences();
    adminTeamMapServiceAvailable=true;
  }catch(error){
    console.warn('Admin 28-Day Team Map is not available yet.',error);
    adminTeamMapRows=[];
    adminTeamMapServiceAvailable=false;
  }
}

function honorsTransactionLabel(value){
  return {
    practitioner_revenue:'Practitioner Revenue',
    direct_line_referral:'Direct-Line Referral',
    bonus:'Honors Bonus',
    adjustment:'Manual Adjustment',
    redemption:'Redemption',
  }[String(value||'')]||String(value||'Honors Entry').replaceAll('_',' ');
}
function honorsBalanceCard(row){
  return `<article class="honors-balance-card"><div class="honors-balance-photo"><img src="${escapeHtml(safeManagerImage(row.profile_photo_url))}" alt="" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" /></div><div><h4>${escapeHtml(row.display_name||'Flow FM Priestess')}</h4><p>${formatPoints(row.available_points)} available · ${formatPoints(row.lifetime_points)} lifetime</p></div><strong>${formatPoints(row.available_points)}</strong></article>`;
}
function honorsLedgerRow(row){
  const points=Number(row.points_delta)||0;
  return `<article class="honors-ledger-row"><div><p class="honors-ledger-type">${escapeHtml(honorsTransactionLabel(row.transaction_type))}</p><h4>${escapeHtml(row.practitioner_name||'Flow FM Priestess')}</h4><p>${escapeHtml(row.reason||row.source_transaction||'Flowtel Honors entry')} · ${escapeHtml(managerDateLabel(row.created_at,{withTime:true}))}</p>${row.source_member_name?`<p>Source: ${escapeHtml(row.source_member_name)}</p>`:''}</div><div class="honors-ledger-money">${Number(row.gross_amount)>0?`<span>${formatMoney(row.gross_amount)} gross</span><span>${formatMoney(row.flowtel_share)} Flowtel share</span>`:''}<strong class="${points<0?'is-negative':''}">${points>0?'+':''}${formatPoints(points)} Honors</strong></div></article>`;
}
function updateHonorsFormPreview(form){
  const preview=form?.querySelector('[data-honors-preview]');
  const grossFields=form?.querySelector('[data-honors-gross-fields]');
  const manualFields=form?.querySelector('[data-honors-manual-fields]');
  if(!preview) return;
  const type=form.elements.transaction_type?.value;
  const usesGross=['practitioner_revenue','direct_line_referral'].includes(type);
  grossFields?.classList.toggle('hidden',!usesGross);
  manualFields?.classList.toggle('hidden',usesGross);
  if(usesGross){
    const calculation=honorsCalculation(form.elements.gross_amount?.value||0);
    preview.textContent=`${formatMoney(calculation.grossAmount)} gross → ${formatMoney(calculation.practitionerPayout)} practitioner payout · ${formatMoney(calculation.flowtelShare)} Flowtel share · ${formatPoints(calculation.honorsPoints)} Honors points`;
  }else{
    const points=Math.abs(Number(form.elements.manual_points?.value)||0);
    preview.textContent=type==='redemption'
      ? `${formatPoints(points)} points will be recorded as a redemption.`
      : `${formatPoints(points)} Honors points will be added as an append-only ${honorsTransactionLabel(type).toLowerCase()}.`;
  }
}
function renderHonorsQueue(){
  if(!honorsServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>Flowtel Honors is waiting for migration 046.</h3><p>The Concierge Desk and existing payment pathways remain unchanged.</p></div>';
    return;
  }
  const totalAvailable=honorsDashboardRows.reduce((sum,row)=>sum+(Number(row.available_points)||0),0);
  const lifetime=honorsDashboardRows.reduce((sum,row)=>sum+(Number(row.lifetime_points)||0),0);
  const redeemed=honorsDashboardRows.reduce((sum,row)=>sum+(Number(row.redeemed_points)||0),0);
  const gross=honorsDashboardRows.reduce((sum,row)=>sum+(Number(row.gross_volume)||0),0);
  const options=honorsPractitioners.map(row=>`<option value="${escapeHtml(row.practitioner_id)}">${escapeHtml(row.display_name||row.email||'Flow FM Priestess')}</option>`).join('');
  queue.innerHTML=`<section class="honors-dashboard">
    <div class="honors-summary-grid"><article><span>Available Honors</span><strong>${formatPoints(totalAvailable)}</strong></article><article><span>Lifetime Awarded</span><strong>${formatPoints(lifetime)}</strong></article><article><span>Redeemed</span><strong>${formatPoints(redeemed)}</strong></article><article><span>Gross Tracked</span><strong>${formatMoney(gross)}</strong></article></div>
    <div class="honors-workspace">
      <form class="honors-entry-form" id="honorsEntryForm"><div class="honors-form-heading"><p class="eyebrow">RECORD CONTRIBUTION</p><h3>Flowtel remembers every contribution.</h3><p>Revenue entries automatically mirror Flowtel’s 23% share into Honors points. Bonuses, adjustments, and redemptions remain append-only ledger entries.</p></div>
        <label><span>Award Honors to</span><select name="practitioner_id" required><option value="">Choose a Priestess</option>${options}</select></label>
        <label><span>Entry type</span><select name="transaction_type"><option value="practitioner_revenue">Practitioner Revenue · 77/23</option><option value="direct_line_referral">Direct-Line Referral · 23% Honors</option><option value="bonus">Honors Bonus</option><option value="adjustment">Manual Adjustment</option><option value="redemption">Redemption</option></select></label>
        <div data-honors-gross-fields><label><span>Gross amount</span><input name="gross_amount" type="number" min="0" step="0.01" placeholder="1111.00" /></label></div>
        <div class="hidden" data-honors-manual-fields><label><span>Honors points</span><input name="manual_points" type="number" step="0.01" placeholder="23" /></label></div>
        <label><span>Source member — optional</span><select name="source_member_id"><option value="">No source member</option>${options}</select></label>
        <label><span>Transaction reference — optional</span><input name="source_transaction" maxlength="160" placeholder="Invoice, payment, retreat, or referral reference" /></label>
        <label><span>Reason / direct-line note</span><textarea name="reason" rows="3" maxlength="1000" placeholder="Why these Honors were awarded or redeemed"></textarea></label>
        <p class="honors-calculation-preview" data-honors-preview></p>
        <button type="submit">RECORD FLOWTEL HONORS</button><p class="honors-form-status" role="status"></p>
      </form>
      <section class="honors-balances"><div class="honors-section-heading"><p class="eyebrow">PRIESTESS BALANCES</p><span>${honorsDashboardRows.length}</span></div>${honorsDashboardRows.length?honorsDashboardRows.map(honorsBalanceCard).join(''):'<p class="honors-empty">No Flowtel Honors balances have been opened yet.</p>'}</section>
    </div>
    <section class="honors-ledger"><div class="honors-section-heading"><p class="eyebrow">RECENT HONORS LEDGER</p><span>${honorsLedgerRows.length}</span></div>${honorsLedgerRows.length?honorsLedgerRows.map(honorsLedgerRow).join(''):'<p class="honors-empty">The first contribution will begin the Honors ledger.</p>'}</section>
  </section>`;
  bindHonorsForm();
}
function bindHonorsForm(){
  const form=document.getElementById('honorsEntryForm');
  if(!form) return;
  form.querySelectorAll('input,select').forEach(field=>field.addEventListener('input',()=>updateHonorsFormPreview(form)));
  form.querySelectorAll('select').forEach(field=>field.addEventListener('change',()=>updateHonorsFormPreview(form)));
  updateHonorsFormPreview(form);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const status=form.querySelector('.honors-form-status');
    button.disabled=true;
    status.textContent='Recording this contribution in the Honors ledger…';
    try{
      await recordHonorsEntry({
        practitionerId:form.elements.practitioner_id.value,
        transactionType:form.elements.transaction_type.value,
        grossAmount:form.elements.gross_amount.value,
        manualPoints:form.elements.manual_points.value,
        sourceMemberId:form.elements.source_member_id.value,
        sourceTransaction:form.elements.source_transaction.value,
        reason:form.elements.reason.value,
        directLineRelationship:form.elements.transaction_type.value==='direct_line_referral'?'Direct-line contribution':'',
      });
      await loadHonorsData();
      updateStats();
      renderHonorsQueue();
      if(managerMessage) managerMessage.textContent='Flowtel Honors entry recorded.';
    }catch(error){
      console.error('Flowtel Honors entry failed.',error);
      button.disabled=false;
      status.textContent=error?.message||'This Honors entry could not be recorded yet.';
    }
  });
}
async function loadHonorsData(){
  try{
    [honorsPractitioners,honorsDashboardRows,honorsLedgerRows]=await Promise.all([
      listHonorsPractitioners(),getHonorsDashboard(),getHonorsLedger(100),
    ]);
    honorsServiceAvailable=true;
  }catch(error){
    console.warn('Flowtel Honors is not available yet.',error);
    honorsPractitioners=[];honorsDashboardRows=[];honorsLedgerRows=[];honorsServiceAvailable=false;
  }
}

function groupAdminMailboxRows(rows=[]){
  const map=new Map();
  rows.forEach(row=>{
    if(!map.has(row.thread_id)) map.set(row.thread_id,{...row,files:[]});
    map.get(row.thread_id).files.push(row);
  });
  return [...map.values()];
}
function managerFileSize(bytes=0){
  const value=Number(bytes)||0;
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
  return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
}
function mailboxFileAdminMarkup(file){
  const returned=file.direction==='to_practitioner';
  return `<article class="admin-mailbox-file ${returned?'is-return':'is-original'}"><div><p>${returned?'RETURNED TO PRIESTESS':'FROM PRIESTESS'}</p><h4>${escapeHtml(file.original_filename||'Audio file')}</h4><span>${escapeHtml(managerFileSize(file.size_bytes))} · ${escapeHtml(managerDateLabel(file.uploaded_at,{withTime:true}))}</span>${file.file_note?`<em>${escapeHtml(file.file_note)}</em>`:''}</div><div>${returned?`<span>${file.downloaded_at?'Downloaded by Priestess':'Waiting for Priestess'}</span>`:`<button type="button" data-admin-mailbox-download="${escapeHtml(file.file_id)}" data-admin-mailbox-path="${escapeHtml(file.storage_path)}">${file.received_at?'DOWNLOAD AGAIN':'DOWNLOAD + MARK RECEIVED'}</button><span>${file.received_at?`Received ${escapeHtml(managerDateLabel(file.received_at,{withTime:true}))}`:'Awaiting download'}</span>`}</div></article>`;
}
function renderPriestessMailboxQueue(){
  if(!priestessMailboxServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>The Priestess Mailbox is waiting for migration 046.</h3><p>No files are deleted, and no existing Profile Studio data has changed.</p></div>';
    return;
  }
  const threads=groupAdminMailboxRows(priestessMailboxRows);
  const awaiting=priestessMailboxRows.filter(row=>row.direction==='to_admin'&&!row.received_at).length;
  queue.innerHTML=`<section class="admin-mailbox-dashboard"><header><div><p class="eyebrow">PRIVATE AUDIO HANDOFFS</p><h3>${awaiting} ${awaiting===1?'file is':'files are'} waiting for you.</h3><p>Download the original, keep the thread intact, then return your edited audio to the same Priestess. Files remain preserved after receipt.</p></div><span>${threads.length} THREADS</span></header><div class="admin-mailbox-thread-list">${threads.length?threads.map(thread=>`<article class="admin-mailbox-thread" data-mailbox-thread="${escapeHtml(thread.thread_id)}" data-mailbox-practitioner="${escapeHtml(thread.practitioner_id)}"><header><div class="admin-mailbox-priestess"><img src="${escapeHtml(safeManagerImage(thread.profile_photo_url))}" alt="" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" /><div><p class="eyebrow">${escapeHtml(thread.practitioner_name||'Flow FM Priestess')}</p><h3>${escapeHtml(thread.subject||'Audio for Megan')}</h3><span>${escapeHtml(thread.practitioner_email||'')} · ${escapeHtml(managerDateLabel(thread.thread_created_at,{withTime:true}))}</span></div></div><strong>${escapeHtml(String(thread.thread_status||'').replaceAll('_',' '))}</strong></header>${thread.thread_message?`<p class="admin-mailbox-message">${escapeHtml(thread.thread_message)}</p>`:''}<div class="admin-mailbox-files">${thread.files.map(mailboxFileAdminMarkup).join('')}</div><div class="admin-mailbox-return"><label><span>Return edited audio</span><input type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*" data-return-audio /></label><label><span>Note to the Priestess — optional</span><input type="text" maxlength="500" placeholder="Your edited journey is ready" data-return-note /></label><button type="button" data-return-thread="${escapeHtml(thread.thread_id)}" data-return-practitioner="${escapeHtml(thread.practitioner_id)}">SEND EDITED AUDIO BACK</button><p role="status"></p></div></article>`).join(''):'<p class="honors-empty">No Priestess audio has arrived yet.</p>'}</div></section>`;
  bindAdminMailboxControls();
}
async function adminDownloadMailbox(button){
  const popup=window.open('about:blank','_blank');
  const original=button.textContent;
  button.disabled=true;button.textContent='PREPARING…';
  try{
    const url=await createMailboxDownloadUrl(button.dataset.adminMailboxPath);
    if(popup){
      popup.opener=null;
      popup.location.href=url;
    }else{
      const link=document.createElement('a');
      link.href=url;
      link.target='_blank';
      link.rel='noopener';
      link.download='';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    await markMailboxFileReceived(button.dataset.adminMailboxDownload);
    await loadPriestessMailboxData();
    updateStats();
    renderPriestessMailboxQueue();
    if(managerMessage) managerMessage.textContent='Priestess audio downloaded and marked received.';
  }catch(error){
    popup?.close();console.error(error);button.disabled=false;button.textContent=original;
    if(managerMessage) managerMessage.textContent=error?.message||'This private audio could not be prepared.';
  }
}
function bindAdminMailboxControls(){
  queue.querySelectorAll('[data-admin-mailbox-download]').forEach(button=>button.addEventListener('click',()=>adminDownloadMailbox(button)));
  queue.querySelectorAll('[data-return-thread]').forEach(button=>button.addEventListener('click',async()=>{
    const card=button.closest('[data-mailbox-thread]');
    const file=card?.querySelector('[data-return-audio]')?.files?.[0];
    const note=card?.querySelector('[data-return-note]')?.value||'';
    const status=card?.querySelector('.admin-mailbox-return p');
    const original=button.textContent;
    button.disabled=true;button.textContent='SENDING…';if(status) status.textContent='Returning this audio through the Flowtel…';
    try{
      await returnEditedAudio({threadId:button.dataset.returnThread,practitionerId:button.dataset.returnPractitioner,file,note});
      await loadPriestessMailboxData();updateStats();renderPriestessMailboxQueue();
      if(managerMessage) managerMessage.textContent='Edited audio returned to the Priestess Mailbox.';
    }catch(error){
      console.error(error);button.disabled=false;button.textContent=original;if(status) status.textContent=error?.message||'This edited audio could not be returned yet.';
    }
  }));
}
async function loadPriestessMailboxData(){
  try{
    priestessMailboxRows=await listAdminPriestessMailbox();
    priestessMailboxServiceAvailable=true;
  }catch(error){
    console.warn('Priestess Mailbox queue is not available yet.',error);
    priestessMailboxRows=[];priestessMailboxServiceAvailable=false;
  }
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

  if(activeFilter==="caddie-players"){
    renderCaddiePlayersQueue();
    return;
  }

  if(activeFilter==="caddie-reviews"){
    renderCaddieReviewQueue();
    return;
  }

  if(activeFilter==="caddie-compass"){
    renderCaddieCompassQueue();
    return;
  }

  if(activeFilter==="upcoming-golf"){
    renderUpcomingGolfCalendar();
    return;
  }

  if(activeFilter==="admin-team-map"){
    renderAdminTeamMap();
    return;
  }

  if(activeFilter==="honors"){
    renderHonorsQueue();
    return;
  }

  if(activeFilter==="priestess-mailbox"){
    renderPriestessMailboxQueue();
    return;
  }

  const stays=visibleStays();
  if(!stays.length){queue.innerHTML="<p>No guests in this category right now.</p>";return;}
  queue.innerHTML=stays.map(stay=>renderGuestStayRow(stay,{mode:activeFilter})).join("");
  bindQueueActions();
  bindTeamMembershipButtons(queue);
}


function bindTeamMembershipButtons(scope=document){
  scope.querySelectorAll("[data-recognize-team-member]").forEach(button=>{
    if(boundTeamMembershipButtons.has(button)) return;
    boundTeamMembershipButtons.add(button);
    button.addEventListener("click",async()=>{
      const memberId=button.dataset.recognizeTeamMember;
      const originalText=button.textContent;
      button.disabled=true;
      button.textContent="Adding...";
      try{
        await ownerRecognizeTeamMember(memberId);
        if(managerMessage) managerMessage.textContent="This guest is now recognized as a Flow FM Concierge Team member.";
        await loadDesk({silent:true});
      }catch(error){
        console.error("Team membership recognition failed.",error);
        button.disabled=false;
        button.textContent=originalText;
        if(managerMessage){
          managerMessage.textContent=error?.message
            ? `Team membership could not be saved: ${error.message}`
            : "Team membership could not be saved. Run migration 039 and try again.";
        }
      }
    });
  });
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


async function loadDesk({silent=false}={}){
  if(deskRefreshInFlight) return;
  deskRefreshInFlight=true;
  try{
    allStays=await getFrontDeskStays();
    await renderConnectionRequests();
    await renderMyClients();
    await loadCaddiePlayerAccess();
    await loadCaddieReviews();
    await loadCaddieCompassPlayers();
    await loadUpcomingGolfEvents();
    await loadAdminTeamMap();
    await loadHonorsData();
    await loadPriestessMailboxData();
    updateStats();
    renderQueue();
  }catch(error){
    console.error("Concierge Desk refresh failed.",error);
    if(!silent && managerMessage){
      managerMessage.textContent=error?.message
        ? `The Concierge Desk could not refresh: ${error.message}`
        : "The Concierge Desk could not refresh just now.";
    }
  }finally{
    deskRefreshInFlight=false;
  }
}

function refreshDeskWhenVisible(){
  if(document.visibilityState && document.visibilityState!=="visible") return;
  loadDesk({silent:true});
}

function startDeskAutoRefresh(){
  window.clearInterval(deskRefreshTimer);
  deskRefreshTimer=window.setInterval(refreshDeskWhenVisible,DESK_REFRESH_INTERVAL_MS);
}
function showConciergeAccessPrompt(){
  if(!loginCard) return;
  loginCard.classList.remove("hidden");
  if(dashboard) dashboard.classList.add("hidden");
  if(managerMessage){
    managerMessage.textContent="Enter through Flowtel first. Once you are logged in, the Concierge Desk will verify your role automatically.";
  }
}

function routeToFlowtelLogin(){
  const next="/manager/";
  window.location.href=`/enter/?membership=queendom&next=${encodeURIComponent(next)}`;
}

async function hydrateClockInContextForSession(profile){
  clockInContext=getClockInContext();

  if(clockInContext || !profile?.id) return clockInContext;

  try{
    const todayStay=await getTodayStayForClient(profile.id);
    if(todayStay){
      clockInContext=todayStay;
      sessionStorage.setItem("flowtel:lastSuiteStay",JSON.stringify(todayStay));
      return clockInContext;
    }
  }catch(error){
    console.warn("Concierge Desk could not hydrate today’s Suite stay.",error);
  }

  return null;
}

async function openDeskFromSession(){
  try{
    if(managerMessage) managerMessage.textContent="Checking your Concierge access...";
    const profile=await getCurrentProfile();

    if(!profile){
      showConciergeAccessPrompt();
      return;
    }

    const phaseOneOwnerEmail="mm.johnson@icloud.com";
    const profileEmail=String(profile.email || "").trim().toLowerCase();
    const profileRole=String(profile.role || "").trim().toLowerCase();
    const isPhaseOneOwner=profileEmail===phaseOneOwnerEmail && ["admin","owner"].includes(profileRole);
    if(!isPhaseOneOwner){
      if(managerMessage) managerMessage.textContent="The Concierge Desk is reserved for the Flowtel owner during Phase 1.";
      window.location.replace("/concierge-soon/");
      return;
    }

    const hasConciergeAccess=await currentUserHasConciergeAccess();
    if(!hasConciergeAccess){
      if(managerMessage) managerMessage.textContent="Your owner account is recognized, but Concierge permission is not installed yet. Run migration 034.";
      return;
    }

    currentManagerProfile=profile;
    await hydrateClockInContextForSession(profile);
    if(loginCard) loginCard.classList.add("hidden");
    if(dashboard) dashboard.classList.remove("hidden");
    if(managerMessage) managerMessage.textContent="";
    updateSuiteReturn();
    updateTodayFlow();
    await loadDesk();
    startDeskAutoRefresh();
  }catch(error){
    console.warn("Concierge session gate failed.",error);
    if(managerMessage){
      managerMessage.textContent=error?.message
        ? `Concierge access could not be verified: ${error.message}`
        : "Concierge access could not be verified. Please enter through Flowtel and try again.";
    }
  }
}

renderBetaPractitionerPanel();
openDeskFromSession();

document.getElementById("managerEntryButton")?.addEventListener("click",routeToFlowtelLogin);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));
adminTeamMapDialogClose?.addEventListener("click",()=>adminTeamMapDialog?.close());
adminTeamMapDialog?.addEventListener("click",event=>{if(event.target===adminTeamMapDialog) adminTeamMapDialog.close();});

if(goToSuiteButton) goToSuiteButton.addEventListener("click",goToSuite);
if(initiationHallButton) initiationHallButton.addEventListener("click",markInitiationHallClockIn);
document.addEventListener("visibilitychange",refreshDeskWhenVisible);
window.addEventListener("focus",refreshDeskWhenVisible);
