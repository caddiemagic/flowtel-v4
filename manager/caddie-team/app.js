import { currentUserHasConciergeAccess } from "../../shared/flowtel.js?v=0.10.70";
import {
  getCaddieConciergeProfile,
  getCaddieTeamMessages,
  sendCaddieTeamMessage,
  setCompassConsecrated,
} from "../../shared/caddie-magic-network.js?v=0.5.2";

const $=(id)=>document.getElementById(id);
const WEEKDAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const caddieProfileId=new URLSearchParams(location.search).get("caddie")||"";
let detail=null;
let messages=[];

function escapeHtml(value=""){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function label(value=""){return String(value||"").replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}
function dateTime(value){if(!value)return "—";return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(value));}
function dateOnly(value){if(!value)return "—";const raw=String(value).slice(0,10);return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(`${raw}T12:00:00`));}
function setStatus(text,error=false){$("teamMessage").textContent=text;$("teamMessage").classList.toggle("error",error);}
function safeArray(value){return Array.isArray(value)?value:[];}

function compassState(profile,compass){
  if(profile?.compass_consecrated_at)return "Consecrated";
  const complete=["north_club","east_club","south_club","west_club"].every(key=>String(compass?.[key]||"").trim());
  return complete?"Complete":"Incomplete";
}

function renderIdentity(){
  const profile=detail.profile||{};
  const courses=safeArray(detail.courses);
  $("teamIdentityCard").innerHTML=`<div class="team-identity"><div><p class="cm-eyebrow">${escapeHtml(label(profile.status||"draft"))}</p><h2>${escapeHtml(profile.display_name||"Caddie")}</h2><p>${escapeHtml(profile.professional_title||"Caddie Concierge Team")}</p></div><div class="team-identity-meta"><span>${escapeHtml(profile.email||"")}</span><span>${escapeHtml(profile.city||"Location not set")} · ${escapeHtml(profile.timezone||"Timezone not set")}</span><span>${courses.length?courses.map(row=>escapeHtml(row.course_name)).join(" · "):"Courses not set"}</span><span>${profile.accepting_requests?"Accepting Player requests":"Not accepting Player requests"}</span></div></div>`;
}

function renderSummary(){
  const requests=safeArray(detail.player_requests);
  const consultations=safeArray(detail.consultations);
  const assignments=safeArray(detail.assignments);
  const upcoming=consultations.filter(row=>row.status==="scheduled"&&new Date(row.starts_at)>=new Date()).length;
  $("teamSummaryGrid").innerHTML=`
    <article class="cm-card team-summary"><span>Players</span><strong>${requests.filter(row=>row.status==="accepted").length}</strong><small>Accepted relationships</small></article>
    <article class="cm-card team-summary"><span>Upcoming Calls</span><strong>${upcoming}</strong><small>Scheduled consultations</small></article>
    <article class="cm-card team-summary"><span>Assignments</span><strong>${assignments.length}</strong><small>Compass work preserved</small></article>
    <article class="cm-card team-summary"><span>Profile</span><strong>${escapeHtml(label(detail.profile?.status||"draft"))}</strong><small>Updated ${escapeHtml(dateOnly(detail.profile?.updated_at))}</small></article>`;
}

function renderCompass(){
  const profile=detail.profile||{};
  const compass=detail.compass||{};
  const state=compassState(profile,compass);
  const complete=state!=="Incomplete";
  $("teamCompassCard").innerHTML=`<div class="team-section-heading"><div><p class="cm-eyebrow">CADDIE COMPASS</p><h2>${escapeHtml(state)}</h2></div><button class="cm-button ${state==="Consecrated"?"secondary":""}" id="consecrateCompassButton" type="button" ${complete?"":"disabled"}>${state==="Consecrated"?"Remove Consecration":"Consecrate Compass"}</button></div><div class="compass-club-grid"><article><span>North</span><strong>${escapeHtml(compass.north_club||"Not chosen")}</strong></article><article><span>East</span><strong>${escapeHtml(compass.east_club||"Not chosen")}</strong></article><article><span>South</span><strong>${escapeHtml(compass.south_club||"Not chosen")}</strong></article><article><span>West</span><strong>${escapeHtml(compass.west_club||"Not chosen")}</strong></article></div><p class="cm-muted">Consecration is granted by The Caddie Master after the required Compass work is complete.</p>`;
  $("consecrateCompassButton")?.addEventListener("click",async()=>{
    const button=$("consecrateCompassButton");button.disabled=true;
    try{await setCompassConsecrated(caddieProfileId,state!=="Consecrated");detail=await getCaddieConciergeProfile(caddieProfileId);renderCompass();}
    catch(error){setStatus(error?.message||"Compass consecration could not be updated.",true);button.disabled=false;}
  });
}

function renderAvailability(){
  const weekly=safeArray(detail.weekly_availability);
  const exceptions=safeArray(detail.availability_exceptions);
  $("teamAvailabilityCard").innerHTML=`<p class="cm-eyebrow">AVAILABILITY</p><h2>Recurring Calls + Caddying</h2><div class="detail-list">${weekly.length?weekly.map(row=>`<article><strong>${escapeHtml(WEEKDAYS[Number(row.weekday)]||`Day ${Number(row.weekday)+1}`)} · ${escapeHtml(label(row.daypart))}</strong><span>${row.available_for_calls?"Calls":""}${row.available_for_calls&&row.available_for_in_person?" + ":""}${row.available_for_in_person?"Caddying":""}</span></article>`).join(""):"<p class=\"cm-muted\">No weekly availability has been saved.</p>"}</div><h3>Calendar Blocks</h3><div class="detail-list">${exceptions.length?exceptions.map(row=>`<article><strong>${escapeHtml(dateOnly(row.starts_on))}${row.ends_on&&row.ends_on!==row.starts_on?` – ${escapeHtml(dateOnly(row.ends_on))}`:""}</strong><span>${row.block_calls?"Calls":""}${row.block_calls&&row.block_in_person?" + ":""}${row.block_in_person?"Caddying":""}${row.note?` · ${escapeHtml(row.note)}`:""}</span></article>`).join(""):"<p class=\"cm-muted\">No calendar blocks.</p>"}</div>`;
}

function renderPlayers(){
  const rows=safeArray(detail.player_requests);
  $("teamPlayersCard").innerHTML=`<p class="cm-eyebrow">PLAYERS + REQUESTS</p><h2>${rows.length} relationship record${rows.length===1?"":"s"}</h2><div class="detail-list">${rows.length?rows.map(row=>`<article><strong>${escapeHtml(row.player_name||row.player_email||"Player")}</strong><span>${escapeHtml(label(row.status))}${row.anticipated_trip_date?` · ${escapeHtml(dateOnly(row.anticipated_trip_date))}`:""}</span></article>`).join(""):"<p class=\"cm-muted\">No Player requests yet.</p>"}</div>`;
}

function renderCalls(){
  const rows=safeArray(detail.consultations);
  $("teamCallsCard").innerHTML=`<p class="cm-eyebrow">CONSULTATIONS</p><h2>${rows.length} call${rows.length===1?"":"s"}</h2><div class="detail-list">${rows.length?rows.map(row=>`<article><strong>${escapeHtml(row.player_name||"Player")}</strong><span>${escapeHtml(dateTime(row.starts_at))} · ${escapeHtml(label(row.status))}</span></article>`).join(""):"<p class=\"cm-muted\">No consultations yet.</p>"}</div>`;
}

function renderMessages(){
  const thread=$("teamMessageThread");
  thread.innerHTML=messages.length?messages.map(message=>{const mine=message.sender_role==="caddie_master";return `<article class="team-message ${mine?"is-master":"is-caddie"}"><span>${mine?"The Caddie Master":escapeHtml(detail.profile?.display_name||"Caddie")}</span><p>${escapeHtml(message.message_body||"")}</p><time>${escapeHtml(dateTime(message.created_at))}</time></article>`;}).join(""):"<p class=\"cm-muted\">No private Caddie Team messages yet.</p>";
  thread.scrollTop=thread.scrollHeight;
}

async function refreshMessages(){messages=await getCaddieTeamMessages(caddieProfileId);renderMessages();}

async function boot(){
  try{
    if(!caddieProfileId)throw new Error("Choose a Caddie from the Caddie Concierge Team directory.");
    if(!(await currentUserHasConciergeAccess()))throw new Error("Only The Caddie Master may open this team profile.");
    [detail,messages]=await Promise.all([getCaddieConciergeProfile(caddieProfileId),getCaddieTeamMessages(caddieProfileId)]);
    $("teamLoadingCard").classList.add("hidden");$("teamProfilePage").classList.remove("hidden");
    renderIdentity();renderSummary();renderCompass();renderAvailability();renderPlayers();renderCalls();renderMessages();
    if(location.hash==="#messages")$("messages")?.scrollIntoView({behavior:"smooth"});
  }catch(error){setStatus(error?.message||"The Caddie Concierge Team profile could not be opened.",true);}
}

$("teamMessageForm")?.addEventListener("submit",async event=>{
  event.preventDefault();const input=$("teamMessageInput");const message=String(input.value||"").trim();const button=event.currentTarget.querySelector("button");
  if(!message)return;button.disabled=true;$("teamMessageStatus").textContent="Sending private message...";
  try{await sendCaddieTeamMessage(caddieProfileId,message);input.value="";await refreshMessages();$("teamMessageStatus").textContent="Private message sent.";}
  catch(error){$("teamMessageStatus").textContent=error?.message||"The message could not be sent.";$("teamMessageStatus").classList.add("error");}
  finally{button.disabled=false;}
});

boot();
