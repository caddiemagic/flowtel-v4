import { signInWithEmail, signUpWithEmail, signOut } from "../shared/auth.js";
import { supabase } from "../shared/supabase.js";
import { ensureProfile, getCurrentProfile } from "../shared/profiles.js?v=0.10.76";
import { isPractitionerLevel } from "../shared/beta-access.js";
import { ownerRecognizeTeamMember, listAdminTeamMapPresences } from "../shared/team-map.js?v=0.10.56";
import { getFrontDeskStays, witnessStay, prepareRoomAfterCheckout, clockOutPractitioner, getFlowFmInitiationStatus, flowFmProgressPercent, listConnectionRequestsForPractitioner, connectWithGuest, listMyClients, getTodayStayForClient, currentUserHasConciergeAccess } from "../shared/flowtel.js?v=0.10.76";
import { listCaddieReviewRequests, completeCaddieReviewRequest, closeCaddieReviewRequest } from "../shared/caddie-magic-reviews.js?v=0.5.2";
import { listCompassPlayers, markAssignmentNoted } from "../shared/caddie-magic-compass.js?v=0.5.2";
import { listUpcomingGolfEvents, acknowledgeUpcomingGolf } from "../shared/caddie-magic-schedule.js?v=0.5.2";
import { moonCycleForDate, adjacentMoonCycle, moonCycleDays, moonLabelForDate, normalizeCaddieMoonPhase, shortCalendarDate } from "../shared/caddie-magic-moon-calendar.js?v=0.5.2";
import { createPlayerInvitation, listPlayerInvitations, listCaddieMagicPlayers, revokePlayerInvitation, setCaddieMagicPlayerAccess, buildPlayerInviteUrl } from "../shared/caddie-magic-access.js?v=0.5.2";
import { invitePlayerToCaddieNetwork, listCaddieNetworkProfiles, setCaddieProfileStatus, listCourseRequests, reviewCourseRequest, listCaddieMasterAccess, setVipCaddieMasterMessaging, getCaddieMasterCommandCenter, listCaddieConciergeTeam, listCourseCatalog } from "../shared/caddie-magic-network.js?v=0.5.2";
import { getHonorsDashboard, getHonorsLedger, honorsCalculation, listHonorsPractitioners, recordHonorsEntry } from "../shared/flowtel-honors.js?v=0.10.56";
import { createMailboxDownloadUrl, listAdminPriestessMailbox, listPriestessInboxRecipients, markMailboxFileReceived, returnEditedAudio, sendPrivateFileToPriestess } from "../shared/priestess-mailbox.js?v=0.10.67";
import { labelForWorkshopReplayNoteType, listAdminWorkshopReplayNotes } from "../shared/replay-notes.js?v=0.10.64";
import { archiveLoungeVideo, createLoungeVideoOwnerDownloadUrl, discardPendingLoungeVideo, finalizePendingLoungeVideo, getPendingLoungeVideoUpload, listAdminLoungeVideos, uploadLoungeVideo } from "../shared/lounge-video.js?v=0.10.65";
import { loungeVideoFileSize } from "../shared/lounge-video-core.js?v=0.10.65";

document.documentElement.dataset.conciergeAppBooted="true";

const DEFAULT_GUEST_HOUSE_STATUS_LABELS=Object.freeze({
  requested:"Concierge is locating the recording",
  locating:"Concierge is locating the recording",
  preparing:"Concierge is locating the recording",
  ready:"Replay Room is ready",
  delivered:"Replay Room is ready",
  received:"Replay Room is ready",
  unable_to_locate:"Concierge couldn't find the replay",
  archived:"Concierge couldn't find the replay",
});
let GUEST_HOUSE_STATUS_LABELS=DEFAULT_GUEST_HOUSE_STATUS_LABELS;
let guestHouseApi=null;
let guestHouseCore=null;
let memberDirectoryServiceLoadError=null;

function unwrapMemberDirectorySingle(data){
  return Array.isArray(data) ? data[0] || null : data;
}

async function listFlowtelMembers(accessFilter="all"){
  const normalized=["all","active","revoked"].includes(String(accessFilter||"").toLowerCase())
    ? String(accessFilter).toLowerCase()
    : "all";
  const {data,error}=await supabase.rpc("flowtel_admin_get_member_directory",{p_access_filter:normalized});
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

async function setFlowtelMemberVerification({userId,status,membershipType=null,note=null}={}){
  if(!userId) throw new Error("Choose a Flowtel member.");
  const {data,error}=await supabase.rpc("flowtel_admin_set_member_verification",{
    p_user_id:userId,
    p_verification_status:status,
    p_verified_membership_type:membershipType||null,
    p_owner_note:note||null,
  });
  if(error) throw error;
  return unwrapMemberDirectorySingle(data);
}

async function revokeFlowtelMemberAccess(userId,reason=""){
  if(!userId) throw new Error("Choose a Flowtel member.");
  const {data,error}=await supabase.rpc("flowtel_admin_revoke_member_access",{
    p_user_id:userId,
    p_reason:String(reason||"").trim()||null,
  });
  if(error) throw error;
  return data===true;
}

async function restoreFlowtelMemberAccess(userId,reason=""){
  if(!userId) throw new Error("Choose a Flowtel member.");
  const {data,error}=await supabase.rpc("flowtel_admin_restore_member_access",{
    p_user_id:userId,
    p_reason:String(reason||"").trim()||null,
  });
  if(error) throw error;
  return data===true;
}

async function listPriestessConciergeTeam(){
  const {data,error}=await supabase.rpc("flowtel_admin_list_priestess_concierge_team");
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

let guestHouseModulePromise=null;

function fallbackGuestHouseFileSize(bytes=0){
  const value=Number(bytes)||0;
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
  if(value<1024*1024*1024) return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
  return `${(value/(1024*1024*1024)).toFixed(2)} GB`;
}
function guestHouseFileSize(bytes=0){
  return typeof guestHouseCore?.guestHouseFileSize==="function"
    ? guestHouseCore.guestHouseFileSize(bytes)
    : fallbackGuestHouseFileSize(bytes);
}
function guestHouseReplayExpirationCopy(expiresAt){
  if(typeof guestHouseCore?.guestHouseReplayExpirationCopy==="function") return guestHouseCore.guestHouseReplayExpirationCopy(expiresAt);
  if(!expiresAt) return "";
  const days=Math.max(0,Math.ceil((new Date(expiresAt).getTime()-Date.now())/86400000));
  return days===0 ? "This replay has reached the end of its 28-day Guest House stay." : `This replay will be deleted in ${days} day${days===1?"":"s"}.`;
}
async function ensureGuestHouseModules(){
  if(guestHouseApi && guestHouseCore) return {api:guestHouseApi,core:guestHouseCore};
  if(!guestHouseModulePromise){
    guestHouseModulePromise=Promise.all([
      import("../shared/guest-house.js?v=0.10.74.2"),
      import("../shared/guest-house-core.js?v=0.10.74.2"),
    ]).then(([api,core])=>{
      const required=[
        "createGuestHouseOwnerDownloadUrl",
        "deactivateGuestHouseReplay",
        "discardPendingGuestHouseReplay",
        "finalizePendingGuestHouseReplay",
        "getPendingGuestHouseUpload",
        "listGuestHouseRequests",
        "prepareGuestHouseAccess",
        "purgeExpiredGuestHouseReplays",
        "revokeGuestHouseAccess",
        "updateGuestHouseRequest",
        "uploadGuestHouseReplay",
      ];
      const missing=required.filter(name=>typeof api?.[name]!=="function");
      if(missing.length) throw new Error(`Guest House module is incomplete: ${missing.join(", ")}.`);
      guestHouseApi=api;
      guestHouseCore=core;
      GUEST_HOUSE_STATUS_LABELS=core?.GUEST_HOUSE_STATUS_LABELS || DEFAULT_GUEST_HOUSE_STATUS_LABELS;
      return {api,core};
    }).catch(error=>{
      guestHouseModulePromise=null;
      throw error;
    });
  }
  return guestHouseModulePromise;
}
async function createGuestHouseOwnerDownloadUrl(...args){const {api}=await ensureGuestHouseModules();return api.createGuestHouseOwnerDownloadUrl(...args);}
async function deactivateGuestHouseReplay(...args){const {api}=await ensureGuestHouseModules();return api.deactivateGuestHouseReplay(...args);}
async function discardPendingGuestHouseReplay(...args){const {api}=await ensureGuestHouseModules();return api.discardPendingGuestHouseReplay(...args);}
async function finalizePendingGuestHouseReplay(...args){const {api}=await ensureGuestHouseModules();return api.finalizePendingGuestHouseReplay(...args);}
function getPendingGuestHouseUpload(...args){return guestHouseApi?.getPendingGuestHouseUpload?.(...args) || null;}
async function listGuestHouseRequests(...args){const {api}=await ensureGuestHouseModules();return api.listGuestHouseRequests(...args);}
async function prepareGuestHouseAccess(...args){const {api}=await ensureGuestHouseModules();return api.prepareGuestHouseAccess(...args);}
async function purgeExpiredGuestHouseReplays(...args){const {api}=await ensureGuestHouseModules();return api.purgeExpiredGuestHouseReplays(...args);}
async function revokeGuestHouseAccess(...args){const {api}=await ensureGuestHouseModules();return api.revokeGuestHouseAccess(...args);}
async function updateGuestHouseRequest(...args){const {api}=await ensureGuestHouseModules();return api.updateGuestHouseRequest(...args);}
async function uploadGuestHouseReplay(...args){const {api}=await ensureGuestHouseModules();return api.uploadGuestHouseReplay(...args);}

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
let caddieNetworkProfiles=[];
let caddieNetworkServiceAvailable=true;
let caddieCourseRequests=[];
let caddieCourseCatalog=[];
let caddieMasterAccessRows=[];
let caddieMasterCommandCenter={player_messages:[],caddie_team_messages:[],assignments:[],player_message_count:0,caddie_team_message_count:0,assignment_count:0,course_request_count:0,submitted_profile_count:0};
let caddieConciergeTeam=[];
let caddieTeamStatusFilter="active";
let caddieTeamCourseFilter="all";
let upcomingGolfEvents=[];
let upcomingGolfServiceAvailable=true;
let upcomingGolfCalendarCycleStart="";
let currentConnectionRequestsCount=0;
let currentClientsCount=0;
let memberDirectoryRows=[];
let memberDirectoryServiceAvailable=true;
let memberDirectoryAccessFilter="active";
let priestessConciergeTeam=[];
let priestessTeamServiceAvailable=true;
let priestessTeamStatusFilter="all";
let priestessTeamMembershipFilter="all";
let clockInContext=null;
let currentManagerProfile=null;
let adminTeamMapRows=[];
let adminTeamMapServiceAvailable=true;
let honorsPractitioners=[];
let honorsDashboardRows=[];
let honorsLedgerRows=[];
let honorsServiceAvailable=true;
let priestessMailboxRows=[];
let priestessMailboxRecipients=[];
let priestessMailboxServiceAvailable=true;
let priestessInboxDraft={file:null,recipient:'',subject:'',note:''};
let priestessInboxUploadInFlight=false;
let priestessInboxFilePickerOpen=false;
let priestessInboxFilePickerReleaseTimer=null;
let guestHouseRequests=[];
let guestHouseServiceAvailable=true;
let guestHouseExpandedRequestId=null;
let workshopReplayNotes=[];
let workshopReplayNotesServiceAvailable=true;
let loungeVideos=[];
let loungeVideoServiceAvailable=true;
let loungeVideoDraft={file:null,title:'Four Seasons Flowtel Workshop',description:'Move through the four seasons of the Flowtel and let the teaching meet the season you are living now.'};
let loungeVideoUploadInFlight=false;
let loungeVideoFilePickerOpen=false;
let loungeVideoFilePickerReleaseTimer=null;
const guestHouseAccessLinks=new Map();
let deskRefreshTimer=null;
let deskRefreshInFlight=false;
const DESK_REFRESH_INTERVAL_MS=45000;
const guestHouseUploadsInFlight=new Set();
const guestHouseUploadDrafts=new Map();
let guestHouseFilePickerOpen=false;
let guestHouseFilePickerReleaseTimer=null;
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
    const requestedRoom=new URLSearchParams(window.location.search).get("room");
    if(requestedRoom && document.querySelector(`[data-filter="${requestedRoom}"]`)) setFilter(requestedRoom);
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
    const theme=initiation.moon?.theme ? ` · ${initiation.moon.theme}` : "";
    const identityLine=initiation.hasStartDate
      ? `${initiation.level} · Month ${initiation.progressMonth} of 13 · ${initiation.moon?.name || "Flow FM"}${theme}`
      : `${initiation.level} · Flow FM start date needed`;
    setText("practitionerIdentityLevel",identityLine);
    const progress=document.getElementById("initiationProgressBar");
    if(progress){
      const percent=flowFmProgressPercent(initiation);
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

function setPriestessPreview(enabled){
  const active=Boolean(enabled);
  document.body.classList.toggle("preview-priestess-view",active);
  const button=document.getElementById("previewPriestessViewButton");
  if(button){button.setAttribute("aria-pressed",String(active));button.textContent=active?"Return to Owner View":"Preview Priestess View";}
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
  if(["clients","member-directory","priestess-team","caddie-master","caddie-network","caddie-team","caddie-reviews","caddie-compass","upcoming-golf","admin-team-map","honors","priestess-mailbox","guest-house","workshop-notes","lounge-video"].includes(activeFilter)) return [];
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
  const caddieNetworkActiveCount=caddieNetworkProfiles.filter(profile=>profile.status==="active").length;
  const caddieNetworkReviewCount=caddieNetworkProfiles.filter(profile=>profile.status==="submitted").length+caddieCourseRequests.filter(row=>row.status==="pending").length+caddiePlayerInvitations.filter(invite=>invite.status==="invited").length;
  const caddieMasterAlertCount=(Number(caddieMasterCommandCenter.player_message_count)||0)+(Number(caddieMasterCommandCenter.caddie_team_message_count)||0)+(Number(caddieMasterCommandCenter.assignment_count)||0)+(Number(caddieMasterCommandCenter.course_request_count)||0)+(Number(caddieMasterCommandCenter.submitted_profile_count)||0);
  const caddieTeamActiveCount=caddieConciergeTeam.filter(row=>row.status==="active").length;
  const upcomingGolfCount=upcomingGolfEvents.filter(event=>String(event.date_end||event.date_start)>=managerTodayISO() && !event.caddie_master_acknowledged_at).length;
  const honorsAvailable=honorsDashboardRows.reduce((sum,row)=>sum+(Number(row.available_points)||0),0);
  const mailboxAwaiting=priestessMailboxRows.filter(row=>row.direction==="to_admin" && !row.received_at).length;
  const guestHouseAwaiting=guestHouseRequests.filter(row=>["requested","locating","preparing"].includes(String(row.request_status||""))).length;
  const workshopQuestions=workshopReplayNotes.filter(row=>row.note_type==="question").length;
  const activeLoungeVideo=loungeVideos.find(row=>row.is_active);

  setText("awaitingTurndownCount",awaitingCount);
  setText("caddieMasterAlertCount",caddieMasterAlertCount);
  setText("caddieInviteCount",caddieInviteCount);
  setText("caddieReviewCount",caddieReviewCount);
  setText("caddieCompassCount",caddieCompassReplyCount);
  setText("caddieCompassPlayerCount",caddieCompassPlayers.length);
  setText("caddieNetworkCount",caddieNetworkActiveCount);
  setText("caddieNetworkReviewCount",caddieNetworkReviewCount);
  setText("caddieTeamCount",caddieTeamActiveCount);
  setText("upcomingGolfCount",upcomingGolfCount);
  setText("guestsInHouse",inHouse);
  setText("extendedStay",extendedCount);
  setText("clientsCount",currentClientsCount);
  setText("clientConnectionCount",currentConnectionRequestsCount);
  setText("priestessTeamCount",priestessConciergeTeam.length);
  setText("priestessTeamProfileCount",priestessConciergeTeam.filter(row=>row.profile_status!=="not_started").length);
  const activeMembers=memberDirectoryRows.filter(row=>row.flowtel_access && row.access_status!=="revoked").length;
  const membersNeedingReview=memberDirectoryRows.filter(row=>["needs_review","not_found","email_mismatch","contact_found"].includes(String(row.verification_status||""))).length;
  setText("flowtelMemberCount",activeMembers);
  setText("flowtelMemberReviewCount",membersNeedingReview);
  setText("adminTeamMapCount",adminTeamMapRows.length);
  setText("honorsAvailablePoints",formatPoints(honorsAvailable));
  setText("honorsPractitionerCount",honorsDashboardRows.length);
  setText("priestessMailboxCount",mailboxAwaiting);
  setText("guestHouseRequestCount",guestHouseAwaiting);
  setText("workshopReplayNoteCount",workshopReplayNotes.length);
  setText("loungeVideoCount",activeLoungeVideo?"1":"0");

  const queueCard=document.querySelector(".queue");
  if(queueCard) queueCard.classList.toggle("has-requests",activeFilter==="queue" && awaitingCount>0);

  const turndownCard=document.querySelector('[data-filter="queue"]');
  if(turndownCard) turndownCard.classList.toggle("has-alert",awaitingCount>0);

  const caddieMasterCard=document.querySelector('[data-filter="caddie-master"]');
  if(caddieMasterCard) caddieMasterCard.classList.toggle("has-alert",caddieMasterAlertCount>0);

  const caddieNetworkCard=document.querySelector('[data-filter="caddie-network"]');
  if(caddieNetworkCard) caddieNetworkCard.classList.toggle("has-alert",caddieNetworkReviewCount>0);

  const caddieReviewCard=document.querySelector('[data-filter="caddie-reviews"]');
  if(caddieReviewCard) caddieReviewCard.classList.toggle("has-alert",caddieReviewCount>0);

  const caddieCompassCard=document.querySelector('[data-filter="caddie-compass"]');
  if(caddieCompassCard) caddieCompassCard.classList.toggle("has-alert",caddieCompassReplyCount>0);

  const upcomingGolfCard=document.querySelector('[data-filter="upcoming-golf"]');
  if(upcomingGolfCard) upcomingGolfCard.classList.toggle("has-alert",upcomingGolfCount>0);

  const clientsCard=document.querySelector('[data-filter="clients"]');
  if(clientsCard) clientsCard.classList.toggle("has-alert",currentConnectionRequestsCount>0);

  const priestessTeamCard=document.querySelector('[data-filter="priestess-team"]');
  if(priestessTeamCard) priestessTeamCard.classList.toggle("has-alert",priestessConciergeTeam.some(row=>row.profile_status==="submitted"));

  const memberDirectoryCard=document.querySelector('[data-filter="member-directory"]');
  if(memberDirectoryCard) memberDirectoryCard.classList.toggle("has-alert",membersNeedingReview>0);

  const mailboxCard=document.querySelector('[data-filter="priestess-mailbox"]');
  if(mailboxCard) mailboxCard.classList.toggle("has-alert",mailboxAwaiting>0);

  const guestHouseCard=document.querySelector('[data-filter="guest-house"]');
  if(guestHouseCard) guestHouseCard.classList.toggle("has-alert",guestHouseAwaiting>0);
  const workshopNotesCard=document.querySelector('[data-filter="workshop-notes"]');
  if(workshopNotesCard) workshopNotesCard.classList.toggle("has-alert",workshopQuestions>0);
  const loungeVideoCard=document.querySelector('[data-filter="lounge-video"]');
  if(loungeVideoCard) loungeVideoCard.classList.toggle("has-alert",!activeLoungeVideo);

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
    "caddie-master":["THE CADDIE MASTER","Private Support + Attention Queue","Tend Player messages, Caddie Team messages, completed Assignments, course requests, and submitted Caddie Profiles."],
    "caddie-network":["CADDIE NETWORK","Player Access + Network Operations","Invite Players, manage access, open the Caddie pathway, review profiles and courses, and preserve one connected network."],
    "caddie-team":["CADDIE CONCIERGE TEAM","The Golf-Course Concierge Team","See every Caddie, course, availability state, Player count, Compass status, and private team profile."],
    "caddie-reviews":["CADDIE MAGIC","Players Awaiting a Scorecard Review","As The Caddie Master, review their Score Map and send a private Caddie Master Note."],
    "caddie-compass":["CADDIE COMPASS","Caddie Master Assignments + VIP Messages","Create Player assignments and reply inside the owner-only Caddie Master conversation."],
    "upcoming-golf":["UPCOMING GOLF","Caddie Magic Moon Calendar","See upcoming rounds, tournaments, and trips across each moon-to-moon cycle."],
    "priestess-team":["PRIESTESS CONCIERGE TEAM","Flow FM + Council Network","See every Flow FM and Council member, Profile Studio status, mentor availability, clients, shared identity, and private team profile."],
    "clients":["MENTOR RELATIONSHIPS","Your Clients + Mentor Requests","Connected clients and new mentor requests live here."],
    "member-directory":["MEMBER DIRECTORY","Flowtel Member Integrity","Review identity, membership evidence, last sign-in, last Flowtel check-in, profile confirmation, and Flowtel-only access."],
    "admin-team-map":["ADMIN TEAM MAP","The Flowtel in Motion","Every eligible team member who has checked in during the last 28 Flowtel Days appears in her current calculated Inner Season."],
    "honors":["FLOWTEL HONORS","Contribution, Points + Redemption Ledger","Record 77/23 contributions, direct-line Honors, bonuses, adjustments, and redemptions without rewriting history."],
    "priestess-mailbox":["PRIESTESS MAILBOX","Audio Handoffs + Returned Files","Download practitioner recordings, mark them received, and return edited audio through the same private thread."],
    "guest-house":["FLOWTEL GUEST HOUSE","Call Replay Requests + Private Rooms","Locate former 1:1 calls, upload private audio or video replays, and open them inside remembered Guest House accounts without granting Flowtel access."],
    "workshop-notes":["WORKSHOP REPLAY NOTES","Questions, Reflections + Downloads","Witness what each teaching activates while keeping every note connected to the member’s Flowtel cycle history."],
    "lounge-video":["FLOW FM LOUNGE","Private Lounge Transmission","Upload the current workshop video to private Storage and place it directly inside the Flow FM Lounge without committing media to GitHub."],
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
      suiteReturnNote.textContent=`Clock out when you're done working and go do day ${room} things.`;
    }
    if(goToSuiteButton) goToSuiteButton.textContent="Clock Out";
    return;
  }

  if(suiteReturnNote){
    suiteReturnNote.textContent="Check in through your Room, then return to the Concierge Desk when you are ready to work.";
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
  const playerProfileId=player.player_profile_id;
  const networkProfile=playerProfileId ? caddieNetworkProfiles.find(profile=>String(profile.player_profile_id)===String(playerProfileId)) : null;
  const vip=playerProfileId ? caddieMasterAccessRows.find(row=>String(row.player_profile_id)===String(playerProfileId))?.vip_messaging_enabled===true : false;
  return `
    <article class="guest-row caddie-player-row">
      <div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(player.email || "")} · Player-only access ${enabled ? "active" : "paused"}${player.flowtel_access ? " · Also has Flowtel access" : " · Flowtel blocked"}</p>
        ${networkProfile ? `<p>Caddie pathway: ${escapeHtml(caddieNetworkStatusLabel(networkProfile.status))}</p>` : ""}
      </div>
      <div class="caddie-player-actions">
        ${playerProfileId ? `<a href="/caddie-magic/score-map/?player=${encodeURIComponent(playerProfileId)}&from=manager">Open Score Map</a>` : ""}
        ${playerProfileId ? `<button type="button" data-invite-caddie-network="${playerProfileId}">${networkProfile ? "Caddie Pathway Open" : "Invite as Caddie"}</button>` : ""}
        ${playerProfileId ? `<button type="button" data-vip-caddie-messages="${playerProfileId}" data-enabled="${vip ? "1" : "0"}">${vip ? "Revoke VIP Messages" : "Grant VIP Messages"}</button>` : ""}
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
      renderCaddieNetworkQueue();
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
    renderCaddieNetworkQueue();
    updateStats();
  }));

  document.querySelectorAll("[data-invite-caddie-network]").forEach(button=>button.addEventListener("click",async()=>{
    if(caddieNetworkProfiles.some(profile=>String(profile.player_profile_id)===String(button.dataset.inviteCaddieNetwork))){
      setFilter("caddie-network");
      return;
    }
    button.disabled=true;
    try{
      await invitePlayerToCaddieNetwork(button.dataset.inviteCaddieNetwork);
      await loadCaddieNetworkData();
      renderCaddieNetworkQueue();
      updateStats();
    }catch(error){
      button.disabled=false;
      if(managerMessage) managerMessage.textContent=error?.message||"The Caddie Network invitation could not be created.";
    }
  }));

  document.querySelectorAll("[data-vip-caddie-messages]").forEach(button=>button.addEventListener("click",async()=>{
    const currentlyEnabled=button.dataset.enabled==="1";
    button.disabled=true;
    try{
      await setVipCaddieMasterMessaging(button.dataset.vipCaddieMessages,!currentlyEnabled);
      await loadCaddieNetworkData();
      renderCaddieNetworkQueue();
      if(managerMessage) managerMessage.textContent=currentlyEnabled?"VIP Caddie Master messaging revoked.":"VIP Caddie Master messaging granted until you revoke it.";
    }catch(error){
      button.disabled=false;
      if(managerMessage) managerMessage.textContent=error?.message||"VIP messaging access could not be changed.";
    }
  }));

  document.querySelectorAll("[data-toggle-caddie-player]").forEach(button=>button.addEventListener("click",async()=>{
    const currentlyEnabled=button.dataset.enabled==="1";
    await setCaddieMagicPlayerAccess(button.dataset.toggleCaddiePlayer,!currentlyEnabled);
    await loadCaddiePlayerAccess();
    renderCaddieNetworkQueue();
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

function caddieNetworkStatusLabel(status=""){
  return ({invited:"Invited",draft:"Draft",submitted:"Awaiting Review",approved:"Approved",active:"Active",paused:"Paused",declined:"Declined"})[status] || status;
}

function renderCaddieNetworkProfile(profile){
  const status=String(profile.status||"invited");
  const actions=[];
  if(["invited","draft","submitted","declined"].includes(status)) actions.push(`<button type="button" data-caddie-network-status="approved" data-caddie-profile="${profile.caddie_profile_id}">Approve</button>`);
  if(["approved","paused"].includes(status)) actions.push(`<button type="button" data-caddie-network-status="active" data-caddie-profile="${profile.caddie_profile_id}">Activate</button>`);
  if(status==="active") actions.push(`<button type="button" data-caddie-network-status="paused" data-caddie-profile="${profile.caddie_profile_id}">Pause</button>`);
  if(status!=="declined") actions.push(`<button type="button" data-caddie-network-status="declined" data-caddie-profile="${profile.caddie_profile_id}">Decline</button>`);
  return `<article class="guest-row caddie-network-admin-row ${status==="submitted"?"needs-review":""}">
    <div>
      <h3>${escapeHtml(profile.display_name||profile.player_name||"Caddie Candidate")}</h3>
      <p>${escapeHtml(profile.email||"")} · ${escapeHtml(caddieNetworkStatusLabel(status))}${profile.professional_title?` · ${escapeHtml(profile.professional_title)}`:""}${profile.city?` · ${escapeHtml(profile.city)}`:""}</p>
      <p>${profile.courses_served?`Approved courses: ${escapeHtml(profile.courses_served)} · `:""}${profile.accepting_requests?"Accepting Player requests":"Not accepting requests"}</p>
    </div>
    <div class="caddie-player-actions">${actions.join("")}</div>
  </article>`;
}

function renderCourseRequestRow(row){
  return `<article class="guest-row caddie-course-request-row">
    <div><h3>${escapeHtml(row.requested_name)}</h3><p>Requested by ${escapeHtml(row.caddie_name||"Caddie")} · Pending Verification</p></div>
    <div class="caddie-player-actions"><button type="button" data-course-request="${row.request_id}" data-decision="approved">Approve Course</button><button type="button" data-course-request="${row.request_id}" data-decision="declined">Decline</button></div>
  </article>`;
}

function renderCourseCatalogCard(course){
  return `<article class="caddie-course-catalog-card"><h4>${escapeHtml(course.course_name||course.official_name||course.name||"Golf Course")}</h4><p>${escapeHtml([course.city,course.region,course.country].filter(Boolean).join(", ")||"Location details coming soon")}</p><p>${escapeHtml(course.timezone||"Timezone mapping deferred")}</p></article>`;
}

function renderCaddieNetworkQueue(){
  if(!caddieNetworkServiceAvailable){queue.innerHTML="<p>Caddie Network reconciliation requires database/migration-053-caddie-network-reintegration-shared-scheduling.sql.</p>";return;}
  const submitted=caddieNetworkProfiles.filter(profile=>profile.status==="submitted");
  const active=caddieNetworkProfiles.filter(profile=>profile.status==="active");
  const developing=caddieNetworkProfiles.filter(profile=>!["submitted","active"].includes(profile.status));
  const pendingCourses=caddieCourseRequests.filter(row=>row.status==="pending");
  const openInvites=caddiePlayerInvitations.filter(invite=>invite.status==="invited");
  const activePlayers=caddiePlayers.filter(player=>player.caddie_magic_access).length;
  const openRequests=caddieConciergeTeam.reduce((sum,row)=>sum+Number(row.active_player_count||0),0);
  queue.innerHTML=`<section class="caddie-network-command-center">
    <section class="caddie-network-section"><p class="eyebrow">OVERVIEW</p><div class="caddie-network-overview"><article><span>Active Players</span><strong>${activePlayers}</strong></article><article><span>Active Caddies</span><strong>${active.length}</strong></article><article><span>Active Pairings</span><strong>${openRequests}</strong></article><article><span>Courses</span><strong>${caddieCourseCatalog.length}</strong></article></div></section>
    <section class="caddie-network-section"><p class="eyebrow">PLAYERS + ACCESS</p><section class="caddie-invite-builder"><form id="caddieInviteForm" class="caddie-invite-form"><label>Email<input id="caddieInviteEmail" type="email" required placeholder="player@example.com"></label><label>First Name<input id="caddieInviteFirstName" type="text" placeholder="First"></label><label>Last Name<input id="caddieInviteLastName" type="text" placeholder="Last"></label><label>Expires <span>Optional</span><input id="caddieInviteExpires" type="date"></label><button type="submit">Create Player Invite</button></form><p id="caddieInviteMessage"></p></section><p class="eyebrow">ACTIVE PLAYERS · ${activePlayers}</p>${caddiePlayers.length?caddiePlayers.map(renderCaddiePlayerRow).join(""):"<p>No Caddie Magic players have activated yet.</p>"}<p class="eyebrow">PLAYER INVITATIONS · ${openInvites.length} OPEN</p>${caddiePlayerInvitations.length?caddiePlayerInvitations.map(renderCaddieInvitationRow).join(""):"<p>No player invitations yet.</p>"}</section>
    <section class="caddie-network-section"><p class="eyebrow">CADDIE LIFECYCLE</p><p class="eyebrow">PROFILES AWAITING REVIEW · ${submitted.length}</p>${submitted.length?submitted.map(renderCaddieNetworkProfile).join(""):"<p>No Caddie Profiles are waiting for review.</p>"}<p class="eyebrow">ACTIVE CADDIES · ${active.length}</p>${active.length?active.map(renderCaddieNetworkProfile).join(""):"<p>No Caddies are active in the directory yet.</p>"}<p class="eyebrow">INVITED, DRAFT, APPROVED + PAUSED</p>${developing.length?developing.map(renderCaddieNetworkProfile).join(""):"<p>No additional Caddie candidates.</p>"}</section>
    <section class="caddie-network-section"><p class="eyebrow">GOLF COURSE NETWORK</p><p>Manage the canonical course catalog and review courses requested by Caddies.</p><p class="eyebrow">COURSES AWAITING VERIFICATION · ${pendingCourses.length}</p>${pendingCourses.length?pendingCourses.map(renderCourseRequestRow).join(""):"<p>No course requests are waiting.</p>"}<p class="eyebrow">APPROVED COURSE CATALOG · ${caddieCourseCatalog.length}</p><div class="caddie-course-catalog-grid">${caddieCourseCatalog.length?caddieCourseCatalog.map(renderCourseCatalogCard).join(""):"<p>No approved courses are available yet.</p>"}</div><p class="caddie-course-deferred">Dedicated course pages, normalized timezone and location mapping, coordinates, and a plotted golf-course map are intentionally prepared for a later phase.</p></section>
  </section>`;
  bindCaddiePlayerActions();
  document.querySelectorAll("[data-caddie-network-status]").forEach(button=>button.addEventListener("click",async()=>{const next=button.dataset.caddieNetworkStatus;if(next==="declined"&&!window.confirm("Decline this Caddie Profile? Their Player Profile and score history will remain untouched."))return;button.disabled=true;try{await setCaddieProfileStatus(button.dataset.caddieProfile,next);await loadCaddieNetworkData();updateStats();renderCaddieNetworkQueue();}catch(error){button.disabled=false;if(managerMessage)managerMessage.textContent=error?.message||"The Caddie Profile status could not be updated.";}}));
  document.querySelectorAll("[data-course-request]").forEach(button=>button.addEventListener("click",async()=>{if(button.dataset.decision==="declined"&&!window.confirm("Decline this course request?"))return;button.disabled=true;try{await reviewCourseRequest(button.dataset.courseRequest,button.dataset.decision);await loadCaddieNetworkData();updateStats();renderCaddieNetworkQueue();}catch(error){button.disabled=false;if(managerMessage)managerMessage.textContent=error?.message||"The course request could not be reviewed.";}}));
}

async function loadCaddieNetworkData(){
  try{
    [caddieNetworkProfiles,caddieCourseRequests,caddieMasterAccessRows,caddieMasterCommandCenter,caddieConciergeTeam,caddieCourseCatalog]=await Promise.all([
      listCaddieNetworkProfiles(),
      listCourseRequests(),
      listCaddieMasterAccess(),
      getCaddieMasterCommandCenter(),
      listCaddieConciergeTeam(),
      listCourseCatalog().catch(error=>{console.warn("Course catalog could not load yet.",error);return [];}),
    ]);
    caddieNetworkServiceAvailable=true;
  }catch(error){
    console.warn("Caddie Network is not available yet.",error);
    caddieNetworkProfiles=[];
    caddieCourseRequests=[];
    caddieMasterAccessRows=[];
    caddieMasterCommandCenter={player_messages:[],caddie_team_messages:[],assignments:[],player_message_count:0,caddie_team_message_count:0,assignment_count:0,course_request_count:0,submitted_profile_count:0};
    caddieConciergeTeam=[];
    caddieCourseCatalog=[];
    caddieNetworkServiceAvailable=false;
  }
}

function masterAlertTime(value){
  if(!value) return "Recently";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));
}

function renderMasterAlertRows(rows=[],type="player"){
  if(!rows.length) return `<p class="desk-empty-state">Nothing is waiting here.</p>`;
  return rows.map(row=>{
    if(type==="assignment"){
      return `<article class="guest-row caddie-master-alert-row"><div><h3>${escapeHtml(row.player_name||"Player")}</h3><p>Completed Assignment · ${escapeHtml(row.title||"Assignment")}</p>${row.player_response?`<p>${escapeHtml(row.player_response)}</p>`:""}</div><div class="caddie-player-actions"><a href="/caddie-magic/compass/admin/?player=${encodeURIComponent(row.player_profile_id)}&from=manager">Open Player Compass</a><button type="button" data-note-assignment="${escapeHtml(row.assignment_id)}">Mark Noted</button></div></article>`;
    }
    const isTeam=type==="team";
    const url=isTeam?`/manager/caddie-team/?caddie=${encodeURIComponent(row.caddie_profile_id)}#messages`:`/caddie-magic/compass/admin/?player=${encodeURIComponent(row.player_profile_id)}&from=manager`;
    return `<article class="guest-row caddie-master-alert-row"><div><h3>${escapeHtml(row.sender_name||row.email||"Message")}</h3><p>${escapeHtml(String(row.unread_count||1))} unread · ${escapeHtml(masterAlertTime(row.latest_at))}</p><p>${escapeHtml(row.latest_message||"")}</p></div><a href="${url}">Open Private Thread</a></article>`;
  }).join("");
}

function renderCaddieMasterQueue(){
  if(!caddieNetworkServiceAvailable){queue.innerHTML="<p>The Caddie Master Command Center requires migration 055.</p>";return;}
  const center=caddieMasterCommandCenter||{};
  queue.innerHTML=`<section class="relationship-queue caddie-master-command-center">
    <section><p class="eyebrow">PLAYER MESSAGES · ${Number(center.player_message_count)||0} UNREAD</p>${renderMasterAlertRows(center.player_messages||[],"player")}</section>
    <section><p class="eyebrow">CADDIE TEAM MESSAGES · ${Number(center.caddie_team_message_count)||0} UNREAD</p>${renderMasterAlertRows(center.caddie_team_messages||[],"team")}</section>
    <section><p class="eyebrow">ASSIGNMENTS NEEDING ATTENTION · ${Number(center.assignment_count)||0}</p>${renderMasterAlertRows(center.assignments||[],"assignment")}</section>
    <section class="caddie-master-shortcuts"><p class="eyebrow">NETWORK ALERTS</p><div class="master-shortcut-grid"><button type="button" data-open-network-alert="courses"><strong>${Number(center.course_request_count)||0}</strong><span>Course Verification Requests</span></button><button type="button" data-open-network-alert="profiles"><strong>${Number(center.submitted_profile_count)||0}</strong><span>Submitted Caddie Profiles</span></button></div></section>
  </section>`;
  queue.querySelectorAll("[data-open-network-alert]").forEach(button=>button.addEventListener("click",()=>setFilter("caddie-network")));
  queue.querySelectorAll("[data-note-assignment]").forEach(button=>button.addEventListener("click",async()=>{
    button.disabled=true;
    try{await markAssignmentNoted(button.dataset.noteAssignment);await loadCaddieNetworkData();updateStats();renderCaddieMasterQueue();}
    catch(error){button.disabled=false;if(managerMessage)managerMessage.textContent=error?.message||"The Assignment could not be marked noted.";}
  }));
}

function caddieTeamCard(row){
  return `<a class="caddie-team-card" href="/manager/caddie-team/?caddie=${encodeURIComponent(row.caddie_profile_id)}">
    <div class="caddie-team-card-heading"><div><p class="eyebrow">${escapeHtml(caddieNetworkStatusLabel(row.status))}</p><h3>${escapeHtml(row.display_name||"Caddie")}</h3><p>${escapeHtml(row.professional_title||"Caddie Concierge Team")}</p></div><span class="compass-status is-${String(row.compass_status||"incomplete").toLowerCase()}">${escapeHtml(row.compass_status||"Incomplete")}</span></div>
    <div class="caddie-team-meta"><span>${escapeHtml(row.courses_served||"Courses not set")}</span><span>${escapeHtml(row.city||"Location not set")} · ${escapeHtml(row.timezone||"Timezone not set")}</span><span>${escapeHtml(row.availability_status||"Not Set")} · ${Number(row.active_player_count)||0} active Player${Number(row.active_player_count)===1?"":"s"}</span><span>${Number(row.upcoming_call_count)||0} upcoming call${Number(row.upcoming_call_count)===1?"":"s"}${Number(row.unread_team_message_count)?` · ${Number(row.unread_team_message_count)} unread message${Number(row.unread_team_message_count)===1?"":"s"}`:""}</span></div>
  </a>`;
}

function renderCaddieTeamQueue(){
  if(!caddieNetworkServiceAvailable){queue.innerHTML="<p>The Caddie Concierge Team requires migration 055.</p>";return;}
  const statuses=["active","approved","submitted","draft","invited","paused","declined","all"];
  const courseNames=[...new Set(caddieConciergeTeam.flatMap(row=>String(row.courses_served||"").split(",").map(value=>value.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b));
  let rows=caddieTeamStatusFilter==="all"?caddieConciergeTeam:caddieConciergeTeam.filter(row=>row.status===caddieTeamStatusFilter);
  if(caddieTeamCourseFilter!=="all") rows=rows.filter(row=>String(row.courses_served||"").split(",").map(value=>value.trim()).includes(caddieTeamCourseFilter));
  queue.innerHTML=`<section class="caddie-team-directory"><div class="directory-toolbar"><div><p class="eyebrow">CADDIE CONCIERGE TEAM</p><h3>${rows.length} ${escapeHtml(caddieTeamStatusFilter==="all"?"Caddies":caddieNetworkStatusLabel(caddieTeamStatusFilter)+" Caddies")}</h3></div><div class="directory-filter-group"><label>Status<select id="caddieTeamStatusFilter">${statuses.map(status=>`<option value="${status}" ${status===caddieTeamStatusFilter?"selected":""}>${status==="all"?"All Statuses":caddieNetworkStatusLabel(status)}</option>`).join("")}</select></label><label>Golf Course<select id="caddieTeamCourseFilter"><option value="all">All Courses</option>${courseNames.map(course=>`<option value="${escapeHtml(course)}" ${course===caddieTeamCourseFilter?"selected":""}>${escapeHtml(course)}</option>`).join("")}</select></label></div></div><div class="caddie-team-grid">${rows.length?rows.map(caddieTeamCard).join(""):'<p class="desk-empty-state">No Caddies match these filters yet.</p>'}</div></section>`;
  document.getElementById("caddieTeamStatusFilter")?.addEventListener("change",event=>{caddieTeamStatusFilter=event.target.value;renderCaddieTeamQueue();});
  document.getElementById("caddieTeamCourseFilter")?.addEventListener("change",event=>{caddieTeamCourseFilter=event.target.value;renderCaddieTeamQueue();});
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
        <p>${completed ? "Scorecard Review completed" : "Used one credit for a Scorecard Review"} · ${escapeHtml(caddieReviewTime(completed ? request.completed_at : request.requested_at))}</p>
        ${request.player_email ? `<p>${escapeHtml(request.player_email)}</p>` : ""}
      </div>
      <div class="caddie-review-actions">
        <a href="${scoreMapUrl}">Open Scorecard</a>
        ${completed
          ? `<span class="completed-pill">Note Sent</span>`
          : `<button type="button" data-complete-caddie-review="${request.request_id}">Send Caddie Master Note</button><button type="button" data-close-caddie-review="${request.request_id}" data-status="cancelled">Cancel + Restore Credit</button><button type="button" data-close-caddie-review="${request.request_id}" data-status="declined">Decline + Restore Credit</button>`}
      </div>
    </article>
  `;
}

function renderCaddieReviewQueue(){
  if(!caddieReviewServiceAvailable){
    queue.innerHTML="<p>Scorecard Review Service is not installed yet. Run database/migration-041-caddie-magic-review-service.sql.</p>";
    return;
  }

  const awaiting=caddieReviewRequests.filter(request=>request.status==="requested");
  const completed=caddieReviewRequests.filter(request=>request.status==="completed").slice(0,20);

  if(!awaiting.length && !completed.length){
    queue.innerHTML="<p>No Scorecard Review requests yet.</p>";
    return;
  }

  queue.innerHTML=`
    <section class="queue-section active-requests">
      <p class="queue-section-label">Open Requests</p>
      ${awaiting.length ? awaiting.map(request=>renderCaddieReviewRow(request)).join("") : "<p>No players are waiting for a review.</p>"}
    </section>
    <section class="queue-section completed-requests">
      <p class="queue-section-label">Completed Reviews</p>
      ${completed.length ? completed.map(request=>renderCaddieReviewRow(request,{completed:true})).join("") : "<p>No completed Scorecard Reviews yet.</p>"}
    </section>
  `;

  bindCaddieReviewActions();
}

function bindCaddieReviewActions(){
  document.querySelectorAll("[data-complete-caddie-review]").forEach(button=>{
    button.addEventListener("click",async()=>{
      const note=window.prompt("Leave a private Caddie Master Note with the patterns you see in this Player’s scores and swing thoughts.");
      if(note===null) return;
      if(!String(note).trim()){
        if(managerMessage) managerMessage.textContent="Leave a Caddie Master Note before completing the review.";
        return;
      }

      const originalText=button.textContent;
      button.disabled=true;
      button.textContent="Sending Note...";
      try{
        await completeCaddieReviewRequest(button.dataset.completeCaddieReview,note);
        if(managerMessage) managerMessage.textContent="Scorecard Review complete. The private Caddie Master Note is waiting in the Player Profile.";
        await loadCaddieReviews();
        updateStats();
        renderQueue();
      }catch(error){
        console.error("Scorecard Review completion failed.",error);
        button.disabled=false;
        button.textContent=originalText;
        if(managerMessage) managerMessage.textContent=error?.message || "The Scorecard Review could not be completed.";
      }
    });
  });
  document.querySelectorAll("[data-close-caddie-review]").forEach(button=>{
    button.addEventListener("click",async()=>{
      const status=button.dataset.status;
      const label=status==="declined"?"decline":"cancel";
      if(!window.confirm(`${label.charAt(0).toUpperCase()+label.slice(1)} this request and restore the Player’s review credit?`)) return;
      const note=window.prompt("Optional Caddie Master note about why this request was closed.") || "";
      button.disabled=true;
      try{
        await closeCaddieReviewRequest(button.dataset.closeCaddieReview,status,note);
        await loadCaddieReviews();
        updateStats();
        renderCaddieReviewQueue();
        if(managerMessage) managerMessage.textContent="Review request closed. The Player’s credit was restored.";
      }catch(error){
        button.disabled=false;
        if(managerMessage) managerMessage.textContent=error?.message||"The review request could not be closed.";
      }
    });
  });
}

async function loadCaddieReviews(){
  try{
    caddieReviewRequests=await listCaddieReviewRequests();
    caddieReviewServiceAvailable=true;
  }catch(error){
    console.warn("Scorecard Review requests are not available yet.",error);
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
    const acknowledged=Boolean(event.caddie_master_acknowledged_at);
    return `<article class="upcoming-golf-row ${acknowledged?"is-acknowledged":"needs-attention"}"><div><span>${escapeHtml(managerGolfType(event.event_type))} · ${escapeHtml(golfEventDateRange(event))}</span><h3>${escapeHtml(event.event_title)}</h3><p>${escapeHtml(event.player_name)}${place?` · ${escapeHtml(place)}`:""}</p><div class="upcoming-golf-moons">${forecast.map(day=>`<small>${escapeHtml(shortCalendarDate(day.date))} · Day ${escapeHtml(day.moon_day)} · ${escapeHtml(moonLabelForDate(day.date,day.moon_phase))}</small>`).join("")}</div>${acknowledged?`<p class="caddie-force-status">The Caddie Force is with this Player.</p>`:""}</div><div class="upcoming-golf-actions"><a href="${url}">Open Player Compass</a>${acknowledged?"":`<button type="button" data-send-caddie-force="${escapeHtml(event.event_id)}">Send the Caddie Force</button>`}</div></article>`;
  }).join("");
}
function currentGolfMoonCycle(){
  if(!upcomingGolfCalendarCycleStart) upcomingGolfCalendarCycleStart=moonCycleForDate(managerTodayISO()).startDate;
  return moonCycleForDate(upcomingGolfCalendarCycleStart);
}
function bindUpcomingGolfCalendarActions(){
  document.querySelectorAll("[data-send-caddie-force]").forEach(button=>button.addEventListener("click",async()=>{
    button.disabled=true;
    button.textContent="Sending the Caddie Force...";
    try{
      await acknowledgeUpcomingGolf(button.dataset.sendCaddieForce);
      await loadUpcomingGolfEvents();
      updateStats();
      renderUpcomingGolfCalendar();
      if(managerMessage) managerMessage.textContent="The Caddie Force is with this Player.";
    }catch(error){
      button.disabled=false;
      button.textContent="Send the Caddie Force";
      if(managerMessage) managerMessage.textContent=error?.message||"The Caddie Force could not be sent.";
    }
  }));
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
  const seasons=['Inner Autumn','Inner Summer','Inner Winter','Inner Spring'];
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
function priestessInboxEditorProtected(){
  return priestessInboxUploadInFlight || priestessInboxFilePickerOpen || (activeFilter==='priestess-mailbox' && !!(priestessInboxDraft.file || priestessInboxDraft.recipient || priestessInboxDraft.subject || priestessInboxDraft.note));
}
function beginPriestessInboxFilePicker(){
  window.clearTimeout(priestessInboxFilePickerReleaseTimer);
  priestessInboxFilePickerOpen=true;
  document.body.dataset.priestessInboxFilePicker='open';
}
function endPriestessInboxFilePicker(){
  window.clearTimeout(priestessInboxFilePickerReleaseTimer);
  priestessInboxFilePickerReleaseTimer=window.setTimeout(()=>{
    priestessInboxFilePickerOpen=false;
    delete document.body.dataset.priestessInboxFilePicker;
  },1200);
}
function priestessInboxSelectedMarkup(){
  const file=priestessInboxDraft.file;
  if(!file) return '';
  return `<div class="admin-mailbox-send-selected"><div><p>READY FOR PRIVATE DELIVERY</p><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(managerFileSize(file.size))} · This selection will stay here until you send or clear it.</span></div><button class="quiet" type="button" data-priestess-inbox-clear>CLEAR FILE</button></div>`;
}
function renderPriestessMailboxQueue(){
  if(!priestessMailboxServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>The Priestess Mailbox is waiting for migration 046.</h3><p>No files are deleted, and no existing Profile Studio data has changed.</p></div>';
    return;
  }
  const threads=groupAdminMailboxRows(priestessMailboxRows);
  const awaiting=priestessMailboxRows.filter(row=>row.direction==='to_admin'&&!row.received_at).length;
  const recipientOptions=priestessMailboxRecipients.map(recipient=>`<option value="${escapeHtml(recipient.member_id)}" ${String(recipient.member_id)===String(priestessInboxDraft.recipient)?'selected':''}>${escapeHtml(recipient.display_name||recipient.email)}${recipient.email?` · ${escapeHtml(recipient.email)}`:''}</option>`).join('');
  queue.innerHTML=`<section class="admin-mailbox-dashboard"><header><div><p class="eyebrow">PRIESTESS INBOX</p><h3>${awaiting} ${awaiting===1?'file is':'files are'} waiting for you.</h3><p>Receive practitioner audio, return edited recordings, or send a private file directly to another woman inside Flow FM.</p></div><span>${threads.length} THREADS</span></header>
  <form class="admin-mailbox-send" id="adminMailboxSendForm"><div><p class="eyebrow">SEND A PRIVATE FILE</p><h3>Deliver directly to her Priestess Inbox.</h3><p>The file stays private and appears inside her existing Profile Studio mailbox.</p></div><label><span>Recipient</span><select name="recipient" required><option value="">Choose a Priestess</option>${recipientOptions}</select></label><label><span>Subject</span><input name="subject" maxlength="240" placeholder="A file from the Flowtel" value="${escapeHtml(priestessInboxDraft.subject)}" required /></label><label><span>Private note — optional</span><input name="note" maxlength="500" placeholder="A note she will see with the file" value="${escapeHtml(priestessInboxDraft.note)}" /></label><label><span>Choose file · up to 250 MB</span><input name="file" type="file" accept=".pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.m4v,.webm,audio/*,video/*,image/*,application/pdf" required /></label><button type="submit">SEND THROUGH THE FLOWTEL</button>${priestessInboxSelectedMarkup()}<div class="admin-mailbox-send-progress" hidden><span></span></div><p role="status"></p></form>
  <div class="admin-mailbox-thread-list">${threads.length?threads.map(thread=>`<article class="admin-mailbox-thread" data-mailbox-thread="${escapeHtml(thread.thread_id)}" data-mailbox-practitioner="${escapeHtml(thread.practitioner_id)}"><header><div class="admin-mailbox-priestess"><img src="${escapeHtml(safeManagerImage(thread.profile_photo_url))}" alt="" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" /><div><p class="eyebrow">${escapeHtml(thread.practitioner_name||'Flow FM Priestess')}</p><h3>${escapeHtml(thread.subject||'Private Flowtel file')}</h3><span>${escapeHtml(thread.practitioner_email||'')} · ${escapeHtml(managerDateLabel(thread.thread_created_at,{withTime:true}))}</span></div></div><strong>${escapeHtml(String(thread.thread_status||'').replaceAll('_',' '))}</strong></header>${thread.thread_message?`<p class="admin-mailbox-message">${escapeHtml(thread.thread_message)}</p>`:''}<div class="admin-mailbox-files">${thread.files.map(mailboxFileAdminMarkup).join('')}</div><div class="admin-mailbox-return"><label><span>Return edited audio</span><input type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*" data-return-audio /></label><label><span>Note to the Priestess — optional</span><input type="text" maxlength="500" placeholder="Your edited journey is ready" data-return-note /></label><button type="button" data-return-thread="${escapeHtml(thread.thread_id)}" data-return-practitioner="${escapeHtml(thread.practitioner_id)}">SEND EDITED AUDIO BACK</button><p role="status"></p></div></article>`).join(''):'<p class="honors-empty">No Priestess files have arrived yet.</p>'}</div></section>`;
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
  const sendForm=document.getElementById('adminMailboxSendForm');
  const inboxFileInput=sendForm?.querySelector('input[name="file"]');
  inboxFileInput?.addEventListener('pointerdown',beginPriestessInboxFilePicker);
  inboxFileInput?.addEventListener('click',beginPriestessInboxFilePicker);
  inboxFileInput?.addEventListener('change',()=>{
    endPriestessInboxFilePicker();
    priestessInboxDraft.file=inboxFileInput.files?.[0]||null;
    priestessInboxDraft.recipient=sendForm.elements.recipient?.value||'';
    priestessInboxDraft.subject=sendForm.elements.subject?.value||'';
    priestessInboxDraft.note=sendForm.elements.note?.value||'';
    renderPriestessMailboxQueue();
  });
  sendForm?.elements.recipient?.addEventListener('change',event=>{priestessInboxDraft.recipient=event.target.value;});
  sendForm?.elements.subject?.addEventListener('input',event=>{priestessInboxDraft.subject=event.target.value;});
  sendForm?.elements.note?.addEventListener('input',event=>{priestessInboxDraft.note=event.target.value;});
  sendForm?.querySelector('[data-priestess-inbox-clear]')?.addEventListener('click',()=>{priestessInboxDraft={...priestessInboxDraft,file:null};renderPriestessMailboxQueue();});
  if(sendForm) sendForm.addEventListener('submit',async(event)=>{
    event.preventDefault();const button=sendForm.querySelector('button[type="submit"]');const output=sendForm.querySelector('p[role="status"]');const progress=sendForm.querySelector('.admin-mailbox-send-progress');const bar=progress?.querySelector('span');const data=new FormData(sendForm);const file=priestessInboxDraft.file||data.get('file');priestessInboxDraft={file,recipient:String(data.get('recipient')||''),subject:String(data.get('subject')||''),note:String(data.get('note')||'')};button.disabled=true;button.textContent='SENDING…';if(progress)progress.hidden=false;if(bar)bar.style.width='2%';output.textContent='Preparing this private delivery…';priestessInboxUploadInFlight=true;document.body.dataset.priestessInboxUpload='active';
    try{await sendPrivateFileToPriestess({recipientId:priestessInboxDraft.recipient,file,subject:priestessInboxDraft.subject,note:priestessInboxDraft.note,onProgress:value=>{if(bar)bar.style.width=`${value}%`;output.textContent=value>=100?'Finishing her Priestess Inbox delivery…':`Uploading privately… ${value}%`;}});priestessInboxDraft={file:null,recipient:'',subject:'',note:''};await loadPriestessMailboxData();updateStats();renderPriestessMailboxQueue();if(managerMessage)managerMessage.textContent='The private file was delivered to her Priestess Inbox.';}
    catch(error){button.disabled=false;button.textContent='SEND THROUGH THE FLOWTEL';output.textContent=error?.message||'This private file could not be delivered.';}
    finally{priestessInboxUploadInFlight=false;delete document.body.dataset.priestessInboxUpload;}
  });
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
    [priestessMailboxRows,priestessMailboxRecipients]=await Promise.all([listAdminPriestessMailbox(),listPriestessInboxRecipients()]);
    priestessMailboxServiceAvailable=true;
  }catch(error){
    console.warn('Priestess Mailbox queue is not available yet.',error);
    priestessMailboxRows=[];priestessMailboxRecipients=[];priestessMailboxServiceAvailable=false;
  }
}


function workshopNoteContext(row){
  return [
    row.flowtel_date?managerDateLabel(row.flowtel_date,{withTime:false}):'',
    row.cycle_day_actual?`Cycle Day ${row.cycle_day_actual}`:'',
    row.inner_season||'',
    row.moon_day?`Moon Day ${row.moon_day}`:'',
    row.moon_phase||'',
  ].filter(Boolean);
}
function renderWorkshopReplayNotesQueue(){
  if(!workshopReplayNotesServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>Workshop Replay Notes are waiting for migration 050.</h3><p>Run database/migration-050-five-experience-updates.sql to open the owner replay-note view.</p></div>';
    return;
  }
  if(!workshopReplayNotes.length){
    queue.innerHTML='<section class="workshop-notes-admin"><header><p class="eyebrow">LIVING REPLAY PORTALS</p><h3>No workshop notes have arrived yet.</h3><p>Questions, notes, downloads, and reflections will appear here after members save them underneath a replay.</p></header></section>';
    return;
  }
  const groups=new Map();
  workshopReplayNotes.forEach(row=>{
    const key=row.workshop_key || 'workshop';
    if(!groups.has(key)) groups.set(key,{title:row.workshop_title || 'Workshop Replay',rows:[]});
    groups.get(key).rows.push(row);
  });
  const markup=[...groups.values()].map(group=>{
    const questions=group.rows.filter(row=>row.note_type==='question').length;
    return `<section class="workshop-note-group"><header><div><p class="eyebrow">WORKSHOP REPLAY</p><h3>${escapeHtml(group.title)}</h3></div><span>${group.rows.length} NOTES · ${questions} QUESTIONS</span></header><div class="workshop-note-list">${group.rows.map(row=>`<article class="workshop-note-card"><header><div><strong>${escapeHtml(labelForWorkshopReplayNoteType(row.note_type))}</strong><h4>${escapeHtml(row.display_name || 'Flowtel Guest')}</h4></div><time>${escapeHtml(managerDateLabel(row.created_at,{withTime:true}))}</time></header><p>${escapeHtml(row.note_body)}</p><div>${workshopNoteContext(row).map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div></article>`).join('')}</div></section>`;
  }).join('');
  queue.innerHTML=`<section class="workshop-notes-admin"><header><p class="eyebrow">LIVING REPLAY PORTALS</p><h3>${workshopReplayNotes.length} ${workshopReplayNotes.length===1?'note is':'notes are'} connected to Flowtel cycle history.</h3><p>Use these questions and reflections for follow-up, coursework insight, and curriculum refinement. The notes remain append-only.</p></header>${markup}</section>`;
}
async function loadWorkshopReplayNotes(){
  try{workshopReplayNotes=await listAdminWorkshopReplayNotes();workshopReplayNotesServiceAvailable=true;}
  catch(error){console.warn('Workshop replay notes are not available yet.',error);workshopReplayNotes=[];workshopReplayNotesServiceAvailable=false;}
}


function loungeVideoEditorProtected(){
  return loungeVideoUploadInFlight || loungeVideoFilePickerOpen || (activeFilter==='lounge-video' && !!loungeVideoDraft.file);
}
function beginLoungeVideoFilePicker(){
  window.clearTimeout(loungeVideoFilePickerReleaseTimer);
  loungeVideoFilePickerOpen=true;
  document.body.dataset.loungeVideoFilePicker='open';
}
function endLoungeVideoFilePicker(){
  window.clearTimeout(loungeVideoFilePickerReleaseTimer);
  loungeVideoFilePickerReleaseTimer=window.setTimeout(()=>{
    loungeVideoFilePickerOpen=false;
    delete document.body.dataset.loungeVideoFilePicker;
  },1200);
}
function loungeVideoSelectedMarkup(){
  const file=loungeVideoDraft.file;
  if(!file) return '';
  return `<div class="lounge-video-selected"><div><p>READY TO PLACE IN THE LOUNGE</p><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(loungeVideoFileSize(file.size))} · This selection will stay here until you upload or clear it.</span></div><button class="quiet" type="button" data-lounge-video-clear>CLEAR FILE</button></div>`;
}
function loungeVideoRowMarkup(video){
  return `<article class="lounge-video-admin-row ${video.is_active?'is-active':''}"><div><p>${video.is_active?'CURRENT LOUNGE TRANSMISSION':'ARCHIVED TRANSMISSION'}</p><h4>${escapeHtml(video.title || video.original_filename || 'Flowtel Lounge Transmission')}</h4><span>${escapeHtml(loungeVideoFileSize(video.size_bytes))} · ${escapeHtml(managerDateLabel(video.activated_at || video.created_at,{withTime:true}))}</span>${video.description?`<em>${escapeHtml(video.description)}</em>`:''}</div><div><button type="button" data-lounge-video-download="${escapeHtml(video.storage_path)}">DOWNLOAD</button>${video.is_active?`<button class="quiet" type="button" data-lounge-video-archive="${escapeHtml(video.video_id)}">REMOVE FROM LOUNGE</button>`:''}</div></article>`;
}
function renderLoungeVideoQueue(){
  if(!loungeVideoServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>The Lounge uploader is waiting for migration 051.</h3><p>Run database/migration-051-flow-fm-lounge-video-uploader.sql to open private Lounge video Storage.</p></div>';
    return;
  }
  const active=loungeVideos.find(row=>row.is_active);
  const pending=getPendingLoungeVideoUpload();
  queue.innerHTML=`<section class="lounge-video-admin"><header><div><p class="eyebrow">FLOW FM LOUNGE TRANSMISSION</p><h3>${active?'A private Lounge video is active.':'Place the workshop inside the Lounge.'}</h3><p>Large workshop videos live in private Supabase Storage rather than GitHub. Uploading a new transmission automatically archives the prior one.</p></div><span>${active?'ACTIVE':'WAITING'}</span></header>
    ${active?loungeVideoRowMarkup(active):''}
    ${pending?`<div class="lounge-video-pending"><div><p>UPLOAD PRESERVED SAFELY</p><strong>${escapeHtml(pending.originalFilename || 'Lounge video')}</strong><span>${escapeHtml(loungeVideoFileSize(pending.sizeBytes))} reached private Storage and is waiting to be registered.</span></div><div><button type="button" data-lounge-video-finalize>FINISH ADDING TO LOUNGE</button><button class="quiet" type="button" data-lounge-video-discard>REMOVE PRESERVED UPLOAD</button></div><p role="status"></p></div>`:''}
    <section class="lounge-video-uploader">
      <label><span>Choose the Lounge video</span><input type="file" accept=".mp4,.mov,.m4v,.webm,video/*" data-lounge-video-file /></label>
      <label><span>Transmission title</span><input type="text" maxlength="240" value="${escapeHtml(loungeVideoDraft.title)}" data-lounge-video-title /></label>
      <label class="lounge-video-description"><span>Invitation beneath the title</span><textarea maxlength="1200" rows="3" data-lounge-video-description>${escapeHtml(loungeVideoDraft.description)}</textarea></label>
      <button type="button" data-lounge-video-upload>UPLOAD TO LOUNGE</button>
      ${loungeVideoSelectedMarkup()}
      <div class="lounge-video-progress" hidden><span></span></div>
      <p role="status"></p>
    </section>
    ${loungeVideos.filter(row=>!row.is_active).length?`<section class="lounge-video-archive"><p class="eyebrow">EARLIER TRANSMISSIONS</p>${loungeVideos.filter(row=>!row.is_active).map(loungeVideoRowMarkup).join('')}</section>`:''}
  </section>`;
  bindLoungeVideoControls();
}
function bindLoungeVideoControls(){
  const fileInput=queue.querySelector('[data-lounge-video-file]');
  fileInput?.addEventListener('pointerdown',beginLoungeVideoFilePicker);
  fileInput?.addEventListener('click',beginLoungeVideoFilePicker);
  fileInput?.addEventListener('change',()=>{
    endLoungeVideoFilePicker();
    const file=fileInput.files?.[0] || null;
    loungeVideoDraft={...loungeVideoDraft,file};
    renderLoungeVideoQueue();
  });
  queue.querySelector('[data-lounge-video-title]')?.addEventListener('input',event=>{loungeVideoDraft.title=event.target.value;});
  queue.querySelector('[data-lounge-video-description]')?.addEventListener('input',event=>{loungeVideoDraft.description=event.target.value;});
  queue.querySelector('[data-lounge-video-clear]')?.addEventListener('click',()=>{loungeVideoDraft={...loungeVideoDraft,file:null};renderLoungeVideoQueue();});
  queue.querySelector('[data-lounge-video-upload]')?.addEventListener('click',async()=>{
    const file=loungeVideoDraft.file;
    const output=queue.querySelector('.lounge-video-uploader p[role="status"]');
    const progress=queue.querySelector('.lounge-video-progress');
    const bar=progress?.querySelector('span');
    const button=queue.querySelector('[data-lounge-video-upload]');
    if(!file){if(output) output.textContent='Choose the Lounge video first.';return;}
    const original=button.textContent;
    loungeVideoUploadInFlight=true;
    document.body.dataset.loungeVideoUpload='active';
    button.disabled=true;
    progress.hidden=false;
    if(output) output.textContent=`Preparing ${file.name} (${loungeVideoFileSize(file.size)})… Keep this tab open.`;
    try{
      await uploadLoungeVideo({
        file,title:loungeVideoDraft.title,description:loungeVideoDraft.description,
        onProgress(percent){if(bar) bar.style.width=`${percent}%`;if(output && percent<100) output.textContent=`Uploading privately… ${percent}%`;},
        onStage(stage){if(stage==='finalizing' && output) output.textContent='Finishing the Lounge transmission…';},
      });
      loungeVideoDraft={file:null,title:'Four Seasons Flowtel Workshop',description:'Move through the four seasons of the Flowtel and let the teaching meet the season you are living now.'};
      await loadLoungeVideos();
      updateStats();
      renderLoungeVideoQueue();
      if(managerMessage) managerMessage.textContent='The new private Lounge transmission is active.';
    }catch(error){
      button.disabled=false;button.textContent=original;
      if(output) output.textContent=error?.message || 'The Lounge video could not be uploaded.';
      if(managerMessage) managerMessage.textContent=error?.message || 'The Lounge video could not be uploaded.';
    }finally{
      loungeVideoUploadInFlight=false;
      delete document.body.dataset.loungeVideoUpload;
    }
  });
  queue.querySelector('[data-lounge-video-finalize]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;const panel=button.closest('.lounge-video-pending');const output=panel?.querySelector('p[role="status"]');const original=button.textContent;
    loungeVideoUploadInFlight=true;button.disabled=true;button.textContent='FINISHING…';
    try{await finalizePendingLoungeVideo();await loadLoungeVideos();updateStats();renderLoungeVideoQueue();if(managerMessage) managerMessage.textContent='The preserved Lounge video is active.';}
    catch(error){button.disabled=false;button.textContent=original;if(output) output.textContent=error?.message || 'The preserved upload could not be finished.';}
    finally{loungeVideoUploadInFlight=false;}
  });
  queue.querySelector('[data-lounge-video-discard]')?.addEventListener('click',async event=>{
    if(!window.confirm('Remove this preserved Lounge upload from private Storage?')) return;
    const button=event.currentTarget;button.disabled=true;
    try{await discardPendingLoungeVideo();renderLoungeVideoQueue();}
    catch(error){button.disabled=false;if(managerMessage) managerMessage.textContent=error?.message || 'The preserved upload could not be removed.';}
  });
  queue.querySelectorAll('[data-lounge-video-download]').forEach(button=>button.addEventListener('click',async()=>{
    const original=button.textContent;button.disabled=true;button.textContent='PREPARING…';
    try{window.open(await createLoungeVideoOwnerDownloadUrl(button.dataset.loungeVideoDownload),'_blank','noopener');}
    catch(error){if(managerMessage) managerMessage.textContent=error?.message || 'The private Lounge video could not be opened.';}
    finally{button.disabled=false;button.textContent=original;}
  }));
  queue.querySelectorAll('[data-lounge-video-archive]').forEach(button=>button.addEventListener('click',async()=>{
    if(!window.confirm('Remove this transmission from the Flow FM Lounge? The private record and file will remain preserved.')) return;
    const original=button.textContent;button.disabled=true;button.textContent='REMOVING…';
    try{await archiveLoungeVideo(button.dataset.loungeVideoArchive);await loadLoungeVideos();updateStats();renderLoungeVideoQueue();}
    catch(error){button.disabled=false;button.textContent=original;if(managerMessage) managerMessage.textContent=error?.message || 'The Lounge transmission could not be removed.';}
  }));
}
async function loadLoungeVideos(){
  try{loungeVideos=await listAdminLoungeVideos();loungeVideoServiceAvailable=true;}
  catch(error){console.warn('Lounge video administration is not available yet.',error);loungeVideos=[];loungeVideoServiceAvailable=false;}
}


function guestHouseStatusOptions(current){
  const normalized=['ready','delivered','received'].includes(String(current||''))
    ? 'ready'
    : String(current||'')==='unable_to_locate' || String(current||'')==='archived'
      ? 'unable_to_locate'
      : 'locating';
  const options=[
    ['locating','Concierge is locating the recording'],
    ['ready','Replay Room is ready'],
    ['unable_to_locate',"Concierge couldn't find the replay"],
  ];
  return options.map(([value,label])=>`<option value="${value}" ${value===normalized?'selected':''}>${escapeHtml(label)}</option>`).join('');
}
function guestHouseFileAvailable(file){
  const expired=file?.expires_at && new Date(file.expires_at).getTime()<=Date.now();
  return file?.is_active!==false && file?.deletion_status!=='deleted' && !expired;
}
function guestHouseFileMarkup(file){
  const available=guestHouseFileAvailable(file);
  const expired=!!file.expires_at && new Date(file.expires_at).getTime()<=Date.now();
  const state=available?escapeHtml(String(file.media_kind||'replay').toUpperCase()):expired?'28-DAY STAY ENDED':'REMOVED FROM REPLAY ROOM';
  const receipts=[];
  if(Number(file.view_count)>0) receipts.push(`${Number(file.view_count)} view${Number(file.view_count)===1?'':'s'}`);
  if(Number(file.download_count)>0) receipts.push(`${Number(file.download_count)} download${Number(file.download_count)===1?'':'s'}`);
  return `<article class="guest-house-admin-file ${available?'':'is-removed'}"><div><p>${state}</p><h4>${escapeHtml(file.display_title||file.original_filename||'Call replay')}</h4><span>${escapeHtml(guestHouseFileSize(file.size_bytes))} · Uploaded ${escapeHtml(managerDateLabel(file.uploaded_at,{withTime:true}))}</span>${file.expires_at?`<em>${escapeHtml(guestHouseReplayExpirationCopy(file.expires_at))}</em>`:''}${receipts.length?`<em>${escapeHtml(receipts.join(' · '))}</em>`:''}${file.note_to_guest?`<em>${escapeHtml(file.note_to_guest)}</em>`:''}${file.deletion_status==='delete_failed'?`<em>Storage cleanup will try again on the next Concierge visit.</em>`:''}</div><div>${available?`<button type="button" data-guest-house-owner-download="${escapeHtml(file.storage_path)}">DOWNLOAD</button><button class="quiet" type="button" data-guest-house-deactivate-file="${escapeHtml(file.file_id)}">REMOVE FROM ROOM</button>`:''}</div></article>`;
}
function guestHouseTrainingConsentMarkup(request,files=[]){
  const consent=request?.training_consent || null;
  const status=String(consent?.status || '');
  const fileIds=Array.isArray(consent?.file_ids)?consent.file_ids.map(String):[];
  const selected=files.filter(file=>fileIds.includes(String(file.file_id)));
  const selectedNames=selected.map(file=>file.display_title || file.original_filename || 'Call replay');
  if(status==='granted' || status==='updated'){
    const updateCopy=status==='updated' && consent.updated_at
      ? `Recording choices updated ${escapeHtml(managerDateLabel(consent.updated_at,{withTime:false}))}.`
      : 'Offering received from the Guest House.';
    return `<section class="guest-house-training-consent is-granted"><div><p class="eyebrow">FLOW FM SESSION OFFERING</p><h4>Approved for Flow FM</h4><span>${selectedNames.length?escapeHtml(selectedNames.join(' · ')):'The selected replay offering is preserved.'}</span><span>${updateCopy}</span></div><div><strong>APPROVED</strong><span>Coupon WITNESSED revealed ${consent.gift_granted_at?escapeHtml(managerDateLabel(consent.gift_granted_at,{withTime:false})):'to the guest'}.</span></div></section>`;
  }
  if(status==='withdrawn'){
    return `<section class="guest-house-training-consent is-review-needed"><div><p class="eyebrow">FLOW FM SESSION OFFERING</p><h4>Recording permission removed</h4><span>The guest deselected all recordings${consent.updated_at?` on ${escapeHtml(managerDateLabel(consent.updated_at,{withTime:false}))}`:''}. Review any Flow FM upload manually.</span></div><div><strong>REVIEW</strong><span>No recordings are currently approved.</span></div></section>`;
  }
  return `<section class="guest-house-training-consent"><div><p class="eyebrow">FLOW FM SESSION OFFERING</p><h4>No offering recorded</h4><span>The guest may opt in privately from her Replay Room after a recording is available.</span></div></section>`;
}

function guestHousePendingMarkup(requestId){
  const pending=getPendingGuestHouseUpload(requestId);
  if(!pending) return '';
  return `<div class="guest-house-pending-upload"><div><p>UPLOAD PRESERVED SAFELY</p><strong>${escapeHtml(pending.originalFilename||'Call replay')}</strong><span>${escapeHtml(guestHouseFileSize(pending.sizeBytes))} reached private Storage and is waiting to be added to this Replay Room.</span></div><div><button type="button" data-guest-house-finalize-pending="${escapeHtml(requestId)}">FINISH ADDING TO ROOM</button><button class="quiet" type="button" data-guest-house-discard-pending="${escapeHtml(requestId)}">REMOVE PRESERVED UPLOAD</button></div><p role="status"></p></div>`;
}
function guestHouseUploadActive(){
  return guestHouseUploadsInFlight.size>0;
}
function guestHouseDraftFor(requestId){
  return guestHouseUploadDrafts.get(requestId) || null;
}
function guestHouseDraftFiles(draft){
  if(Array.isArray(draft?.files)) return draft.files.filter(Boolean);
  return draft?.file ? [draft.file] : [];
}
function syncGuestHouseDraftFlag(){
  const hasSelectedFile=[...guestHouseUploadDrafts.values()].some(draft=>guestHouseDraftFiles(draft).length>0);
  if(hasSelectedFile) document.body.dataset.guestHouseDraft='selected';
  else delete document.body.dataset.guestHouseDraft;
}
function rememberGuestHouseDraft(requestId,patch={}){
  if(!requestId) return null;
  guestHouseExpandedRequestId=requestId;
  const previous=guestHouseDraftFor(requestId) || {files:[],title:'',note:''};
  const nextFiles=Object.prototype.hasOwnProperty.call(patch,'files')
    ? (Array.isArray(patch.files)?patch.files.filter(Boolean):[])
    : Object.prototype.hasOwnProperty.call(patch,'file')
      ? (patch.file?[patch.file]:[])
      : guestHouseDraftFiles(previous);
  const next={
    files:nextFiles,
    title:Object.prototype.hasOwnProperty.call(patch,'title') ? String(patch.title || '') : previous.title,
    note:Object.prototype.hasOwnProperty.call(patch,'note') ? String(patch.note || '') : previous.note,
  };
  if(!next.files.length && !next.title && !next.note) guestHouseUploadDrafts.delete(requestId);
  else guestHouseUploadDrafts.set(requestId,next);
  syncGuestHouseDraftFlag();
  return guestHouseDraftFor(requestId);
}
function clearGuestHouseDraft(requestId){
  guestHouseUploadDrafts.delete(requestId);
  syncGuestHouseDraftFlag();
}
function guestHouseDraftActive(){
  return [...guestHouseUploadDrafts.values()].some(draft=>guestHouseDraftFiles(draft).length>0);
}
function showGuestHouseSelectedFiles(card,files=[]){
  const selected=Array.isArray(files)?files.filter(Boolean):[];
  const selectedPanel=card?.querySelector('[data-guest-house-selected-file]');
  const selectedList=card?.querySelector('[data-guest-house-selected-list]');
  const selectedSize=card?.querySelector('[data-guest-house-selected-size]');
  if(!selectedPanel || !selectedList || !selectedSize) return;
  selectedPanel.hidden=!selected.length;
  selectedList.innerHTML=selected.map(file=>`<strong>${escapeHtml(file.name)}</strong>`).join('');
  const total=selected.reduce((sum,file)=>sum+(Number(file?.size)||0),0);
  selectedSize.textContent=selected.length ? `${selected.length} ${selected.length===1?'file':'files'} · ${guestHouseFileSize(total)} total · This selection will stay here until you upload or clear it.` : '';
}
function beginGuestHouseFilePicker(){
  window.clearTimeout(guestHouseFilePickerReleaseTimer);
  guestHouseFilePickerOpen=true;
  document.body.dataset.guestHouseFilePicker='open';
}
function endGuestHouseFilePicker(){
  window.clearTimeout(guestHouseFilePickerReleaseTimer);
  guestHouseFilePickerReleaseTimer=window.setTimeout(()=>{
    guestHouseFilePickerOpen=false;
    delete document.body.dataset.guestHouseFilePicker;
  },1200);
}
function guestHouseEditorProtected(){
  return guestHouseUploadActive() || guestHouseFilePickerOpen || (activeFilter==='guest-house' && guestHouseDraftActive());
}
function conciergeEditorProtected(){
  return guestHouseEditorProtected() || loungeVideoEditorProtected() || priestessInboxEditorProtected();
}
function beginGuestHouseUpload(requestId){
  guestHouseExpandedRequestId=requestId;
  guestHouseUploadsInFlight.add(requestId);
  document.body.dataset.guestHouseUpload='active';
}
function endGuestHouseUpload(requestId){
  guestHouseUploadsInFlight.delete(requestId);
  if(!guestHouseUploadsInFlight.size) delete document.body.dataset.guestHouseUpload;
}
function guestHouseSelectedFileMarkup(requestId){
  const files=guestHouseDraftFiles(guestHouseDraftFor(requestId));
  const total=files.reduce((sum,file)=>sum+(Number(file?.size)||0),0);
  const list=files.map(file=>`<strong>${escapeHtml(file.name)}</strong>`).join('');
  return `<div class="guest-house-selected-file" data-guest-house-selected-file ${files.length?'':'hidden'}><div><span>READY TO UPLOAD</span><div class="guest-house-selected-list" data-guest-house-selected-list>${list}</div><em data-guest-house-selected-size>${files.length?`${files.length} ${files.length===1?'file':'files'} · ${escapeHtml(guestHouseFileSize(total))} total · This selection will stay here until you upload or clear it.`:''}</em></div><button class="quiet" type="button" data-guest-house-clear-file>CLEAR FILES</button></div>`;
}
function guestHouseUploadDisplayTitle(title,file,totalFiles){
  const base=String(file?.name || 'Call replay').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim() || 'Call replay';
  const prefix=String(title || '').trim();
  if(totalFiles<=1) return prefix;
  return `${prefix?`${prefix} — `:''}${base}`.slice(0,240);
}
function guestHouseAccessMarkup(request){
  if(request.auth_user_id){
    return `<section class="guest-house-access-panel guest-house-account-panel"><div><p class="eyebrow">GUEST HOUSE ACCOUNT</p><h4>The private doorway is active.</h4><span>The client can return to <strong>app.theflowtel.com/guest-house/</strong>, sign in, and check replay status. No separate private link is required.</span></div></section>`;
  }
  const prepared=guestHouseAccessLinks.get(request.request_id);
  const active=['ready','delivered','received'].includes(String(request.request_status||'')) && request.access_expires_at && !request.access_revoked_at && new Date(request.access_expires_at)>new Date();
  const currentLink=prepared?.url || '';
  return `<section class="guest-house-access-panel"><div><p class="eyebrow">LEGACY PRIVATE ROOM KEY</p><h4>${active?'A room key is active.':'Prepare a private room key.'}</h4><span>${active?`Open through ${escapeHtml(managerDateLabel(request.access_expires_at,{withTime:false}))}. A replacement key closes the prior one.`:'This older request has not yet been claimed by a Guest House account.'}</span></div><div class="guest-house-access-controls"><select data-guest-house-expiry aria-label="Replay Room access length"><option value="30">30 days</option><option value="60">60 days</option><option value="90" selected>90 days</option><option value="180">180 days</option><option value="365">1 year</option></select><button type="button" data-guest-house-prepare="${escapeHtml(request.request_id)}">${active?'PREPARE REPLACEMENT KEY':'PREPARE ROOM KEY'}</button>${active?`<button class="quiet" type="button" data-guest-house-revoke="${escapeHtml(request.request_id)}">CLOSE ROOM</button>`:''}</div>${currentLink?`<div class="guest-house-link-row"><input value="${escapeHtml(currentLink)}" readonly aria-label="Private Replay Room link" /><button type="button" data-guest-house-copy="${escapeHtml(request.request_id)}">COPY LINK</button></div>`:`${active?'<p class="guest-house-key-hint">For privacy, the raw room key is never stored. Prepare a replacement key whenever a legacy link is needed.</p>':''}`}<p class="guest-house-access-status" role="status"></p></section>`;
}
function renderGuestHouseQueue(){
  if(!guestHouseServiceAvailable){
    queue.innerHTML='<div class="service-notice"><h3>The Guest House is waiting for migration 050.</h3><p>Run migrations 048, 049, and 050 before opening replay expiration and the quieter request queue.</p></div>';
    return;
  }
  const awaiting=guestHouseRequests.filter(row=>['requested','locating','preparing'].includes(String(row.request_status||''))).length;
  const cards=guestHouseRequests.map(request=>{
    const files=Array.isArray(request.files)?request.files:[];
    const activeFiles=files.filter(guestHouseFileAvailable);
    const fullName=[request.first_name,request.last_name].filter(Boolean).join(' ');
    const accountLabel=request.auth_user_id
      ? (request.member_id?'GUEST HOUSE ACCOUNT · EXISTING FLOWTEL IDENTITY PRESERVED':'GUEST HOUSE ACCOUNT')
      : 'LEGACY GUEST HOUSE REQUEST';
    const requestId=String(request.request_id||'');
    const expanded=guestHouseExpandedRequestId===requestId || guestHouseDraftFiles(guestHouseDraftFor(requestId)).length>0 || !!getPendingGuestHouseUpload(requestId) || guestHouseUploadsInFlight.has(requestId);
    const statusLabel=GUEST_HOUSE_STATUS_LABELS[request.request_status] || 'Concierge is locating the recording';
    return `<article class="guest-house-request-card ${expanded?'is-expanded':'is-collapsed'}" data-guest-house-request="${escapeHtml(requestId)}">
      <button class="guest-house-request-toggle" type="button" data-guest-house-toggle="${escapeHtml(requestId)}" aria-expanded="${expanded?'true':'false'}">
        <span><small>${accountLabel}</small><strong>${escapeHtml(fullName||'Guest House Visitor')}</strong><em>${escapeHtml(request.email)}</em></span>
        <span><b>${escapeHtml(statusLabel)}</b><em>${activeFiles.length} active ${activeFiles.length===1?'replay':'replays'} · Requested ${escapeHtml(managerDateLabel(request.request_created_at,{withTime:false}))}</em></span>
        <i aria-hidden="true">${expanded?'−':'+'}</i>
      </button>
      <div class="guest-house-request-body" ${expanded?'':'hidden'}>
        <div class="guest-house-request-details guest-house-memory-only"><div><span>WHAT THE CLIENT REMEMBERS ABOUT THE CALL</span><p>${escapeHtml(request.call_topic||'No call memory was provided on this legacy request.')}</p></div></div>
        <div class="guest-house-owner-care"><label><span>Guest House status</span><select data-guest-house-status>${guestHouseStatusOptions(request.request_status)}</select></label><label><span>Private Concierge note</span><textarea rows="3" maxlength="3000" data-guest-house-owner-note placeholder="Where the replay may be stored, identity checks, or a private internal note">${escapeHtml(request.owner_note||'')}</textarea></label><button type="button" data-guest-house-save="${escapeHtml(requestId)}">SAVE CONCIERGE CARE</button><p role="status"></p></div>
        <section class="guest-house-files"><div class="guest-house-section-heading"><div><p class="eyebrow">CALL REPLAYS</p><h4>${activeFiles.length?`${activeFiles.length} private ${activeFiles.length===1?'file':'files'} in the Replay Room`:'No active replay in the Replay Room'}</h4></div><span>${files.length-activeFiles.length?`${files.length-activeFiles.length} PRESERVED OR EXPIRED · `:''}28-DAY STAY</span></div>${files.length?files.map(guestHouseFileMarkup).join(''):''}${guestHousePendingMarkup(requestId)}<div class="guest-house-upload"><label><span>Choose one or more audio or video replays</span><input type="file" multiple accept=".mp4,.mov,.m4v,.webm,.mp3,.wav,.m4a,.aac,.ogg,video/*,audio/*" data-guest-house-file /></label><label><span>Replay title — optional</span><input type="text" maxlength="240" placeholder="Your Womb Wealth Call Replay" value="${escapeHtml(guestHouseDraftFor(requestId)?.title||'')}" data-guest-house-title /><small>For several files, Flowtel adds each cleaned filename to this title.</small></label><label><span>Note inside the Replay Room — optional</span><input type="text" maxlength="1000" placeholder="A note the client will see above each player" value="${escapeHtml(guestHouseDraftFor(requestId)?.note||'')}" data-guest-house-note /></label><button type="button" data-guest-house-upload="${escapeHtml(requestId)}">UPLOAD SELECTED REPLAYS</button>${guestHouseSelectedFileMarkup(requestId)}<div class="guest-house-progress" hidden><span></span></div><p role="status"></p></div></section>
        ${guestHouseTrainingConsentMarkup(request,files)}
        ${guestHouseAccessMarkup(request)}
        <footer><span>Requested ${escapeHtml(managerDateLabel(request.request_created_at,{withTime:true}))}</span>${request.last_accessed_at?`<span>Guest House opened ${escapeHtml(managerDateLabel(request.last_accessed_at,{withTime:true}))} · ${escapeHtml(String(request.access_count||0))} visits</span>`:'<span>Guest House not opened yet</span>'}</footer>
      </div>
    </article>`;
  }).join('');
  queue.innerHTML=`<section class="guest-house-admin-dashboard"><header><div><p class="eyebrow">FORMER 1:1 CLIENTS</p><h3>${awaiting} ${awaiting===1?'request is':'requests are'} waiting for care.</h3><p>Requests rest closed until you choose one. Only one request opens at a time, and uploaded replays complete a 28-day Guest House stay before private Storage cleanup.</p></div><span>${guestHouseRequests.length} REQUESTS</span></header><div class="guest-house-request-list">${cards||'<p class="honors-empty">No Guest House replay requests have arrived yet.</p>'}</div></section>`;
  bindGuestHouseControls();
}
async function downloadGuestHouseOwnerFile(button){
  const popup=window.open('about:blank','_blank');
  const original=button.textContent;button.disabled=true;button.textContent='PREPARING…';
  try{
    const url=await createGuestHouseOwnerDownloadUrl(button.dataset.guestHouseOwnerDownload);
    if(popup){popup.opener=null;popup.location.href=url;}else{window.open(url,'_blank','noopener');}
    button.disabled=false;button.textContent=original;
  }catch(error){popup?.close();button.disabled=false;button.textContent=original;if(managerMessage) managerMessage.textContent=error?.message||'This replay could not be prepared.';}
}
async function reloadGuestHouse(message=''){
  await loadGuestHouseData();updateStats();renderGuestHouseQueue();if(message && managerMessage) managerMessage.textContent=message;
}
async function copyGuestHouseLink(value,input){
  const text=String(value||'');
  if(!text) throw new Error('Prepare a private Replay Room key first.');
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return;
  }
  if(input){
    input.focus();
    input.select();
    if(document.execCommand('copy')) return;
  }
  throw new Error('Select and copy the private link manually.');
}
function bindGuestHouseControls(){
  queue.querySelectorAll('[data-guest-house-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const requestId=button.dataset.guestHouseToggle;
    guestHouseExpandedRequestId=guestHouseExpandedRequestId===requestId ? null : requestId;
    renderGuestHouseQueue();
  }));
  queue.querySelectorAll('[data-guest-house-request]').forEach(card=>{
    const requestId=card.dataset.guestHouseRequest;
    const fileInput=card.querySelector('[data-guest-house-file]');
    const titleInput=card.querySelector('[data-guest-house-title]');
    const noteInput=card.querySelector('[data-guest-house-note]');
    const clearButton=card.querySelector('[data-guest-house-clear-file]');
    const output=card.querySelector('.guest-house-upload p[role="status"]');

    fileInput?.addEventListener('click',beginGuestHouseFilePicker,{capture:true});
    fileInput?.addEventListener('cancel',endGuestHouseFilePicker);
    fileInput?.addEventListener('change',()=>{
      const files=Array.from(fileInput.files || []);
      if(files.length){
        rememberGuestHouseDraft(requestId,{files,title:titleInput?.value||'',note:noteInput?.value||''});
        showGuestHouseSelectedFiles(card,files);
        const total=files.reduce((sum,file)=>sum+(Number(file?.size)||0),0);
        if(output) output.textContent=`${files.length} ${files.length===1?'replay is':'replays are'} selected (${guestHouseFileSize(total)} total) and will remain here until you upload or clear them.`;
      }
      endGuestHouseFilePicker();
    });
    titleInput?.addEventListener('input',()=>rememberGuestHouseDraft(requestId,{title:titleInput.value}));
    noteInput?.addEventListener('input',()=>rememberGuestHouseDraft(requestId,{note:noteInput.value}));
    clearButton?.addEventListener('click',()=>{
      clearGuestHouseDraft(requestId);
      if(fileInput) fileInput.value='';
      showGuestHouseSelectedFiles(card,[]);
      if(output) output.textContent='The replay selections were cleared.';
    });

    const draft=guestHouseDraftFor(requestId);
    const draftFiles=guestHouseDraftFiles(draft);
    if(draftFiles.length){
      showGuestHouseSelectedFiles(card,draftFiles);
      try{
        if(fileInput && !fileInput.files?.length && typeof DataTransfer==='function'){
          const transfer=new DataTransfer();
          draftFiles.forEach(file=>transfer.items.add(file));
          fileInput.files=transfer.files;
        }
      }catch(_error){
        // The preserved in-memory Files are still used by the upload button.
      }
    }
  });
  queue.querySelectorAll('[data-guest-house-owner-download]').forEach(button=>button.addEventListener('click',()=>downloadGuestHouseOwnerFile(button)));
  queue.querySelectorAll('[data-guest-house-deactivate-file]').forEach(button=>button.addEventListener('click',async()=>{const original=button.textContent;button.disabled=true;button.textContent='REMOVING…';try{await deactivateGuestHouseReplay(button.dataset.guestHouseDeactivateFile);await reloadGuestHouse('The replay was removed from the guest’s room while its private record was preserved.');}catch(error){button.disabled=false;button.textContent=original;if(managerMessage) managerMessage.textContent=error?.message||'This replay could not be removed from the room.';}}));
  queue.querySelectorAll('[data-guest-house-save]').forEach(button=>button.addEventListener('click',async()=>{const card=button.closest('[data-guest-house-request]');const status=card?.querySelector('[data-guest-house-status]')?.value;const note=card?.querySelector('[data-guest-house-owner-note]')?.value||'';const output=button.parentElement.querySelector('p[role="status"]');const original=button.textContent;button.disabled=true;button.textContent='SAVING…';try{await updateGuestHouseRequest({requestId:button.dataset.guestHouseSave,status,ownerNote:note});await reloadGuestHouse('Guest House care saved.');}catch(error){button.disabled=false;button.textContent=original;if(output) output.textContent=error?.message||'This request could not be saved.';}}));
  queue.querySelectorAll('[data-guest-house-finalize-pending]').forEach(button=>button.addEventListener('click',async()=>{const requestId=button.dataset.guestHouseFinalizePending;const panel=button.closest('.guest-house-pending-upload');const output=panel?.querySelector('p[role="status"]');const original=button.textContent;beginGuestHouseUpload(requestId);button.disabled=true;button.textContent='FINISHING…';if(output) output.textContent='Finishing the private Replay Room record…';try{await finalizePendingGuestHouseReplay(requestId);endGuestHouseUpload(requestId);await reloadGuestHouse('The preserved replay is now waiting safely in the Guest House.');}catch(error){endGuestHouseUpload(requestId);button.disabled=false;button.textContent=original;if(output) output.textContent=error?.message||'The preserved replay could not be finished yet.';if(managerMessage) managerMessage.textContent=error?.message||'The preserved replay could not be finished yet.';}}));
  queue.querySelectorAll('[data-guest-house-discard-pending]').forEach(button=>button.addEventListener('click',async()=>{const requestId=button.dataset.guestHouseDiscardPending;const panel=button.closest('.guest-house-pending-upload');const output=panel?.querySelector('p[role="status"]');if(!window.confirm('Remove this preserved upload from private Storage? Only use this when you intend to upload a different file.')) return;const original=button.textContent;button.disabled=true;button.textContent='REMOVING…';try{await discardPendingGuestHouseReplay(requestId);renderGuestHouseQueue();if(managerMessage) managerMessage.textContent='The unfinished private upload was removed.';}catch(error){button.disabled=false;button.textContent=original;if(output) output.textContent=error?.message||'The preserved upload could not be removed.';}}));
  queue.querySelectorAll('[data-guest-house-upload]').forEach(button=>{
    button.addEventListener('click',async()=>{
      const card=button.closest('[data-guest-house-request]');
      const requestId=button.dataset.guestHouseUpload;
      const draft=guestHouseDraftFor(requestId);
      const inputFiles=Array.from(card?.querySelector('[data-guest-house-file]')?.files || []);
      const files=inputFiles.length?inputFiles:guestHouseDraftFiles(draft);
      const title=card?.querySelector('[data-guest-house-title]')?.value ?? draft?.title ?? '';
      const note=card?.querySelector('[data-guest-house-note]')?.value ?? draft?.note ?? '';
      const progress=button.parentElement.querySelector('.guest-house-progress');
      const bar=progress?.querySelector('span');
      const output=button.parentElement.querySelector('p[role="status"]');
      const original=button.textContent;

      if(!files.length){
        if(output) output.textContent='Choose one or more audio or video replays first.';
        return;
      }

      let remaining=[...files];
      rememberGuestHouseDraft(requestId,{files:remaining,title,note});
      const fileInput=card?.querySelector('[data-guest-house-file]');
      if(fileInput) fileInput.value='';
      beginGuestHouseUpload(requestId);
      button.disabled=true;
      if(progress) progress.hidden=false;
      if(bar) bar.style.width='0%';

      try{
        for(let index=0;index<files.length;index+=1){
          const file=files[index];
          const position=index+1;
          button.textContent=`UPLOADING ${position} OF ${files.length}…`;
          if(output) output.textContent=`Preparing ${file.name} (${guestHouseFileSize(file.size)}) · ${position} of ${files.length}. Keep this tab open.`;
          try{
            await uploadGuestHouseReplay({
              requestId,
              file,
              displayTitle:guestHouseUploadDisplayTitle(title,file,files.length),
              noteToGuest:note,
              onProgress:value=>{
                const overall=Math.round(((index+(Number(value)||0)/100)/files.length)*100);
                if(bar) bar.style.width=`${overall}%`;
                if(output) output.textContent=`Uploading ${position} of ${files.length} privately… ${overall}% overall · Keep this tab open.`;
              },
              onStage:stage=>{
                if(stage==='finalizing'){
                  button.textContent=`FINISHING ${position} OF ${files.length}…`;
                  if(output) output.textContent=`${file.name} reached private Storage. Finishing its Replay Room record…`;
                }
              },
            });
            remaining=remaining.filter(candidate=>candidate!==file);
            rememberGuestHouseDraft(requestId,{files:remaining,title,note});
            showGuestHouseSelectedFiles(card,remaining);
          }catch(error){
            if(error?.code==='GUEST_HOUSE_FINALIZE_PENDING'){
              remaining=remaining.filter(candidate=>candidate!==file);
              rememberGuestHouseDraft(requestId,{files:remaining,title,note});
              showGuestHouseSelectedFiles(card,remaining);
            }
            throw error;
          }
        }
        endGuestHouseUpload(requestId);
        clearGuestHouseDraft(requestId);
        await reloadGuestHouse(`${files.length} ${files.length===1?'call replay is':'call replays are'} waiting safely in the Guest House.`);
      }catch(error){
        endGuestHouseUpload(requestId);
        if(error?.code==='GUEST_HOUSE_FINALIZE_PENDING'){
          renderGuestHouseQueue();
          if(managerMessage) managerMessage.textContent=error.message;
          return;
        }
        button.disabled=false;
        button.textContent=original;
        if(output) output.textContent=error?.message||'The selected replay upload could not be completed.';
        if(managerMessage) managerMessage.textContent=error?.message||'The selected replay upload could not be completed.';
      }
    });
  });
  queue.querySelectorAll('[data-guest-house-prepare]').forEach(button=>button.addEventListener('click',async()=>{const card=button.closest('[data-guest-house-request]');const days=card?.querySelector('[data-guest-house-expiry]')?.value||90;const output=card?.querySelector('.guest-house-access-status');const original=button.textContent;button.disabled=true;button.textContent='PREPARING…';try{const prepared=await prepareGuestHouseAccess({requestId:button.dataset.guestHousePrepare,days});guestHouseAccessLinks.set(button.dataset.guestHousePrepare,prepared);await loadGuestHouseData();updateStats();renderGuestHouseQueue();if(managerMessage) managerMessage.textContent='A fresh private Replay Room key is ready to share.';}catch(error){button.disabled=false;button.textContent=original;if(output) output.textContent=error?.message||'The private room key could not be prepared.';}}));
  queue.querySelectorAll('[data-guest-house-copy]').forEach(button=>button.addEventListener('click',async()=>{const requestId=button.dataset.guestHouseCopy;const prepared=guestHouseAccessLinks.get(requestId);const panel=button.closest('.guest-house-access-panel');const output=panel?.querySelector('.guest-house-access-status');try{await copyGuestHouseLink(prepared?.url,panel?.querySelector('.guest-house-link-row input'));await updateGuestHouseRequest({requestId,status:'delivered',ownerNote:button.closest('[data-guest-house-request]')?.querySelector('[data-guest-house-owner-note]')?.value||''});await reloadGuestHouse('The private Replay Room link was copied. The recording itself was not placed in the message.');}catch(error){if(output) output.textContent=error?.message||'The private link could not be copied.';}}));
  queue.querySelectorAll('[data-guest-house-revoke]').forEach(button=>button.addEventListener('click',async()=>{const output=button.closest('.guest-house-access-panel')?.querySelector('.guest-house-access-status');button.disabled=true;try{await revokeGuestHouseAccess(button.dataset.guestHouseRevoke);guestHouseAccessLinks.delete(button.dataset.guestHouseRevoke);await reloadGuestHouse('The private Replay Room has been closed.');}catch(error){button.disabled=false;if(output) output.textContent=error?.message||'The private room could not be closed.';}}));
}
async function loadGuestHouseData(){
  try{
    const cleanup=await purgeExpiredGuestHouseReplays();
    if(cleanup?.deleted && managerMessage) managerMessage.textContent=`${cleanup.deleted} expired Guest House replay${cleanup.deleted===1?' was':'s were'} deleted from private Storage.`;
  }catch(error){
    // Housekeeping must never hide the owner queue. Expired playback is already
    // blocked by the guest APIs, and cleanup can try again on the next visit.
    console.warn('Expired Guest House replay cleanup will try again later.',error);
  }

  try{
    guestHouseRequests=await listGuestHouseRequests();
    guestHouseServiceAvailable=true;
    if(guestHouseExpandedRequestId && !guestHouseRequests.some(row=>String(row.request_id)===guestHouseExpandedRequestId)) guestHouseExpandedRequestId=null;
  }catch(error){
    console.warn('Guest House queue is not available yet.',error);
    guestHouseRequests=[];guestHouseServiceAvailable=false;
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

  if(activeFilter==="member-directory"){
    renderMemberDirectoryQueue();
    return;
  }

  if(activeFilter==="priestess-team"){
    renderPriestessTeamQueue();
    return;
  }

  if(activeFilter==="queue"){
    renderTurndownServiceQueue();
    return;
  }

  if(activeFilter==="caddie-master"){
    renderCaddieMasterQueue();
    return;
  }

  if(activeFilter==="caddie-network"){
    renderCaddieNetworkQueue();
    return;
  }

  if(activeFilter==="caddie-team"){
    renderCaddieTeamQueue();
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

  if(activeFilter==="guest-house"){
    renderGuestHouseQueue();
    return;
  }
  if(activeFilter==="workshop-notes"){
    renderWorkshopReplayNotesQueue();
    return;
  }
  if(activeFilter==="lounge-video"){
    renderLoungeVideoQueue();
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


const MEMBER_VERIFICATION_LABELS=Object.freeze({
  queendom_verified:"Queendom Verified",
  flowfm_verified:"Flow FM Verified",
  council_verified:"Council Verified",
  contact_found:"Contact Found",
  not_found:"Not Found",
  inactive:"Inactive",
  email_mismatch:"Email Mismatch",
  needs_review:"Needs Review",
  manually_verified:"Manually Verified",
});

function memberVerificationLabel(value){
  return MEMBER_VERIFICATION_LABELS[String(value||"")] || String(value||"Needs Review").replaceAll("_"," ");
}
function memberMembershipLabel(value){
  return ({queendom:"Queendom",flowfm:"Flow FM",council:"Council"})[String(value||"").toLowerCase()] || "Unassigned";
}
function memberAccessRows(){
  if(memberDirectoryAccessFilter==="all") return memberDirectoryRows;
  if(memberDirectoryAccessFilter==="revoked") return memberDirectoryRows.filter(row=>row.access_status==="revoked");
  return memberDirectoryRows.filter(row=>row.flowtel_access===true && row.access_status!=="revoked");
}
async function loadMemberDirectory(){
  try{
    memberDirectoryRows=await listFlowtelMembers("all");
    memberDirectoryServiceAvailable=true;
    memberDirectoryServiceLoadError=null;
  }catch(error){
    console.warn("Flowtel Member Directory is not available yet.",error);
    memberDirectoryRows=[];
    memberDirectoryServiceAvailable=false;
    memberDirectoryServiceLoadError=error;
  }
}
function memberDateTime(value){
  return value ? managerDateLabel(value,{withTime:true}) : "Never";
}
function renderMemberVerificationOptions(selected){
  return Object.entries(MEMBER_VERIFICATION_LABELS).map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===selected?"selected":""}>${escapeHtml(label)}</option>`).join("");
}
function renderMemberMembershipOptions(selected){
  return [["","Use Profile Level"],["queendom","Queendom"],["flowfm","Flow FM"],["council","Council"]]
    .map(([value,label])=>`<option value="${value}" ${value===String(selected||"")?"selected":""}>${label}</option>`).join("");
}
function renderMemberDirectoryRow(row){
  const legalName=[row.first_name,row.last_name].filter(Boolean).join(" ") || "Legal name missing";
  const isOwner=String(row.email||"").toLowerCase()==="mm.johnson@icloud.com" || String(row.role||"").toLowerCase()==="owner";
  const revoked=row.access_status==="revoked";
  const active=row.flowtel_access===true && !revoked;
  const accessLabel=revoked ? "Flowtel Revoked" : active ? "Flowtel Active" : "Flowtel Not Granted";
  const accessClass=revoked ? "is-revoked" : active ? "is-active" : "is-review";
  const verification=String(row.verification_status||"needs_review");
  const verificationClass=["queendom_verified","flowfm_verified","council_verified","manually_verified"].includes(verification)?"is-verified":"is-review";
  const confirmed=!row.profile_confirmation_required && row.profile_confirmed_at;
  return `<article class="member-directory-row ${revoked?"is-revoked":""}" data-member-id="${escapeHtml(row.user_id)}">
    <header>
      <div>
        <p class="eyebrow">${escapeHtml(memberMembershipLabel(row.membership_type))} · ${escapeHtml(String(row.role||"member").toUpperCase())}</p>
        <h3>${escapeHtml(row.display_name||"Flowtel Guest")}</h3>
        <p>${escapeHtml(legalName)} · ${escapeHtml(row.email||"")}</p>
      </div>
      <div class="member-directory-badges">
        <span class="${verificationClass}">${escapeHtml(memberVerificationLabel(verification))}</span>
        <span class="${accessClass}">${accessLabel}</span>
      </div>
    </header>
    <div class="member-directory-facts">
      <div><span>Last Sign-In</span><strong>${escapeHtml(memberDateTime(row.last_sign_in_at))}</strong></div>
      <div><span>Last Flowtel Check-In</span><strong>${escapeHtml(row.last_checked_in_at?memberDateTime(row.last_checked_in_at):"Never")}</strong></div>
      <div><span>Location + Timezone</span><strong>${escapeHtml([row.location,row.timezone].filter(Boolean).join(" · ")||"Profile not confirmed")}</strong></div>
      <div><span>Profile</span><strong>${confirmed?`Confirmed ${escapeHtml(managerDateLabel(row.profile_confirmed_at,{withTime:false}))}`:"Confirmation needed"}</strong></div>
    </div>
    ${revoked && row.revoked_at?`<p class="member-revocation-note">Revoked ${escapeHtml(memberDateTime(row.revoked_at))}${row.revoked_by_name?` by ${escapeHtml(row.revoked_by_name)}`:""}${row.revocation_reason?` · ${escapeHtml(row.revocation_reason)}`:""}</p>`:""}
    <div class="member-directory-controls">
      <label><span>Verification</span><select data-member-verification>${renderMemberVerificationOptions(verification)}</select></label>
      <label><span>Verified Level</span><select data-member-membership>${renderMemberMembershipOptions(row.verified_membership_type||row.membership_type)}</select></label>
      <label class="member-note-field"><span>Owner Note</span><input data-member-note type="text" value="${escapeHtml(row.verification_note||"")}" placeholder="Optional private note" /></label>
      <button type="button" data-save-member-verification>Save Verification</button>
      ${isOwner?`<button type="button" class="quiet" disabled>Owner Protected</button>`:`<button type="button" class="${active?"danger":""}" data-${active?"revoke":"restore"}-member-access>${active?"Revoke Flowtel Access":"Restore Flowtel Access"}</button>`}
    </div>
  </article>`;
}
function bindMemberDirectoryActions(){
  queue.querySelectorAll("[data-member-directory-filter]").forEach(button=>button.addEventListener("click",()=>{
    memberDirectoryAccessFilter=button.dataset.memberDirectoryFilter;
    renderMemberDirectoryQueue();
  }));
  queue.querySelectorAll("[data-save-member-verification]").forEach(button=>button.addEventListener("click",async()=>{
    const card=button.closest("[data-member-id]");
    const original=button.textContent;button.disabled=true;button.textContent="Saving...";
    try{
      await setFlowtelMemberVerification({
        userId:card.dataset.memberId,
        status:card.querySelector("[data-member-verification]").value,
        membershipType:card.querySelector("[data-member-membership]").value||null,
        note:card.querySelector("[data-member-note]").value,
      });
      await loadMemberDirectory();updateStats();renderMemberDirectoryQueue();
      if(managerMessage) managerMessage.textContent="Member verification saved.";
    }catch(error){button.disabled=false;button.textContent=original;if(managerMessage) managerMessage.textContent=error?.message||"Member verification could not be saved.";}
  }));
  queue.querySelectorAll("[data-revoke-member-access]").forEach(button=>button.addEventListener("click",async()=>{
    const card=button.closest("[data-member-id]");
    const reason=window.prompt("Optional private reason for revoking Flowtel access:","");
    if(reason===null) return;
    if(!window.confirm("Revoke this account’s Flowtel access while preserving all history and other product access?")) return;
    button.disabled=true;button.textContent="Revoking...";
    try{await revokeFlowtelMemberAccess(card.dataset.memberId,reason);await loadMemberDirectory();updateStats();renderMemberDirectoryQueue();if(managerMessage) managerMessage.textContent="Flowtel access revoked. The account and all history were preserved.";}
    catch(error){button.disabled=false;button.textContent="Revoke Flowtel Access";if(managerMessage) managerMessage.textContent=error?.message||"Flowtel access could not be revoked.";}
  }));
  queue.querySelectorAll("[data-restore-member-access]").forEach(button=>button.addEventListener("click",async()=>{
    const card=button.closest("[data-member-id]");
    const reason=window.prompt("Optional private note for restoring Flowtel access:","");
    if(reason===null) return;
    button.disabled=true;button.textContent="Restoring...";
    try{await restoreFlowtelMemberAccess(card.dataset.memberId,reason);await loadMemberDirectory();updateStats();renderMemberDirectoryQueue();if(managerMessage) managerMessage.textContent="Flowtel access restored.";}
    catch(error){button.disabled=false;button.textContent="Restore Flowtel Access";if(managerMessage) managerMessage.textContent=error?.message||"Flowtel access could not be restored.";}
  }));
}
function renderMemberDirectoryQueue(){
  if(!memberDirectoryServiceAvailable){
    const detail=memberDirectoryServiceLoadError?.message
      ? ` The Member Directory service reported: ${escapeHtml(memberDirectoryServiceLoadError.message)}`
      : "";
    queue.innerHTML=`<p class="empty-state">The Member Directory could not open, but the rest of the Concierge Desk remains available.${detail}</p>`;
    return;
  }
  const rows=memberAccessRows();
  queue.innerHTML=`<section class="member-directory-dashboard">
    <header class="member-directory-toolbar">
      <div><p class="eyebrow">OWNER-ONLY VIEW</p><h3>${memberDirectoryRows.length} Flowtel accounts</h3><p>Legal identity and account activity remain private inside the Concierge Desk.</p></div>
      <div class="member-directory-filters" role="group" aria-label="Member access filter">
        ${["active","revoked","all"].map(value=>`<button type="button" data-member-directory-filter="${value}" class="${memberDirectoryAccessFilter===value?"active":""}">${value.charAt(0).toUpperCase()+value.slice(1)}</button>`).join("")}
      </div>
    </header>
    <div class="member-directory-list">${rows.length?rows.map(renderMemberDirectoryRow).join(""):'<p class="empty-state">No members match this view.</p>'}</div>
  </section>`;
  bindMemberDirectoryActions();
}


function priestessProfileStatusLabel(value){
  return ({not_started:"Not Started",draft:"Draft",submitted:"Submitted",approved:"Approved",needs_revision:"Needs Revision"})[String(value||"")]||String(value||"Not Started").replaceAll("_"," ");
}
function priestessMembershipLabel(value){return String(value||"flowfm").toLowerCase()==="council"?"Council":"Flow FM";}
function priestessTeamCard(row){
  const profileStarted=String(row.profile_status||"not_started")!=="not_started";
  const image=safeManagerImage(row.profile_photo_url);
  return `<a class="priestess-team-card" href="/manager/priestess-team/?member=${encodeURIComponent(row.member_id)}">
    <div class="priestess-team-card-heading"><img src="${escapeHtml(image)}" alt="${escapeHtml(row.display_name||"Flow FM member")}" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" /><div><p class="eyebrow">${escapeHtml(priestessMembershipLabel(row.membership_type))} · ${escapeHtml(priestessProfileStatusLabel(row.profile_status))}</p><h3>${escapeHtml(row.display_name||"Flow FM Member")}</h3><p>${escapeHtml(row.priestess_title||"Flow FM Member")}</p></div><span class="priestess-availability ${row.mentor_accepting_clients?"is-open":""}">${row.mentor_accepting_clients?"Accepting Clients":"Not Accepting"}</span></div>
    <div class="priestess-team-meta"><span>${escapeHtml(row.email||"")}</span><span>${escapeHtml(row.location||"Location not set")} · ${escapeHtml(row.timezone||"Timezone not set")}</span><span>${Number(row.active_client_count)||0} active client${Number(row.active_client_count)===1?"":"s"} · ${Number(row.pending_request_count)||0} pending request${Number(row.pending_request_count)===1?"":"s"}</span><span>${escapeHtml(row.upcoming_calls_note||"Calendar connection coming soon.")}</span>${profileStarted?"":`<span class="profile-not-started">Profile Studio has not been started yet.</span>`}</div>
  </a>`;
}
function filteredPriestessTeamRows(){
  return priestessConciergeTeam.filter(row=>{
    const membershipMatch=priestessTeamMembershipFilter==="all"||String(row.membership_type||"")===priestessTeamMembershipFilter;
    let statusMatch=true;
    if(priestessTeamStatusFilter==="accepting")statusMatch=row.mentor_accepting_clients===true;
    else if(priestessTeamStatusFilter==="not_accepting")statusMatch=row.mentor_accepting_clients!==true;
    else if(priestessTeamStatusFilter!=="all")statusMatch=String(row.profile_status||"not_started")===priestessTeamStatusFilter;
    return membershipMatch&&statusMatch;
  });
}
function renderPriestessTeamQueue(){
  if(!priestessTeamServiceAvailable){queue.innerHTML='<p class="empty-state">The Priestess Concierge Team requires migration 056.</p>';return;}
  const rows=filteredPriestessTeamRows();
  const statuses=["all","not_started","draft","submitted","approved","needs_revision","accepting","not_accepting"];
  queue.innerHTML=`<section class="priestess-team-directory"><div class="directory-toolbar"><div><p class="eyebrow">PRIESTESS CONCIERGE TEAM</p><h3>${rows.length} Flow FM + Council member${rows.length===1?"":"s"}</h3><p>Every woman is included, even before she begins Profile Studio.</p></div><div class="directory-filter-group"><label>Path<select id="priestessMembershipFilter"><option value="all">Flow FM + Council</option><option value="flowfm" ${priestessTeamMembershipFilter==="flowfm"?"selected":""}>Flow FM</option><option value="council" ${priestessTeamMembershipFilter==="council"?"selected":""}>Council</option></select></label><label>Profile / Availability<select id="priestessStatusFilter">${statuses.map(status=>`<option value="${status}" ${status===priestessTeamStatusFilter?"selected":""}>${status==="all"?"All Members":status==="accepting"?"Accepting Clients":status==="not_accepting"?"Not Accepting Clients":priestessProfileStatusLabel(status)}</option>`).join("")}</select></label></div></div><div class="priestess-team-grid">${rows.length?rows.map(priestessTeamCard).join(""):'<p class="desk-empty-state">No women match these filters.</p>'}</div></section>`;
  document.getElementById("priestessMembershipFilter")?.addEventListener("change",event=>{priestessTeamMembershipFilter=event.target.value;renderPriestessTeamQueue();});
  document.getElementById("priestessStatusFilter")?.addEventListener("change",event=>{priestessTeamStatusFilter=event.target.value;renderPriestessTeamQueue();});
}
async function loadPriestessConciergeTeam(){
  try{priestessConciergeTeam=await listPriestessConciergeTeam();priestessTeamServiceAvailable=true;}
  catch(error){console.warn("Priestess Concierge Team is not available yet.",error);priestessConciergeTeam=[];priestessTeamServiceAvailable=false;}
}


async function loadDesk({silent=false}={}){
  if(deskRefreshInFlight) return;
  deskRefreshInFlight=true;
  try{
    allStays=await getFrontDeskStays();
    await renderConnectionRequests();
    await renderMyClients();
    await loadMemberDirectory();
    await loadPriestessConciergeTeam();
    await loadCaddiePlayerAccess();
    await loadCaddieNetworkData();
    await loadCaddieReviews();
    await loadCaddieCompassPlayers();
    await loadUpcomingGolfEvents();
    await loadAdminTeamMap();
    await loadHonorsData();
    await loadPriestessMailboxData();
    await loadGuestHouseData();
    await loadWorkshopReplayNotes();
    await loadLoungeVideos();
    updateStats();
    if(!conciergeEditorProtected()) renderQueue();
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
  if(conciergeEditorProtected()) return;
  loadDesk({silent:true});
}

function startDeskAutoRefresh(){
  window.clearInterval(deskRefreshTimer);
  deskRefreshTimer=window.setInterval(refreshDeskWhenVisible,DESK_REFRESH_INTERVAL_MS);
}
function withConciergeGateTimeout(promise,label,timeoutMs=15000){
  let timer=null;
  const timeout=new Promise((_,reject)=>{
    timer=window.setTimeout(()=>reject(new Error(`${label} took too long to respond. Refresh the Desk once, or enter through Flowtel again.`)),timeoutMs);
  });
  return Promise.race([promise,timeout]).finally(()=>window.clearTimeout(timer));
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
    const profile=await withConciergeGateTimeout(getCurrentProfile(),"Concierge identity verification");

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

    if(managerMessage) managerMessage.textContent="Owner identity recognized. Opening the Concierge Desk...";
    const hasConciergeAccess=await withConciergeGateTimeout(currentUserHasConciergeAccess(),"Concierge permission verification");
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
    const requestedRoom=new URLSearchParams(window.location.search).get("room");
    if(requestedRoom && document.querySelector(`[data-filter="${requestedRoom}"]`)) setFilter(requestedRoom);
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
document.getElementById("previewPriestessViewButton")?.addEventListener("click",event=>setPriestessPreview(event.currentTarget.getAttribute("aria-pressed")!=="true"));
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));
adminTeamMapDialogClose?.addEventListener("click",()=>adminTeamMapDialog?.close());
adminTeamMapDialog?.addEventListener("click",event=>{if(event.target===adminTeamMapDialog) adminTeamMapDialog.close();});

if(goToSuiteButton) goToSuiteButton.addEventListener("click",goToSuite);
if(initiationHallButton) initiationHallButton.addEventListener("click",markInitiationHallClockIn);
document.addEventListener("visibilitychange",()=>window.setTimeout(refreshDeskWhenVisible,250));
window.addEventListener("focus",()=>{
  if(guestHouseFilePickerOpen) endGuestHouseFilePicker();
  if(loungeVideoFilePickerOpen) endLoungeVideoFilePicker();
  if(priestessInboxFilePickerOpen) endPriestessInboxFilePicker();
  window.setTimeout(refreshDeskWhenVisible,1400);
});
window.addEventListener("beforeunload",event=>{
  if(!conciergeEditorProtected()) return;
  event.preventDefault();
  event.returnValue="";
});
