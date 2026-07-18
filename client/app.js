import { getCurrentUser, signInWithEmail, signUpWithEmail, signOut, updateCurrentPassword, sendPasswordResetEmail, onAuthStateChange } from "../shared/auth.js?v=0.10.49";
import { ensureProfile, getCurrentProfile, updatePowderRoomSharing, profileNeedsPersonalRoomKey, markPersonalRoomKeyCreated } from "../shared/profiles.js?v=0.10.50";
import { createStay, getCycleDayConfirmationContext, getTodayStayForClient, autoCloseOpenStayIfNeeded, saveReflection, closeStayPersonally, clockInPractitioner, getPreviousVisits, markConciergeNotesRead, getDayContent, getMoonMagic, getFlowFmInitiationStatus, listMentors, getMyPractitionerRelationship, chooseMentor, cancelMentorRequest, MENTOR_DATA_CONSENT_LANGUAGE } from "../shared/flowtel.js";
import { membershipFromUrl, labelForMembership, normalizeMembership } from "../shared/membership.js";
import { isPractitionerLevel } from "../shared/beta-access.js";

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
const flowtelLoadingOverlay=document.getElementById("flowtelLoadingOverlay");
const flowtelLoadingCopy=document.getElementById("flowtelLoadingCopy");
const flowtelLoadingHelper=document.getElementById("flowtelLoadingHelper");
const switchAccountButton=document.getElementById("switchAccountButton");
const personalRoomKeyOverlay=document.getElementById("personalRoomKeyOverlay");
const personalRoomKeyTitle=document.getElementById("personalRoomKeyTitle");
const personalRoomKeyCopy=document.getElementById("personalRoomKeyCopy");
const newFlowtelPassword=document.getElementById("newFlowtelPassword");
const confirmFlowtelPassword=document.getElementById("confirmFlowtelPassword");
const personalRoomKeyMessage=document.getElementById("personalRoomKeyMessage");
const savePersonalRoomKeyButton=document.getElementById("savePersonalRoomKeyButton");
const personalRoomKeySwitchButton=document.getElementById("personalRoomKeySwitchButton");
let flowtelLoadingTimer=null;
let personalRoomKeyMode="first-time";
let passwordRecoveryMode=urlParam("passwordRecovery")==="1";
let passwordRecoveryHandled=false;

let currentProfile=null;
let currentMentorRelationship=null;
let currentStay=null;

function updatePhaseOneSuiteLinks(){
  const profileLoungeCard=document.querySelector(".profile-lounge-card");
  if(profileLoungeCard) profileLoungeCard.classList.toggle("hidden", !isPractitionerLevel(currentProfile));
  renderSuiteClockInButton();
}

function setFlowtelLoading(isLoading, copy="The Flowtel is preparing your room..."){
  document.body.classList.toggle("flowtel-is-loading", !!isLoading);
  window.clearTimeout(flowtelLoadingTimer);

  if(flowtelLoadingOverlay){
    flowtelLoadingOverlay.classList.toggle("hidden", !isLoading);
    flowtelLoadingOverlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }

  if(flowtelLoadingCopy && copy) flowtelLoadingCopy.textContent=copy;
  if(flowtelLoadingHelper){
    flowtelLoadingHelper.textContent="One quiet moment while we ready your room.";
  }

  if(isLoading){
    flowtelLoadingTimer=window.setTimeout(()=>{
      if(flowtelLoadingHelper){
        flowtelLoadingHelper.textContent="Your room is still being prepared. Thank you for your patience.";
      }
    },5500);
  }

  authPanel?.querySelectorAll("button,input,select,textarea").forEach(control=>{
    control.disabled=!!isLoading;
  });
}

const SQUARESPACE_MEMBERSHIP = membershipFromUrl();
const FLOWTEL_BETA_PASSWORD = "FlowtelBeta!2026";
const FLOWTEL_TRUSTED_DOORWAY_MODE = true;

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

function titleCaseNamePart(value){
  return String(value || "")
    .trim()
    .replace(/\s+/g," ")
    .split(" ")
    .map(part=>part ? part.charAt(0).toUpperCase()+part.slice(1).toLowerCase() : "")
    .join(" ");
}

function firstNameFromEmail(email){
  const local=String(email||"").split("@")[0] || "guest";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(titleCaseNamePart)
    .join(" ") || "Guest";
}

function urlNameParam(...names){
  for(const name of names){
    const value=urlParam(name);
    if(value) return decodeURIComponent(value).trim();
  }
  return "";
}

function splitFullName(value){
  const parts=String(value || "").trim().replace(/\s+/g," ").split(" ").filter(Boolean);
  if(!parts.length) return {};
  return { firstName:titleCaseNamePart(parts[0]), lastName:titleCaseNamePart(parts.slice(1).join(" ")) };
}

function extractSquarespaceNameParts(){
  const first=urlNameParam("firstName","first_name","memberFirstName","member_first_name");
  const last=urlNameParam("lastName","last_name","memberLastName","member_last_name");
  const full=urlNameParam("name","fullName","full_name","memberName","member_name") ||
    window.FlowtelMember?.name ||
    window.FlowtelMember?.fullName ||
    window.Squarespace?.Member?.name ||
    window.Static?.SQUARESPACE_CONTEXT?.authenticatedAccount?.displayName ||
    window.Static?.SQUARESPACE_CONTEXT?.member?.name ||
    "";

  const contextFirst=
    window.FlowtelMember?.firstName ||
    window.FlowtelMember?.first_name ||
    window.Squarespace?.Member?.firstName ||
    window.Static?.SQUARESPACE_CONTEXT?.authenticatedAccount?.firstName ||
    window.Static?.SQUARESPACE_CONTEXT?.member?.firstName ||
    "";
  const contextLast=
    window.FlowtelMember?.lastName ||
    window.FlowtelMember?.last_name ||
    window.Squarespace?.Member?.lastName ||
    window.Static?.SQUARESPACE_CONTEXT?.authenticatedAccount?.lastName ||
    window.Static?.SQUARESPACE_CONTEXT?.member?.lastName ||
    "";

  if(first || last || contextFirst || contextLast){
    return {
      firstName:titleCaseNamePart(first || contextFirst),
      lastName:titleCaseNamePart(last || contextLast),
    };
  }

  return splitFullName(full);
}

function isLikelyInitials(value){
  const cleaned=String(value || "").replace(/[^A-Za-z]/g,"");
  return cleaned.length > 0 && cleaned.length <= 3 && cleaned === cleaned.toUpperCase();
}

function cleanProfileNameParts(profile={}){
  let first=titleCaseNamePart(profile.first_name || "");
  const last=titleCaseNamePart(profile.last_name || "");
  const emailGuess=firstNameFromEmail(profile.email || extractSquarespaceEmail());
  const emailFirst=splitFullName(emailGuess).firstName || emailGuess;

  if((!first || isLikelyInitials(profile.first_name)) && emailFirst && !isLikelyInitials(emailFirst)){
    first=emailFirst;
  }

  return { firstName:first, lastName:last };
}

function profileFirstName(profile=currentProfile){
  return cleanProfileNameParts(profile).firstName || "Guest";
}

function profileFullName(profile=currentProfile){
  const parts=cleanProfileNameParts(profile);
  return [parts.firstName, parts.lastName].filter(Boolean).join(" ") || profile?.email || "Guest";
}

function directSeasonName(value,{lower=false}={}){
  const cleaned=String(value || "").replace(/^Inner\s+/i,"").trim();
  const normalized=cleaned.toLowerCase()==="autumn" ? "Fall" : (cleaned || "season");
  return lower ? normalized.toLowerCase() : normalized;
}

function trueInnerSeason(value){
  return String(value || "").trim();
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
  const loginEmail=document.getElementById("email");
  if(loginEmail && detectedEmail) loginEmail.value=detectedEmail;
}

function memberBridgeEmail(){
  const emailInput=document.getElementById("memberEmail");
  return (emailInput?.value || extractSquarespaceEmail() || "").trim().toLowerCase();
}

async function verifySquarespaceMember(email,intent="enter"){
  const response=await fetch("/api/squarespace-bridge",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      email,
      intent,
      membershipType:SQUARESPACE_MEMBERSHIP || "queendom",
      doorway:SQUARESPACE_MEMBERSHIP || "queendom",
      trustedDoorway: FLOWTEL_TRUSTED_DOORWAY_MODE,
    }),
  });

  const data=await response.json().catch(()=>({}));

  if(!response.ok || !data.ok){
    throw new Error(data.error || "Squarespace member verification failed.");
  }

  return data;
}

function isAlreadyRegisteredError(error){
  const message=String(error?.message || "").toLowerCase();
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}

function isInvalidCredentialsError(error){
  const message=String(error?.message || "").toLowerCase();
  return message.includes("invalid login") || message.includes("invalid credentials");
}

async function createNewMemberBridge(){
  const email=memberBridgeEmail();

  if(!email){
    setMessage("Add the email you use for your Idyll Collective membership.");
    return;
  }

  try{
    setFlowtelLoading(true,"The Flowtel is preparing your access...");
    setMessage("Finding your Flowtel access...");
    const bridgeData=await verifySquarespaceMember(email,"new");
    try{ localStorage.setItem("flowtel:memberEmail",email); }catch(error){}

    if(!bridgeData.supabaseUserPrepared){
      try{
        await signUpWithEmail(email,FLOWTEL_BETA_PASSWORD);
      }catch(signUpError){
        if(!isAlreadyRegisteredError(signUpError)) throw signUpError;
      }
    }

    setFlowtelLoading(false);
    openReturningMemberLogin(false,"first-time");
    setMessage(bridgeData.accountStatus==="created"
      ? "Your Flowtel access is ready. Enter FlowtelBeta!2026 below. You’ll create your private password before entering your Suite."
      : "Your Flowtel access is ready. Enter the password connected to this account. On your first visit, use FlowtelBeta!2026.");
  }catch(error){
    setFlowtelLoading(false);
    console.error("Flowtel New Member Bridge Error:", error);
    setMessage(`Bridge Error: ${error?.message || "Unknown error"}`);
  }
}

async function openReturningMemberBridge(){
  const email=memberBridgeEmail();

  if(!email){
    setMessage("Add the email you use for your Idyll Collective membership.");
    return;
  }

  try{ localStorage.setItem("flowtel:memberEmail",email); }catch(error){}
  openReturningMemberLogin(false,"returning");
  setMessage("Welcome back. Enter your personal Flowtel password. On your first visit, use FlowtelBeta!2026.");
}

function openReturningMemberLogin(showMessage=true,mode="returning"){
  const email=memberBridgeEmail();
  const devLoginCard=document.getElementById("devLoginCard");
  const emailField=document.getElementById("email");
  const guidance=document.getElementById("loginGuidance");

  if(emailField && email) emailField.value=email;
  if(devLoginCard) devLoginCard.open=true;
  if(guidance){
    guidance.textContent=mode==="first-time"
      ? "Use the temporary Flowtel beta password for this first entrance. You’ll create a private password next."
      : "Enter your personal Flowtel password. On your first visit, use the temporary beta password.";
  }

  if(showMessage){
    setMessage(mode==="first-time"
      ? "Enter FlowtelBeta!2026, then choose Enter the Flowtel."
      : "Welcome back. Enter your Flowtel password, then choose Enter the Flowtel.");
  }

  setTimeout(()=>document.getElementById("password")?.focus(),100);
}

async function openMemberBridge(){
  // Kept for future Squarespace auto-bridge support. During beta, auto-bridge creates a new temporary profile only when explicitly requested with ?auto=1 or ?bridge=1.
  await createNewMemberBridge();
}


// Release 0.10.15 login recovery:
// Keep Phase 1 gating local to the guest app so a missing/new rollout module
// cannot prevent the client login screen from loading.
const FLOWTEL_ROLLOUT={
  phaseLabel:"Phase 1 — Guest Flow + Profile Studio Beta",
  enableClockInForPractitionerRoles:true,
  restrictMentorsToAdminAndOwner:true,
};
const PHASE_ONE_CONCIERGE_EMAIL="mm.johnson@icloud.com";
function canUseClockInFlow(profile={}){
  if(!FLOWTEL_ROLLOUT.enableClockInForPractitionerRoles) return false;
  const email=String(profile?.email || "").trim().toLowerCase();
  const role=String(profile?.role || "").trim().toLowerCase();
  return email===PHASE_ONE_CONCIERGE_EMAIL && ["admin","owner"].includes(role);
}

const BETA_PASSWORD=FLOWTEL_BETA_PASSWORD;
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

function setAuthenticatedAccountVisible(visible){
  switchAccountButton?.classList.toggle("hidden", !visible);
}

function setPersonalRoomKeyMessage(text){
  if(personalRoomKeyMessage) personalRoomKeyMessage.textContent=text || "";
}

function showPersonalRoomKeyPanel(mode="first-time"){
  personalRoomKeyMode=mode;
  setFlowtelLoading(false);
  setPersonalRoomKeyMessage("");

  if(personalRoomKeyTitle){
    personalRoomKeyTitle.textContent=mode==="recovery"
      ? "Choose a new Flowtel password"
      : "Create your Flowtel password";
  }

  if(personalRoomKeyCopy){
    personalRoomKeyCopy.textContent=mode==="recovery"
      ? "Choose a new private password for your Flowtel account. You’ll remain logged in on this browser after it is saved."
      : "Choose the private password you’ll use whenever you return from a new browser or device. Flowtel will remember you on this browser.";
  }

  if(savePersonalRoomKeyButton){
    savePersonalRoomKeyButton.textContent=mode==="recovery"
      ? "Save My New Room Key"
      : "Create My Private Room Key";
  }

  personalRoomKeyOverlay?.classList.remove("hidden");
  personalRoomKeyOverlay?.setAttribute("aria-hidden","false");
  document.body.classList.add("personal-room-key-is-open");
  window.setTimeout(()=>newFlowtelPassword?.focus(),80);
}

function hidePersonalRoomKeyPanel(){
  personalRoomKeyOverlay?.classList.add("hidden");
  personalRoomKeyOverlay?.setAttribute("aria-hidden","true");
  document.body.classList.remove("personal-room-key-is-open");
  if(newFlowtelPassword) newFlowtelPassword.value="";
  if(confirmFlowtelPassword) confirmFlowtelPassword.value="";
  setPersonalRoomKeyMessage("");
}

function removePasswordRecoveryParams(){
  const url=new URL(window.location.href);
  url.searchParams.delete("passwordRecovery");
  url.searchParams.delete("forceDoorway");
  window.history.replaceState({},"",`${url.pathname}${url.search}${url.hash}`);
  passwordRecoveryMode=false;
}

async function continueAuthenticatedEntrance(){
  if(!currentProfile?.id) return;

  setAuthenticatedAccountVisible(true);
  clearCachedSuiteStayIfItBelongsToAnotherGuest();
  setMessage("");
  await prepareDailyStayState();

  if(shouldOpenSuiteFromConcierge() && restoreSuiteFromConcierge()){
    sessionStorage.removeItem("flowtel:openSuiteFromConcierge");
    return;
  }

  if(await openTodaySuiteIfPresent()) return;

  clearCachedSuiteStay();
  currentStay=null;
  pendingArrivalStay=null;
  showCheckIn();
}

function requiresPersonalRoomKey(profile=currentProfile){
  return profileNeedsPersonalRoomKey(profile);
}

async function pauseForPersonalRoomKeyIfNeeded(mode="first-time"){
  if(mode!=="recovery" && !requiresPersonalRoomKey(currentProfile)) return false;
  setAuthenticatedAccountVisible(true);
  showPersonalRoomKeyPanel(mode);
  return true;
}

async function handleSavePersonalRoomKey(){
  const password=newFlowtelPassword?.value || "";
  const confirmation=confirmFlowtelPassword?.value || "";

  if(password.length<10){
    setPersonalRoomKeyMessage("Choose a password with at least 10 characters.");
    return;
  }

  if(password===FLOWTEL_BETA_PASSWORD){
    setPersonalRoomKeyMessage("Choose a private password instead of the temporary beta password.");
    return;
  }

  if(password!==confirmation){
    setPersonalRoomKeyMessage("Those passwords do not match yet.");
    return;
  }

  if(!currentProfile || !Object.prototype.hasOwnProperty.call(currentProfile,"password_setup_completed_at")){
    setPersonalRoomKeyMessage("The Front Desk needs migration 038 before private room keys can be saved.");
    return;
  }

  try{
    savePersonalRoomKeyButton.disabled=true;
    personalRoomKeySwitchButton.disabled=true;
    setPersonalRoomKeyMessage("Creating your private room key...");

    await updateCurrentPassword(password);
    currentProfile=await markPersonalRoomKeyCreated();

    removePasswordRecoveryParams();
    hidePersonalRoomKeyPanel();
    setMessage(personalRoomKeyMode==="recovery"
      ? "Your new private room key is ready."
      : "Your private room key is ready. Welcome home.");
    await continueAuthenticatedEntrance();
  }catch(error){
    console.error("Flowtel personal room key could not be saved.",error);
    setPersonalRoomKeyMessage(error?.message || "Your private room key could not be saved. Please try again.");
  }finally{
    savePersonalRoomKeyButton.disabled=false;
    personalRoomKeySwitchButton.disabled=false;
  }
}

async function handleForgotPassword(){
  const email=(document.getElementById("email")?.value || memberBridgeEmail()).trim().toLowerCase();

  if(!email){
    setMessage("Add your Flowtel email first, then choose Forgot your password?");
    openReturningMemberLogin(false);
    return;
  }

  try{
    setFlowtelLoading(true,"Sending your private room key reset...");
    const redirectTo=`${window.location.origin}/client/?membership=${encodeURIComponent(SQUARESPACE_MEMBERSHIP || "queendom")}&passwordRecovery=1`;
    await sendPasswordResetEmail(email,redirectTo);
    setFlowtelLoading(false);
    setMessage("Check your inbox for a Flowtel password reset link. Open it in this browser to choose a new private room key.");
  }catch(error){
    setFlowtelLoading(false);
    console.error("Flowtel password reset email could not be sent.",error);
    setMessage(error?.message || "The Front Desk could not send that reset email. Please try again.");
  }
}

async function handleSwitchAccount(){
  try{
    await signOut();
  }catch(error){
    console.warn("Flowtel local sign out could not complete cleanly.",error);
  }

  clearCachedSuiteStay();
  try{
    localStorage.removeItem("flowtel:memberEmail");
    sessionStorage.clear();
  }catch(error){}

  hidePersonalRoomKeyPanel();
  setAuthenticatedAccountVisible(false);
  window.location.replace(`/client/?membership=${encodeURIComponent(SQUARESPACE_MEMBERSHIP || "queendom")}&forceDoorway=1`);
}

async function beginPasswordRecovery(user=null){
  if(passwordRecoveryHandled) return;
  passwordRecoveryHandled=true;

  try{
    const recoveredUser=user || await getCurrentUser();
    if(!recoveredUser){
      passwordRecoveryHandled=false;
      setMessage("Open the newest password reset link from your email to choose a new private room key.");
      showScene("lobby");
      return;
    }

    currentProfile=await ensureProfile({
      membershipType:SQUARESPACE_MEMBERSHIP || undefined,
      squarespaceSource:"password-recovery",
    });
    setAuthenticatedAccountVisible(true);
    showPersonalRoomKeyPanel("recovery");
  }catch(error){
    passwordRecoveryHandled=false;
    console.error("Flowtel password recovery could not begin.",error);
    setMessage("That password reset link could not be opened. Request a new one from the Flowtel login.");
  }
}

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

function stayBelongsToCurrentProfile(stay){
  return !!stay && !!currentProfile?.id && stay.client_id===currentProfile.id;
}

function clearCachedSuiteStayIfItBelongsToAnotherGuest(){
  try{
    const cached=sessionStorage.getItem("flowtel:lastSuiteStay");
    if(!cached) return;
    const stay=JSON.parse(cached);
    if(stay?.client_id && currentProfile?.id && stay.client_id!==currentProfile.id){
      clearCachedSuiteStay();
    }
  }catch(error){
    clearCachedSuiteStay();
  }
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
  setFlowtelLoading(false);
  const flowMapLink=document.getElementById("suiteCurrentRoomFlowMapLink");
  if(flowMapLink) flowMapLink.href="/flow-map/";
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
  return canUseClockInFlow(profile);
}

function showCheckIn(){
  setFlowtelLoading(false);
  authPanel.classList.add("hidden");
  checkinForm.classList.remove("hidden");

  const name=profileFirstName(currentProfile);
  document.getElementById("welcomeLine").textContent=`Welcome back, ${name}.`;

  // Guests enter cycle data first, then choose whether they are checking in or clocking in.
  openGuestFields();

  const clockInButton=document.getElementById("clockInButton");
  if(clockInButton){
    clockInButton.classList.toggle("hidden",!canClockIn(currentProfile));
  }
  renderSuiteClockInButton();
}

function renderSuiteClockInButton(){
  const suiteClockInButton=document.getElementById("suiteClockInButton");
  if(!suiteClockInButton) return;
  const allowed=canClockIn(currentProfile);
  suiteClockInButton.classList.toggle("hidden",!allowed);
  suiteClockInButton.setAttribute("aria-hidden", allowed ? "false" : "true");
}

function formatDate(dateString){
  if(!dateString) return "Open";
  const raw=String(dateString);
  const date=/^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric",timeZone:FLOWTEL_TIME_ZONE});
}

function utcFromISO(iso){
  const [year,month,day]=String(iso || localTodayISO()).slice(0,10).split("-").map(Number);
  return Date.UTC(year,month-1,day);
}

function dayDistance(startISO,endISO){
  return Math.round((utcFromISO(endISO)-utcFromISO(startISO))/86400000);
}

function countConsecutiveFlowtelDays(dateValues,today=localTodayISO()){
  const dates=new Set((dateValues || []).filter(Boolean).map(value=>String(value).slice(0,10)));
  let streak=0;
  let cursor=today;
  while(dates.has(cursor)){
    streak+=1;
    const previous=new Date(utcFromISO(cursor)-86400000);
    cursor=previous.toISOString().slice(0,10);
  }
  return streak;
}

function endTypeLabel(type){
  if(type==="manual") return "Personally checked out";
  if(type==="automatic") return "Automatically checked out";
  return "Stay still open";
}

function stayActualDay(stay){
  const value=Number(stay?.cycle_day_actual ?? stay?.cycle_day_calculated ?? stay?.cycle_day_claimed);
  return Number.isFinite(value) ? value : 1;
}

function stayRecordedDay(stay){
  const value=Number(stay?.cycle_day_recorded ?? stay?.cycle_day_claimed ?? stayActualDay(stay));
  return Number.isFinite(value) ? value : stayActualDay(stay);
}

function roomLabelForDay(day){
  const value=Number(day);
  return value>=28 ? "28+" : String(value || 1);
}

function cycleDifferenceLabel(difference){
  const value=Number(difference);
  if(!Number.isFinite(value) || value===0) return "Matched";
  const distance=Math.abs(value);
  const unit=distance===1 ? "day" : "days";
  return value>0 ? `${distance} ${unit} ahead` : `${distance} ${unit} behind`;
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
const WHEEL_DESKTOP_RADIUS = 41.4;
const WHEEL_MOBILE_RADIUS = 41.2;

function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}

function currentWheelMetrics(){
  const shellWidth=Math.max(280,medicineWheel?.clientWidth || window.innerWidth - 36);
  const isMobile=(window.matchMedia && window.matchMedia("(max-width: 700px)").matches) || shellWidth < 500;
  const orbitWidth=isMobile
    ? Math.min(shellWidth,430)
    : Math.min(500,Math.max(420,shellWidth - 150));
  const radius=isMobile ? WHEEL_MOBILE_RADIUS : WHEEL_DESKTOP_RADIUS;
  const daySize=Math.round(isMobile
    ? clamp(orbitWidth * .068,22,29)
    : clamp(orbitWidth * .064,27,32));
  const ringGap=Math.round(clamp(orbitWidth * .016,6,9));
  const ringDiameter=Math.round(orbitWidth * ((radius * 2) / 100));
  const compassSize=Math.round(Math.min(isMobile ? 222 : 252,orbitWidth * (isMobile ? .54 : .55)));

  return {
    isMobile,
    orbitWidth,
    radius,
    daySize,
    ringGap,
    ringDiameter,
    compassSize,
  };
}

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

function wheelPosition(day,metrics=currentWheelMetrics()){
  return wheelPositionAtRadius(day,metrics.radius);
}

function wheelStarPosition(day,metrics=currentWheelMetrics()){
  return wheelPositionAtRadius(day,metrics.radius + 2.55);
}

function wheelSeasonForDay(day){
  const room=normalizedRoom(day);
  if(room >= 27 || room <= 5) return "winter";
  if(room <= 11) return "spring";
  if(room <= 19) return "summer";
  return "autumn";
}

function renderWheel(activeRoom){
  const rooms=Array.from({length:28},(_,i)=>i+1);
  const activeNormalizedRoom=normalizedRoom(activeRoom);
  const wheelMetrics=currentWheelMetrics();
  const starPosition=wheelStarPosition(activeNormalizedRoom,wheelMetrics);
  const activeSeason=wheelSeasonForDay(activeNormalizedRoom);
  const ringOffset=wheelMetrics.daySize + (wheelMetrics.ringGap * 2);

  medicineWheel.style.setProperty("--orbit-size", `${wheelMetrics.orbitWidth}px`);
  medicineWheel.style.setProperty("--ring-base", `${wheelMetrics.ringDiameter}px`);
  medicineWheel.style.setProperty("--day-size", `${wheelMetrics.daySize}px`);
  medicineWheel.style.setProperty("--ring-offset", `${ringOffset}px`);
  medicineWheel.style.setProperty("--compass-size", `${wheelMetrics.compassSize}px`);

  medicineWheel.innerHTML = `
    <div class="mwv2-orbit" aria-label="Cycle day wheel">
      <div class="mwv2-ring mwv2-ring-inner" aria-hidden="true"></div>
      <div class="mwv2-ring mwv2-ring-outer" aria-hidden="true"></div>

      <img
        class="mwv2-compass"
        src="../assets/rose_compass_center.png"
        alt=""
        aria-hidden="true"
      />

      <span class="mwv2-star" style="--star-x:${starPosition.x}%;--star-y:${starPosition.y}%;" aria-hidden="true">✦</span>

      ${rooms.map(room=>{
        const position=wheelPosition(room,wheelMetrics);
        const isActive=room===activeNormalizedRoom;
        return `<button class="mwv2-day ${isActive?"active":""}" type="button" data-room="${room}" style="--x:${position.x}%;--y:${position.y}%" aria-label="Open previous visits for Room ${room===28?"28 plus":room}">${room===28?"28+":room}</button>`;
      }).join("")}
    </div>

    <nav class="mwv2-season-grid" aria-label="Inner season Powder Rooms">
      <a class="mwv2-season-card mwv2-season-autumn ${activeSeason==="autumn"?"current":""}" href="/cycle-data/?season=Inner%20Autumn" aria-label="Open Inner Autumn Powder Room">
        <span class="moon-phase-symbol moon-phase-half-new" aria-hidden="true"></span>
        <strong>Inner Autumn Powder Room</strong><small>Days 20–26</small>
      </a>
      <a class="mwv2-season-card mwv2-season-summer ${activeSeason==="summer"?"current":""}" href="/cycle-data/?season=Inner%20Summer" aria-label="Open Inner Summer Powder Room">
        <span class="moon-phase-symbol moon-phase-full" aria-hidden="true"></span>
        <strong>Inner Summer Powder Room</strong><small>Days 12–19</small>
      </a>
      <a class="mwv2-season-card mwv2-season-winter ${activeSeason==="winter"?"current":""}" href="/cycle-data/?season=Inner%20Winter" aria-label="Open Inner Winter Powder Room">
        <span class="moon-phase-symbol moon-phase-new" aria-hidden="true"></span>
        <strong>Inner Winter Powder Room</strong><small>Days 27–5</small>
      </a>
      <a class="mwv2-season-card mwv2-season-spring ${activeSeason==="spring"?"current":""}" href="/cycle-data/?season=Inner%20Spring" aria-label="Open Inner Spring Powder Room">
        <span class="moon-phase-symbol moon-phase-half-full" aria-hidden="true"></span>
        <strong>Inner Spring Powder Room</strong><small>Days 6–11</small>
      </a>
    </nav>
  `;

  medicineWheel.querySelectorAll("[data-room]").forEach(button=>{
    button.addEventListener("click",()=>openVisitsForRoom(button.dataset.room));
  });

  medicineWheel.querySelectorAll(".mwv2-season-card").forEach(link=>{
    link.addEventListener("click",event=>{
      const href=link.getAttribute("href");
      if(!href) return;
      event.preventDefault();
      window.location.href=href;
    });
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
          <strong>Room ${roomLabelForDay(stayActualDay(visit))}</strong>
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
  const flowMapLink=document.getElementById("suiteCurrentRoomFlowMapLink");
  if(flowMapLink) flowMapLink.href="/flow-map/";
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
  const name=profileFirstName(currentProfile);
  const actualDay=stayActualDay(stay);
  const room=roomLabelForDay(actualDay);

  document.getElementById("keyGuestName").textContent=`${name}, your key is ready.`;
  document.getElementById("keyRoomLine").textContent=`Room ${room}`;
  document.getElementById("keyCourtLine").textContent=stay.court||"Season Court";
  const feedback=document.getElementById("keyCycleFeedback");
  if(feedback) feedback.textContent=stay.cycle_accuracy_message || `You are on day ${actualDay}.`;
}


function setSuiteMoonMagic(liveMoon){
  const suiteMoon=document.getElementById("suiteMoon");
  const suiteMoonTheme=document.getElementById("suiteMoonTheme");
  if(!suiteMoon || !suiteMoonTheme) return;
  suiteMoon.textContent=`${liveMoon.phase} · Day ${liveMoon.moonDay}`;
  suiteMoonTheme.innerHTML=`<span class="moon-theme-line">${escapeHtml(liveMoon.theme)}</span><span class="moon-next-new-moon">Next New Moon: ${escapeHtml(formatDate(liveMoon.nextNewMoonDate))}</span>`;
}

function isPowderRoomSharingEnabled(){
  return !currentProfile?.collective_season_notes_opt_out;
}

function setPowderRoomPanelOpen(open){
  const panel=document.getElementById("powderRoomSharingPanel");
  const expand=document.getElementById("powderRoomSharingExpandButton");
  if(panel){
    panel.classList.toggle("hidden",!open);
    panel.hidden=!open;
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if(expand) expand.setAttribute("aria-expanded", open ? "true" : "false");
}

function renderPowderRoomSharingSetting(){
  const toggle=document.getElementById("powderRoomSharingToggle");
  const status=document.getElementById("powderRoomSharingStatus");
  const inline=document.getElementById("powderRoomSharingInline");
  const copy=document.getElementById("powderRoomSharingCopy");
  const expand=document.getElementById("powderRoomSharingExpandButton");
  if(!toggle) return;
  const sharingEnabled=isPowderRoomSharingEnabled();
  toggle.checked=sharingEnabled;
  if(copy){
    copy.textContent=sharingEnabled
      ? "Your reflections will be shared anonymously in the Powder Rooms."
      : "Powder Room sharing is off. Your reflections stay out of the anonymous rooms.";
  }else if(inline){
    inline.firstChild.textContent=sharingEnabled
      ? "Your reflections will be shared anonymously in the Powder Rooms. "
      : "Powder Room sharing is off. Your reflections stay out of the anonymous rooms. ";
  }
  if(expand){
    expand.textContent=sharingEnabled ? "Click here to opt out." : "Click here to adjust.";
  }
  if(status){
    status.textContent=sharingEnabled
      ? ""
      : "Powder Room sharing is off. Your reflections stay out of the anonymous rooms.";
  }
}

async function handlePowderRoomSharingChange(event){
  const toggle=event.currentTarget;
  const status=document.getElementById("powderRoomSharingStatus");
  const enabled=!!toggle.checked;
  try{
    toggle.disabled=true;
    if(status) status.textContent=enabled ? "Turning Powder Room sharing on..." : "Turning Powder Room sharing off...";
    currentProfile=await updatePowderRoomSharing(enabled);
    renderPowderRoomSharingSetting();
  }catch(error){
    console.error(error);
    toggle.checked=!enabled;
    if(status) status.textContent="This setting could not be saved. Please try again.";
  }finally{
    toggle.disabled=false;
  }
}

function renderSuite(stay){
  currentStay=stay;
  renderSuiteClockInButton();

  const name=profileFirstName(currentProfile);
  const actualDay=stayActualDay(stay);
  const recordedDay=stayRecordedDay(stay);
  const room=roomLabelForDay(actualDay);
  const content=getDayContent(actualDay);

  document.getElementById("suiteWelcome").textContent=`Welcome home, ${name}.`;

  const feelsLikeName=directSeasonName(stay.feels_like_inner_season,{lower:true});
  const connector=trueInnerSeason(stay.inner_season)===trueInnerSeason(stay.feels_like_inner_season)?"and":"but";
  const recordedAside=recordedDay!==actualDay ? ` You recorded day ${recordedDay}.` : "";
  const soSeasonTag=(recordedDay!==actualDay && trueInnerSeason(stay.inner_season)!==trueInnerSeason(stay.feels_like_inner_season))
    ? ` That’s so <em>${escapeHtml(feelsLikeName)}</em> of you.`
    : "";
  document.getElementById("suiteSubline").innerHTML=`You're on day ${escapeHtml(actualDay)} ${connector} today feels like ${escapeHtml(feelsLikeName)}.${escapeHtml(recordedAside)}${soSeasonTag}`;

  document.getElementById("loungeCourtTitle").textContent=`Welcome to the ${stay.court || "Season Court"}.`;

  const liveMoon = getMoonMagic();
  setSuiteMoonMagic(liveMoon);

  document.getElementById("suiteRoom").textContent=`Room ${room}`;
  document.getElementById("suiteSeason").textContent=`${stay.inner_season||"Inner season"} · feels like ${stay.feels_like_inner_season ? directSeasonName(stay.feels_like_inner_season,{lower:true}) : "not recorded"}`;
  const dayOne=document.getElementById("suiteDayOne");
  if(dayOne) dayOne.textContent="";
  renderCycleData(stay);

  const currentRoomCard=document.querySelector(".wheel-current-room");
  if(currentRoomCard && !document.getElementById("suiteFlowtelDate")){
    const dateLine=document.createElement("p");
    dateLine.id="suiteFlowtelDate";
    dateLine.className="suite-flowtel-date";
    dateLine.setAttribute("data-flowtel-clock","");
    currentRoomCard.appendChild(dateLine);
  }
  const flowMapLink=document.getElementById("suiteCurrentRoomFlowMapLink");
  if(flowMapLink) flowMapLink.href="/flow-map/";
  updateFlowtelTimestamp();

  document.getElementById("roomTitle").textContent=`${content.title} · Room ${room}`;
  document.getElementById("roomAffirmation").textContent=content.affirmation;
  document.getElementById("roomPrompt").textContent=content.prompt;
  document.getElementById("roomQueenMove").textContent=content.queenMove;

  document.getElementById("reflectionInput").value="";
  renderPowderRoomSharingSetting();
  setPowderRoomPanelOpen(false);

  renderConciergeCare(stay);
  renderPractitionerConnection();
  updatePhaseOneSuiteLinks();

  renderWheel(actualDay);
  window.requestAnimationFrame(()=>{
    if(currentStay===stay && suiteScene?.classList.contains("active")) renderWheel(actualDay);
  });
  refineWheelLegend();
  renderReflectionMoonMagic(stay);
}

function cycleDataMarkup(stay,{previousCycleLine="",streakLine="",welcomeBackLine=""}={}){
  const actual=stayActualDay(stay);
  const recorded=stayRecordedDay(stay);
  const difference=Number(stay?.cycle_day_difference ?? (recorded-actual));
  const accuracyMessage=stay?.cycle_accuracy_message || (difference===0 ? `You nailed it. You are on day ${actual}.` : "Your cycle data has been updated.");

  return `
    <div class="cycle-data-grid">
      <p><span>Actual Cycle Day</span><strong>${escapeHtml(actual)}</strong></p>
      <p><span>Recorded Cycle Day</span><strong>${escapeHtml(recorded)}</strong></p>
    </div>
    <p class="cycle-accuracy-message">${escapeHtml(accuracyMessage)}</p>
    ${previousCycleLine}
    ${streakLine}
    ${welcomeBackLine}
  `;
}

async function renderCycleData(stay){
  const card=document.getElementById("cycleDataCard");
  const content=document.getElementById("cycleDataContent");
  if(!card||!content) return;

  // Render the core Actual vs Recorded data immediately.
  // Stay history is helpful, but it should never block the visible Cycle Data pill from updating.
  content.innerHTML=cycleDataMarkup(stay);

  let streakLine="";
  let welcomeBackLine="";
  let previousCycleLine="";

  if(stay?.previous_cycle_length_days){
    previousCycleLine=`<p><strong>Previous cycle:</strong> ${escapeHtml(stay.previous_cycle_length_days)} days.</p>`;
  }

  try{
    const visits=currentProfile?.id ? await getPreviousVisits(currentProfile.id) : [];
    const dates=[stay?.checkin_date, ...(visits || []).map(visit=>visit.checkin_date || String(visit.checked_in_at || "").slice(0,10))]
      .filter(Boolean)
      .map(value=>String(value).slice(0,10));
    const uniqueDates=[...new Set(dates)].sort();
    const streak=countConsecutiveFlowtelDays(uniqueDates, localTodayISO());

    if(streak>14){
      streakLine=`<p><strong>Check-in streak:</strong> ${streak} days in flow.</p>`;
    }

    const today=localTodayISO();
    const previous=uniqueDates.filter(date=>date<today).sort().pop();
    if(previous && dayDistance(previous,today)>=14){
      welcomeBackLine=`<p class="cycle-welcome-back">We're glad you took some time away. It's good for you. Welcome back — we have space for you.</p>`;
    }

    content.innerHTML=cycleDataMarkup(stay,{previousCycleLine,streakLine,welcomeBackLine});
  }catch(error){
    console.warn("Cycle Data card could not load full stay history yet.",error);
  }
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
  // Moon Magic now lives above the Medicine Wheel, not inside the Reflection card.
  // Remove any older injected Reflection pill so cached visits do not duplicate the guidance.
  const oldReflectionMoonRow=document.getElementById("reflectionMoonMagic");
  if(oldReflectionMoonRow) oldReflectionMoonRow.remove();

  const suiteMoonPill=document.getElementById("suiteMoonMagicPill");
  const liveMoon=getMoonMagic();
  setSuiteMoonMagic(liveMoon);
  if(suiteMoonPill) suiteMoonPill.classList.remove("hidden");
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



function mentorDisplayName(profile){
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Your Mentor";
}

function mentorFirstName(profile){
  return profile?.first_name || mentorDisplayName(profile).split(" ")[0] || "Mentor";
}

function mentorTitle(profile){
  const initiation=getFlowFmInitiationStatus(profile || {});
  return profile?.mentor_title || initiation?.level || profile?.practitioner_level || "Flowtel Mentor";
}

function mentorMetaLine(profile){
  return "";
}

function mentorSpecialties(profile){
  const raw=profile?.mentor_specialties;
  if(Array.isArray(raw)) return raw.filter(Boolean).slice(0,3);
  if(typeof raw==="string") return raw.split(",").map(item=>item.trim()).filter(Boolean).slice(0,3);
  return [];
}

function mentorCardMarkup(mentor){
  const name=mentorDisplayName(mentor);
  const first=mentorFirstName(mentor);
  const bio=mentor?.mentor_bio || "Available to witness your Flowtel stays, tend your room, and remember your cyclical patterns with care.";
  const specialties=mentorSpecialties(mentor);
  const photoUrl=mentor?.mentor_photo_url || "../assets/queendom-scarab-sundisk.png";
  return `
    <article class="mentor-option-card">
      <div class="mentor-avatar" aria-hidden="true"><img src="${escapeHtml(photoUrl)}" alt="" /></div>
      <div class="mentor-option-body">
        <p class="mentor-label">${escapeHtml(mentorTitle(mentor))}</p>
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(bio)}</p>
      </div>
      <button type="button" class="mentor-choice-button" data-practitioner-id="${mentor.id}">Choose ${escapeHtml(first)}</button>
    </article>
  `;
}

function openMentorPanel(relationship=currentMentorRelationship){
  const panel=document.getElementById("mentorPanel");
  const title=document.getElementById("mentorPanelTitle");
  const copy=document.getElementById("mentorPanelCopy");
  const photo=document.getElementById("mentorPanelPhoto");
  const calls=document.getElementById("mentorPanelCalls");
  const notes=document.getElementById("mentorPanelNotes");
  const support=document.getElementById("mentorPanelSupport");
  if(!panel) return;
  const mentor=relationship?.practitioner || null;
  const name=mentorDisplayName(mentor);
  const photoUrl=mentor?.profile_photo_url || mentor?.mentor_photo_url || "../assets/flowtel-pinkrose.png";
  if(photo){
    photo.src=photoUrl;
    photo.alt=name ? `${name} profile photo` : "Mentor profile photo";
    photo.onerror=()=>{ photo.onerror=null; photo.src="../assets/flowtel-pinkrose.png"; };
  }
  if(title) title.textContent=name ? `${name} · Mentor Panel` : "Your Mentor to the Moon";
  if(copy) copy.textContent=name
    ? `${name} is connected to your Flowtel stays. This panel will become the home for calls, notes exchanged, and between-call reflections.`
    : "Choose a mentor to open the Mentor Panel.";
  if(calls) calls.textContent=mentor?.mentor_scheduling_url || mentor?.scheduling_url || mentor?.booking_url
    ? "Use the Schedule Call button above while call syncing is being prepared."
    : "No upcoming calls have been added yet.";
  if(notes) notes.textContent="Notes exchanged and mentor reflections will appear here in a future mentorship release.";
  if(support) support.textContent="Your mentor will eventually be able to review your Flowtel data and leave reflections for you to read between calls.";
  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"start"});
}

function closeMentorPanel(){
  document.getElementById("mentorPanel")?.classList.add("hidden");
}

async function renderPractitionerConnection(){
  const card=document.getElementById("practitionerCard");
  const title=document.getElementById("practitionerCardTitle");
  const text=document.getElementById("practitionerCardText");
  const directory=document.getElementById("practitionerDirectory");
  const button=document.getElementById("choosePractitionerButton");
  const scheduleButton=document.getElementById("scheduleMentorCallButton");
  const note=document.getElementById("practitionerMessage");

  if(!card||!title||!text||!directory||!button) return;

  directory.classList.add("hidden");
  directory.innerHTML="";
  if(scheduleButton){
    scheduleButton.classList.add("hidden");
    scheduleButton.removeAttribute("href");
  }
  if(note) note.textContent="";

  try{
    const relationship=await getMyPractitionerRelationship();
    currentMentorRelationship=relationship || null;

    if(relationship?.status==="connected"){
      const mentor=relationship.practitioner;
      const name=mentorDisplayName(mentor);
      title.textContent=name;
      text.textContent=`${name} is your Mentor to the Moon. This connection will stay with you across future stays until you intentionally change it.`;
      button.textContent="Open Mentor Panel";
      button.disabled=false;
      button.onclick=()=>openMentorPanel(relationship);
      if(scheduleButton){
        const schedulingUrl=mentor?.mentor_scheduling_url || mentor?.scheduling_url || mentor?.booking_url || "#";
        scheduleButton.href=schedulingUrl;
        scheduleButton.classList.remove("hidden");
        scheduleButton.setAttribute("aria-disabled", schedulingUrl==="#" ? "true" : "false");
      }
      return;
    }

    if(relationship?.status==="requested"){
      const mentor=relationship.practitioner;
      const name=mentorDisplayName(mentor);
      title.textContent=`Invitation sent to ${name}.`;
      text.textContent="Your mentor request is waiting at the Concierge Desk. When they connect, your stays can be tended with continuity.";
      button.textContent="Cancel / Change Request";
      button.disabled=false;
      button.onclick=async()=>{
        const confirmed=window.confirm("Cancel this mentor request and choose someone else?");
        if(!confirmed) return;
        try{
          button.disabled=true;
          button.textContent="Cancelling...";
          if(note) note.textContent="Cancelling your mentor request...";
          await cancelMentorRequest(relationship.id);
          if(note) note.textContent="Mentor request cancelled. You can choose another mentor now.";
          await renderPractitionerConnection();
        }catch(error){
          console.error(error);
          button.disabled=false;
          button.textContent="Cancel / Change Request";
          if(note) note.textContent=error?.message || "This mentor request could not be cancelled yet.";
        }
      };
      return;
    }

    currentMentorRelationship=null;
    title.textContent="Invite a mentor to witness your Flowtel journey.";
    text.textContent="A mentor can witness your stays, tend your room, and help you notice the patterns your cycle reveals.";
    button.textContent="Choose Your Mentor";
    button.disabled=false;

    button.onclick=async()=>{
      try{
        button.disabled=true;
        if(note) note.textContent="Opening the mentor directory...";
        const mentors=await listMentors();

        if(!mentors.length){
          directory.classList.remove("hidden");
          directory.innerHTML="<p>No mentors are available yet.</p>";
          if(note) note.textContent="";
          button.disabled=false;
          return;
        }

        directory.classList.remove("hidden");
        directory.innerHTML=`
          <p class="microcopy mentor-consent-copy">${escapeHtml(MENTOR_DATA_CONSENT_LANGUAGE)}</p>
          <div class="mentor-directory-grid">
            ${mentors.map(mentor=>mentorCardMarkup(mentor)).join("")}
          </div>
        `;

        directory.querySelectorAll("[data-practitioner-id]").forEach(option=>{
          option.addEventListener("click",async()=>{
            option.disabled=true;
            option.textContent="Sending invitation...";
            if(note) note.textContent="Sending your mentor invitation...";
            await chooseMentor(option.dataset.practitionerId);
            if(note) note.textContent="Mentor invitation sent.";
            await renderPractitionerConnection();
          });
        });

        if(note) note.textContent="";
        button.disabled=false;
      }catch(error){
        console.error(error);
        if(note) note.textContent=error?.message || "The mentor directory is not available yet. Run the latest relationship migration.";
        button.disabled=false;
      }
    };
  }catch(error){
    console.warn("Mentor relationship lookup failed.",error);
    title.textContent="Your Mentor to the Moon";
    text.textContent="Mentor connections will appear here after the relationship migration is installed.";
    button.textContent="Choose Your Mentor";
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

async function openRememberedRoomKey(){
  if(urlParam("logout")==="1"){
    await signOut();
    clearCachedSuiteStay();
    try{
      localStorage.removeItem("flowtel:memberEmail");
      sessionStorage.clear();
    }catch(error){}
    setAuthenticatedAccountVisible(false);
    setMessage("Your Flowtel session has been cleared for testing. You can enter again when you are ready.");
    showScene("lobby");
    return true;
  }

  if(urlParam("forceDoorway")==="1"){
    clearCachedSuiteStay();
    setAuthenticatedAccountVisible(false);
    return false;
  }

  try{
    const user=await getCurrentUser();
    if(!user) return false;

    setFlowtelLoading(true,"We’re logging you in.");
    setMessage("We're logging you in.");
    currentProfile=await ensureProfile({
      membershipType:SQUARESPACE_MEMBERSHIP || undefined,
      squarespaceSource:"remembered-flowtel-access",
    });

    if(user.email){
      try{ localStorage.setItem("flowtel:memberEmail",user.email.toLowerCase()); }catch(error){}
    }

    if(await pauseForPersonalRoomKeyIfNeeded()) return true;
    await continueAuthenticatedEntrance();
    return true;
  }catch(error){
    setFlowtelLoading(false);
    console.warn("Remembered Flowtel access could not open automatically.",error);
    clearCachedSuiteStay();
    return false;
  }
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
    setFlowtelLoading(true,"The Flowtel is preparing your room...");
    setMessage(`Opening beta account for ${account.firstName}...`);
    await signOut();
    clearCachedSuiteStay();

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
    if(await pauseForPersonalRoomKeyIfNeeded()) return;
    await continueAuthenticatedEntrance();
  }catch(error){
    setFlowtelLoading(false);
    setMessage("This beta account could not open. If email confirmation is enabled in Supabase, create the beta auth users manually first.");
    console.error(error);
  }
}

async function handleSignIn(){
  try{
    setMessage("Entering the Flowtel...");

    const email=document.getElementById("email").value.trim().toLowerCase();
    const password=document.getElementById("password").value;

    if(!email||!password){
      setMessage("Add your email and password.");
      return;
    }

    setFlowtelLoading(true,"The Flowtel is preparing your room...");
    await signOut();
    clearCachedSuiteStay();
    await signInWithEmail(email,password);

    try{ localStorage.setItem("flowtel:memberEmail",email); }catch(error){}
    document.getElementById("password").value="";

    currentProfile=await ensureProfile({
      membershipType:SQUARESPACE_MEMBERSHIP || undefined,
      squarespaceSource:SQUARESPACE_MEMBERSHIP || undefined,
    });

    if(await pauseForPersonalRoomKeyIfNeeded()) return;
    await continueAuthenticatedEntrance();
  }catch(error){
    setFlowtelLoading(false);
    if(isInvalidCredentialsError(error)){
      setMessage("Flowtel could not match that email and password. Use the private password you created. On your first visit, use FlowtelBeta!2026.");
    }else{
      setMessage("Your Passport could not be opened. Please check your email and password or message the Front Desk.");
    }
    console.error(error);
  }
}

function dayWord(count){
  return Number(count)===1 ? "day" : "days";
}

function showCycleResetConfirmation(context){
  const panel=document.getElementById("cycleResetConfirmation");
  const copy=document.getElementById("cycleResetConfirmationCopy");
  const yes=document.getElementById("cycleResetYesButton");
  const no=document.getElementById("cycleResetNoButton");
  if(!panel || !yes || !no) return Promise.resolve(false);

  const distance=Math.abs(Number(context.recordedDay)-Number(context.actualDay));
  if(copy){
    copy.textContent=`Flowtel has you on Day ${context.actualDay}, but you recorded Day ${context.recordedDay}. Did a new cycle begin, or is your mind ${distance} ${dayWord(distance)} behind your body?`;
  }

  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"center"});

  return new Promise(resolve=>{
    const finish=value=>{
      yes.removeEventListener("click",handleYes);
      no.removeEventListener("click",handleNo);
      panel.classList.add("hidden");
      resolve(value);
    };
    const handleYes=()=>finish(true);
    const handleNo=()=>{
      if(context.behindMessage) setMessage(context.behindMessage);
      finish(false);
    };
    yes.addEventListener("click",handleYes,{once:true});
    no.addEventListener("click",handleNo,{once:true});
  });
}

async function maybeConfirmCycleReset(recordedDay){
  const context=await getCycleDayConfirmationContext(recordedDay);
  if(!context?.needsConfirmation) return false;
  return showCycleResetConfirmation(context);
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
    if(stay?.client_id && currentProfile?.id && stay.client_id!==currentProfile.id){
      clearCachedSuiteStay();
      return;
    }
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

function requestedGuestScene(){
  const params=new URLSearchParams(window.location.search);
  return params.get("lounge")==="1" ? "lounge" : "suite";
}

function restoreSuiteFromConcierge(){
  const stay=getCachedSuiteStay();
  if(!stay || !isStayForLocalToday(stay) || !stayBelongsToCurrentProfile(stay)){
    clearCachedSuiteStay();
    return false;
  }

  currentStay=stay;
  pendingArrivalStay=stay;
  renderSuite(stay);
  showScene(requestedGuestScene());
  window.scrollTo({top:0,behavior:"smooth"});
  return true;
}

async function openTodaySuiteIfPresent(){
  if(!currentProfile?.id) return false;

  const params=new URLSearchParams(window.location.search);
  if(params.get("forceCheckin")==="1") return false;

  const stay=await getTodayStayForClient(currentProfile.id);
  if(!stay || !isStayForLocalToday(stay) || !stayBelongsToCurrentProfile(stay)){
    clearCachedSuiteStay();
    return false;
  }

  currentStay=stay;
  pendingArrivalStay=stay;
  cacheSuiteStay(stay);
  renderSuite(stay);
  showScene(requestedGuestScene());
  window.scrollTo({top:0,behavior:"smooth"});
  return true;
}

async function ensureArrivalStay(){
  if(currentStay && isStayForLocalToday(currentStay) && stayBelongsToCurrentProfile(currentStay)) return currentStay;
  if(pendingArrivalStay && isStayForLocalToday(pendingArrivalStay) && stayBelongsToCurrentProfile(pendingArrivalStay)) return pendingArrivalStay;

  currentStay=null;
  pendingArrivalStay=null;

  const arrival=readArrivalFields();
  if(!arrival) return null;

  const newCycleConfirmed=await maybeConfirmCycleReset(arrival.cycleDay);
  pendingArrivalStay=await createStay({...arrival,newCycleConfirmed});
  currentStay=pendingArrivalStay;
  cacheSuiteStay(currentStay);
  return currentStay;
}

async function handleCheckIn(){
  try{
    setMessage("");

    const stay=await ensureArrivalStay();
    if(!stay){
      showScene("lobby");
      return;
    }

    showScene("preparing");

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
    setMessage("Your Flowtel access could not be prepared. Please try again or message the Front Desk.");
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

    currentStay=await saveReflection(currentStay.id,value,{shareInPowderRooms:isPowderRoomSharingEnabled()});
    cacheSuiteStay(currentStay);
    input.value="";
    if(message) message.textContent="Reflection saved. Your stay has remembered this note.";

    // Refresh open previous-visit drawer if the current room is being viewed.
    const drawer=document.getElementById("visitsDrawer");
    if(drawer && !drawer.classList.contains("hidden")){
      await openVisitsForRoom(stayActualDay(currentStay));
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
    currentStay=await closeStayPersonally(currentStay.id,document.getElementById("checkoutInput").value,{shareInPowderRooms:isPowderRoomSharingEnabled()});
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
    setMessage("The Concierge Desk is reserved for the Flowtel owner during Phase 1.");
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
const forgotPasswordButton=document.getElementById("forgotPasswordButton");
if(forgotPasswordButton) forgotPasswordButton.addEventListener("click",handleForgotPassword);
if(savePersonalRoomKeyButton) savePersonalRoomKeyButton.addEventListener("click",handleSavePersonalRoomKey);
if(personalRoomKeySwitchButton) personalRoomKeySwitchButton.addEventListener("click",handleSwitchAccount);
if(switchAccountButton) switchAccountButton.addEventListener("click",handleSwitchAccount);
const guestModeButton=document.getElementById("guestModeButton");
if(guestModeButton) guestModeButton.addEventListener("click",openGuestFields);
document.getElementById("clockInButton").addEventListener("click",handleClockIn);
const suiteClockInButton=document.getElementById("suiteClockInButton");
if(suiteClockInButton) suiteClockInButton.addEventListener("click",handleClockIn);
document.getElementById("checkInButton").addEventListener("click",handleCheckIn);
document.getElementById("saveReflectionButton").addEventListener("click",handleSaveReflection);
document.getElementById("checkoutButton").addEventListener("click",handleCheckout);
const returnLobbyButton=document.getElementById("returnLobbyButton");
if(returnLobbyButton) returnLobbyButton.addEventListener("click",openCheckoutFromSuite);
document.getElementById("flowtelLoungeButton").addEventListener("click",()=>showScene("lounge"));
document.getElementById("backToSuiteButton").addEventListener("click",()=>{showScene("suite");window.scrollTo({top:0,behavior:"smooth"});});
const checkoutReturnButton=document.getElementById("checkoutReturnButton");
if(checkoutReturnButton) checkoutReturnButton.addEventListener("click",()=>{showScene("lobby");window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("closeVisitsButton").addEventListener("click",()=>document.getElementById("visitsDrawer").classList.add("hidden"));



let wheelResizeTimer=null;
window.addEventListener("resize",()=>{
  if(!currentStay) return;
  clearTimeout(wheelResizeTimer);
  wheelResizeTimer=setTimeout(()=>renderWheel(stayActualDay(currentStay)),120);
});

const powderRoomSharingExpandButton=document.getElementById("powderRoomSharingExpandButton");
if(powderRoomSharingExpandButton){
  powderRoomSharingExpandButton.addEventListener("click",()=>setPowderRoomPanelOpen(true));
}
const powderRoomSharingCollapseButton=document.getElementById("powderRoomSharingCollapseButton");
if(powderRoomSharingCollapseButton){
  powderRoomSharingCollapseButton.addEventListener("click",()=>setPowderRoomPanelOpen(false));
}
const closeMentorPanelButton=document.getElementById("closeMentorPanelButton");
if(closeMentorPanelButton){
  closeMentorPanelButton.addEventListener("click",closeMentorPanel);
}

const powderRoomSharingToggle=document.getElementById("powderRoomSharingToggle");
if(powderRoomSharingToggle){
  powderRoomSharingToggle.addEventListener("change",handlePowderRoomSharingChange);
}

// Supabase emits PASSWORD_RECOVERY after a member opens the secure reset link.
// Keep this listener active before the normal remembered-session boot runs.
onAuthStateChange((event,session)=>{
  if(event!=="PASSWORD_RECOVERY") return;
  passwordRecoveryMode=true;
  window.setTimeout(()=>beginPasswordRecovery(session?.user || null),0);
});

// Auto-enter remains opt-in for later Squarespace code injection.
// Remembered Flowtel access is the primary experience after a private room key
// has been created: an existing Supabase session bypasses the doorway.
async function bootFlowtelClient(){
  if(passwordRecoveryMode){
    const user=await getCurrentUser();
    if(user){
      await beginPasswordRecovery(user);
      return;
    }
    setMessage("Open the newest password reset link from your email to choose a new private room key.");
    showScene("lobby");
    return;
  }

  const openedRememberedRoom=await openRememberedRoomKey();
  if(openedRememberedRoom) return;

  if((urlParam("auto")==="1" || urlParam("bridge")==="1") && extractSquarespaceEmail()){
    await openMemberBridge();
  }
}

bootFlowtelClient();
