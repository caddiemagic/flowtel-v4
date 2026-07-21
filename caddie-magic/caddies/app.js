// Caddie Magic v0.5.0 — player Caddie directory, request, and accepted-only consultation scheduling.

import { requireCaddieMagicAccess } from "../../shared/caddie-magic-access.js?v=0.5.0";
import {
  listAvailableCaddies,
  requestCaddie,
  listMyCaddieRequests,
  cancelMyCaddieRequest,
  listAcceptedCaddieAvailability,
  bookConsultation,
  listMyConsultations,
  cancelConsultation,
} from "../../shared/caddie-magic-network.js?v=0.5.0";

const $ = (id) => document.getElementById(id);
let caddies = [];
let requests = [];
let consultations = [];
let availability = [];

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function setMessage(node, text = "", error = false) { if (node) { node.textContent = text; node.classList.toggle("error", error); } }
function formatDate(value) { if (!value) return "—"; const d = new Date(`${String(value).slice(0,10)}T12:00:00`); return new Intl.DateTimeFormat("en-US", { month:"short", day:"numeric", year:"numeric" }).format(d); }
function formatDateTime(value) { if (!value) return "—"; return new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(value)); }
function initials(name="") { return String(name).split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("") || "CM"; }
function activeRequest() { return requests.find((item)=>["requested","accepted"].includes(item.status)) || null; }
function scheduledConsultationForRequest(requestId) { return consultations.find((item)=>String(item.request_id)===String(requestId) && item.status==="scheduled") || null; }
function statusLabel(status="") { return ({requested:"Awaiting Caddie",accepted:"Accepted",declined:"Declined",cancelled:"Cancelled",ended:"Ended"})[status] || status; }

function caddieCard(caddie) {
  const request = activeRequest();
  const disabled = Boolean(request);
  const meta = [
    caddie.city,
    caddie.years_experience != null ? `${caddie.years_experience} years` : "",
    caddie.consultation_duration_minutes ? `${caddie.consultation_duration_minutes}-minute consultation` : "",
  ].filter(Boolean);
  return `<article class="caddie-network-card">
    ${caddie.profile_photo_url ? `<img class="caddie-network-avatar" src="${escapeHtml(caddie.profile_photo_url)}" alt="${escapeHtml(caddie.display_name)}" />` : `<div class="caddie-network-avatar placeholder" aria-hidden="true">${escapeHtml(initials(caddie.display_name))}</div>`}
    <div>
      <h3>${escapeHtml(caddie.display_name || "Caddie")}</h3>
      <p class="caddie-title">${escapeHtml(caddie.professional_title || "Caddie Magic Caddie")}</p>
      ${caddie.philosophy ? `<p>${escapeHtml(caddie.philosophy)}</p>` : ""}
      ${caddie.pebble_beach_experience ? `<p><strong>Pebble Beach:</strong> ${escapeHtml(caddie.pebble_beach_experience)}</p>` : ""}
      ${caddie.courses_served ? `<p><strong>Courses:</strong> ${escapeHtml(caddie.courses_served)}</p>` : ""}
      <div class="caddie-network-meta">${meta.map((item)=>`<span>${escapeHtml(item)}</span>`).join("")}</div>
      <button class="cm-button" type="button" data-request-caddie="${escapeHtml(caddie.caddie_profile_id)}" ${disabled ? "disabled" : ""}>${disabled ? "Request Already Open" : "Request This Caddie"}</button>
    </div>
  </article>`;
}

function renderDirectory() {
  $("caddieCardGrid").innerHTML = caddies.length
    ? caddies.map(caddieCard).join("")
    : `<div class="directory-empty">No Caddies are accepting player requests right now. Your Player Profile and score history remain available while the network grows.</div>`;
  document.querySelectorAll("[data-request-caddie]").forEach((button)=>button.addEventListener("click",()=>openRequestDialog(button.dataset.requestCaddie)));
}

function consentLabels(request) {
  return [request.share_scorecard && "Scorecard",request.share_score_map && "Score Map",request.share_compass && "Compass",request.share_upcoming_golf && "Calendar"].filter(Boolean);
}

function renderRequestStatus() {
  const request = activeRequest() || requests[0] || null;
  const body = $("requestStatusBody");
  const pill = $("requestStatusPill");
  if (!request) {
    $("requestStatusTitle").textContent = "No active request.";
    $("requestStatusCopy").textContent = "Choose one active Caddie below. Consultation times remain private until that Caddie accepts.";
    pill.textContent = "OPEN"; pill.className = "directory-status";
    body.innerHTML = "";
    $("availabilityCard").classList.add("hidden");
    return;
  }
  $("requestStatusTitle").textContent = request.caddie_name || "Your requested Caddie";
  const scheduled = scheduledConsultationForRequest(request.request_id);
  $("requestStatusCopy").textContent = request.status === "accepted"
    ? scheduled
      ? "Your consultation is scheduled. The private availability list will reopen if the meeting is cancelled."
      : "Your request is accepted. Choose from the private consultation times below."
    : request.status === "requested"
      ? "Your Caddie is reviewing the request. Availability remains private until acceptance."
      : `This request is ${statusLabel(request.status).toLowerCase()}.`;
  pill.textContent = statusLabel(request.status);
  pill.className = `directory-status is-${request.status}`;
  const shared = consentLabels(request);
  body.innerHTML = `<article class="request-summary"><div>
      <h3>${escapeHtml(request.professional_title || "Caddie Magic Caddie")}</h3>
      <p>${request.anticipated_trip_date ? `Trip date ${escapeHtml(formatDate(request.anticipated_trip_date))}. ` : ""}${escapeHtml(request.consultation_goal || "Consultation request submitted.")}</p>
      <div class="request-consent-summary">${shared.length ? shared.map((item)=>`<span>${escapeHtml(item)} shared</span>`).join("") : "<span>Profile only</span>"}</div>
    </div>
    ${["requested","accepted"].includes(request.status) ? `<button class="cm-button secondary" type="button" data-cancel-request="${escapeHtml(request.request_id)}">${request.status === "accepted" ? "End Request" : "Cancel Request"}</button>` : ""}
  </article>`;
  body.querySelector("[data-cancel-request]")?.addEventListener("click", async (event)=>{
    const verb = request.status === "accepted" ? "end this Caddie relationship" : "cancel this request";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    event.currentTarget.disabled = true;
    try { await cancelMyCaddieRequest(request.request_id); await reload(); }
    catch (error) { setMessage($("directoryMessage"), error?.message || "The request could not be changed.", true); event.currentTarget.disabled = false; }
  });
  $("availabilityCard").classList.toggle("hidden", request.status !== "accepted" || Boolean(scheduled));
}

function renderAvailability() {
  const request = activeRequest();
  if (!request || request.status !== "accepted" || scheduledConsultationForRequest(request.request_id)) { $("availabilityGrid").innerHTML = ""; return; }
  $("availabilityGrid").innerHTML = availability.length
    ? availability.map((slot)=>`<article class="availability-slot"><strong>${escapeHtml(formatDateTime(slot.starts_at))}</strong><span>Ends ${escapeHtml(formatDateTime(slot.ends_at))}</span><button class="cm-button" type="button" data-book-slot="${escapeHtml(slot.slot_id)}">Schedule Consultation</button></article>`).join("")
    : `<div class="directory-empty">Your Caddie has not posted an open consultation time yet.</div>`;
  document.querySelectorAll("[data-book-slot]").forEach((button)=>button.addEventListener("click",async()=>{
    if (!window.confirm("Schedule this consultation time?")) return;
    button.disabled = true; setMessage($("availabilityMessage"), "Reserving your consultation...");
    try { await bookConsultation(request.request_id, button.dataset.bookSlot); setMessage($("availabilityMessage"), "Consultation scheduled."); await reload(); }
    catch (error) { setMessage($("availabilityMessage"), error?.message || "That time could not be scheduled.", true); button.disabled = false; }
  }));
}

function renderConsultations() {
  $("consultationList").innerHTML = consultations.length
    ? consultations.map((item)=>`<article class="consultation-row"><div><h3>${escapeHtml(item.caddie_name || "Caddie Consultation")}</h3><p>${escapeHtml(formatDateTime(item.starts_at))} · ${escapeHtml(item.consultation_method || "Consultation details will be confirmed")}</p><p>Status: ${escapeHtml(item.status)}</p></div><div>${item.status === "scheduled" && item.meeting_link ? `<a class="cm-button" href="${escapeHtml(item.meeting_link)}" target="_blank" rel="noopener">Open Meeting</a>` : ""}${item.status === "scheduled" ? `<button class="cm-button secondary" type="button" data-cancel-consultation="${escapeHtml(item.consultation_id)}">Cancel</button>` : ""}</div></article>`).join("")
    : `<div class="directory-empty">No consultations have been scheduled yet.</div>`;
  document.querySelectorAll("[data-cancel-consultation]").forEach((button)=>button.addEventListener("click",async()=>{
    if (!window.confirm("Cancel this consultation? The time will return to the Caddie’s availability.")) return;
    button.disabled = true;
    try { await cancelConsultation(button.dataset.cancelConsultation); await reload(); }
    catch (error) { setMessage($("directoryMessage"), error?.message || "The consultation could not be cancelled.", true); button.disabled = false; }
  }));
}

function openRequestDialog(caddieId) {
  const caddie = caddies.find((item)=>String(item.caddie_profile_id)===String(caddieId));
  if (!caddie) return;
  $("requestCaddieProfileId").value = caddieId;
  $("requestDialogTitle").textContent = `Request ${caddie.display_name}`;
  $("requestDialog").showModal();
}
function closeRequestDialog() { $("requestDialog")?.close(); setMessage($("requestFormMessage"), ""); }

async function submitRequest(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true; setMessage($("requestFormMessage"), "Sending your Caddie request...");
  const pebble = $("requestPlayedPebble").value;
  try {
    await requestCaddie($("requestCaddieProfileId").value, {
      anticipatedTripDate: $("requestTripDate").value || null,
      courseItinerary: $("requestItinerary").value,
      consultationGoal: $("requestGoal").value,
      playedPebbleBefore: pebble === "" ? null : pebble === "yes",
      shareScorecard: $("shareScorecard").checked,
      shareScoreMap: $("shareScoreMap").checked,
      shareCompass: $("shareCompass").checked,
      shareUpcomingGolf: $("shareUpcomingGolf").checked,
    });
    closeRequestDialog(); event.currentTarget.reset();
    ["shareScorecard","shareScoreMap","shareCompass","shareUpcomingGolf"].forEach((id)=>{ $(id).checked = true; });
    await reload();
  } catch (error) { setMessage($("requestFormMessage"), error?.message || "The Caddie request could not be sent.", true); }
  finally { button.disabled = false; }
}

async function reload() {
  [caddies, requests, consultations] = await Promise.all([listAvailableCaddies(), listMyCaddieRequests(), listMyConsultations()]);
  const request = activeRequest();
  availability = request?.status === "accepted" ? await listAcceptedCaddieAvailability(request.request_id) : [];
  renderRequestStatus(); renderAvailability(); renderConsultations(); renderDirectory();
}

async function boot() {
  try {
    await requireCaddieMagicAccess();
    await reload();
    $("directoryLoadingCard").classList.add("hidden"); $("directoryPage").classList.remove("hidden");
  } catch (error) { setMessage($("directoryMessage"), error?.message || "The Caddie Network could not be opened.", true); }
}

$("requestDialogClose")?.addEventListener("click", closeRequestDialog);
$("requestDialog")?.addEventListener("click", (event)=>{ if (event.target === $("requestDialog")) closeRequestDialog(); });
$("requestForm")?.addEventListener("submit", submitRequest);
boot();
