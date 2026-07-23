import { currentUserHasConciergeAccess } from "../../shared/flowtel.js?v=0.10.75";
import { getPriestessConciergeProfile, setPriestessAcceptingClients, setPriestessFlowFmStartDate } from "../../shared/priestess-concierge-team.js?v=0.10.75";
import { reviewPriestessProfile } from "../../shared/priestess-profiles.js?v=0.10.75";
import { flowtelTodayISO, formatDateOnly } from "../../shared/flowtel-date.js?v=0.10.75";

const $ = id => document.getElementById(id);
const memberId = new URLSearchParams(location.search).get("member") || "";
let detail = null;

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}
function label(value = "") {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
function dateLabel(value) {
  if (!value) return "Not recorded";
  return formatDateOnly(value, { month: "short", day: "numeric", year: "numeric" });
}
function safeImage(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "/assets/flowtel-pinkrose.png";
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw, location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "/assets/flowtel-pinkrose.png";
  } catch (error) {
    return "/assets/flowtel-pinkrose.png";
  }
}
function setStatus(text, isError = false) {
  $("teamMessage").textContent = text;
  $("teamMessage").classList.toggle("error", isError);
}
function member() { return detail?.member || {}; }
function profile() { return detail?.priestess_profile || null; }
function clients() { return Array.isArray(detail?.clients) ? detail.clients : []; }

function renderIdentity() {
  const row = member();
  const pp = profile();
  $("teamIdentityCard").innerHTML = `
    <div class="priestess-team-identity">
      <img src="${escapeHtml(safeImage(pp?.profile_photo_url))}" alt="${escapeHtml(row.display_name || "Flow FM member")}" onerror="this.onerror=null;this.src='/assets/flowtel-pinkrose.png'" />
      <div>
        <p class="eyebrow">${escapeHtml(label(pp?.status || "profile_not_started"))}</p>
        <h2>${escapeHtml(row.display_name || "Flow FM Member")}</h2>
        <p class="priestess-team-title">${escapeHtml(pp?.priestess_title || row.mentor_title || "Flow FM Member")}</p>
        <p>${escapeHtml([row.location, row.timezone].filter(Boolean).join(" · ") || "Location and timezone not confirmed")}</p>
      </div>
      <div class="priestess-team-private">
        <span>PRIVATE OWNER DETAILS</span>
        <strong>${escapeHtml([row.first_name, row.last_name].filter(Boolean).join(" ") || "Legal name incomplete")}</strong>
        <a href="mailto:${escapeHtml(row.email || "")}">${escapeHtml(row.email || "Email not found")}</a>
        <small>${escapeHtml(row.hemisphere ? label(row.hemisphere) + " Hemisphere" : "Hemisphere not selected")}</small>
      </div>
    </div>`;
}

function renderSummary() {
  const row = member();
  const pp = profile();
  const connected = clients().filter(item => item.status === "connected").length;
  const requested = clients().filter(item => item.status === "requested").length;
  $("teamSummaryGrid").innerHTML = `
    <article><span>Membership</span><strong>${escapeHtml(label(row.membership_type || "flowfm"))}</strong><small>Flow FM pathway</small></article>
    <article><span>Priestess Profile</span><strong>${escapeHtml(label(pp?.status || "not_started"))}</strong><small>${pp?.updated_at ? `Updated ${escapeHtml(dateLabel(pp.updated_at))}` : "Profile Studio not started"}</small></article>
    <article><span>Clients</span><strong>${connected}</strong><small>${requested} pending request${requested === 1 ? "" : "s"}</small></article>
    <article><span>Mentor Availability</span><strong>${row.mentor_accepting_clients ? "Open" : "Closed"}</strong><small>${row.mentor_accepting_clients ? "Accepting clients" : "Not accepting clients"}</small></article>`;
}

function renderProfile() {
  const row = member();
  const pp = profile();
  if (!pp) {
    $("profileCard").innerHTML = `<p class="eyebrow">PRIESTESS PROFILE</p><h2>Profile Studio not started.</h2><p>This Flow FM member is included in the team directory even before she begins her Priestess Profile.</p><a class="priestess-team-button" href="/flow-fm/profile-studio/?member=${encodeURIComponent(row.member_id)}">Open Profile Studio View</a>`;
    return;
  }
  const reviewActions = pp.status === "submitted" ? `<div class="profile-review-actions"><button type="button" data-review-status="approved">Approve Profile</button><button type="button" class="quiet" data-review-status="needs_revision">Request Revision</button></div>` : "";
  $("profileCard").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">PRIESTESS PROFILE</p><h2>${escapeHtml(pp.priestess_title || "Flow FM Priestess")}</h2></div><span class="status-pill">${escapeHtml(label(pp.status))}</span></div>
    <div class="profile-copy"><h3>About</h3><p>${escapeHtml(pp.bio || "No biography has been saved yet.")}</p></div>
    <div class="profile-detail-grid"><div><span>Offerings</span><strong>${escapeHtml(pp.offerings || "Not set")}</strong></div><div><span>Who She Serves</span><strong>${escapeHtml(pp.who_she_serves || "Not set")}</strong></div><div><span>Session Types</span><strong>${escapeHtml(pp.session_types || "Not set")}</strong></div><div><span>Network Interest</span><strong>${pp.network_opt_in ? "Yes" : "Not selected"}</strong></div></div>
    <div class="profile-links"><a class="priestess-team-button" href="/flow-fm/profile-studio/?member=${encodeURIComponent(row.member_id)}">Open Full Priestess Profile</a>${pp.website_url ? `<a class="priestess-team-button quiet" href="${escapeHtml(pp.website_url)}" target="_blank" rel="noreferrer">External Website</a>` : ""}</div>
    ${reviewActions}
    <p class="priestess-team-note" id="profileReviewMessage"></p>`;

  $("profileCard").querySelectorAll("[data-review-status]").forEach(button => button.addEventListener("click", async () => {
    const status = button.dataset.reviewStatus;
    const note = window.prompt(status === "approved" ? "Optional private approval note:" : "What refinement would you like her to tend?", "");
    if (note === null) return;
    button.disabled = true;
    try {
      await reviewPriestessProfile({ profileId: pp.id, status, adminNote: note, mentorNote: "" });
      detail = await getPriestessConciergeProfile(memberId);
      renderAll();
    } catch (error) {
      $("profileReviewMessage").textContent = error?.message || "The Priestess Profile review could not be saved.";
      button.disabled = false;
    }
  }));
}

function renderMentorSettings() {
  const row = member();
  $("mentorCard").innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">MENTOR + PRACTITIONER SETTINGS</p><h2>${row.mentor_accepting_clients ? "Accepting Clients" : "Not Accepting Clients"}</h2></div><button id="toggleAcceptingButton" type="button" class="priestess-team-button ${row.mentor_accepting_clients ? "quiet" : ""}">${row.mentor_accepting_clients ? "Pause New Clients" : "Open to New Clients"}</button></div>
    <div class="profile-detail-grid"><div><span>Flowtel Role</span><strong>${escapeHtml(label(row.role || "member"))}</strong></div><div><span>Client Data Scope</span><strong>${escapeHtml(detail.cycle_data_scope || "Connected clients only")}</strong></div><div><span>Flow FM Start</span><strong>${escapeHtml(dateLabel(row.flowfm_started_at))}</strong></div><div><span>Access Status</span><strong>${escapeHtml(label(row.flowtel_access_status || "active"))}</strong></div></div>
    <form class="flowfm-start-date-form" id="flowFmStartDateForm"><label><span>Flow FM Start Date</span><input name="started_at" type="date" max="${flowtelTodayISO()}" value="${escapeHtml(String(row.flowfm_started_at||"").slice(0,10))}" required /></label><button type="submit" class="priestess-team-button">Save Start Date</button></form>
    <p class="priestess-team-note" id="mentorSettingMessage"></p>`;
  $("flowFmStartDateForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      await setPriestessFlowFmStartDate(memberId, new FormData(form).get("started_at"));
      detail = await getPriestessConciergeProfile(memberId);
      renderMentorSettings();
    } catch (error) {
      $("mentorSettingMessage").textContent = error?.message || "The Flow FM start date could not be saved.";
      button.disabled = false;
    }
  });
  $("toggleAcceptingButton")?.addEventListener("click", async () => {
    const button = $("toggleAcceptingButton");
    button.disabled = true;
    try {
      await setPriestessAcceptingClients(memberId, !row.mentor_accepting_clients);
      detail = await getPriestessConciergeProfile(memberId);
      renderSummary();
      renderMentorSettings();
    } catch (error) {
      $("mentorSettingMessage").textContent = error?.message || "Mentor availability could not be updated.";
      button.disabled = false;
    }
  });
}

function renderClients() {
  const rows = clients();
  $("clientsCard").innerHTML = `<p class="eyebrow">CLIENTS + MENTEES</p><h2>${rows.length} relationship record${rows.length === 1 ? "" : "s"}</h2><div class="priestess-client-list">${rows.length ? rows.map(row => `<article><div><strong>${escapeHtml(row.display_name || row.email || "Flowtel Guest")}</strong><span>${escapeHtml(label(row.status))}${row.consent_granted ? " · Consent active" : " · Consent pending"}</span></div>${row.status === "connected" && row.consent_granted ? `<a href="/cycle-data/?client=${encodeURIComponent(row.client_id)}">Open Client Snapshot</a>` : ""}</article>`).join("") : `<p>No mentor relationships yet.</p>`}</div>`;
}

function renderCalls() {
  $("callsCard").innerHTML = `<p class="eyebrow">UPCOMING CALLS</p><h2>Calendar connection coming soon.</h2><p>${escapeHtml(detail.upcoming_calls_note || "Calendar connection coming soon.")}</p><p class="priestess-team-note">The shared scheduling foundation is preserved. This directory will show real practitioner calls after the later Acuity integration is connected.</p>`;
}

function renderAll() {
  renderIdentity();
  renderSummary();
  renderProfile();
  renderMentorSettings();
  renderClients();
  renderCalls();
}

async function boot() {
  try {
    if (!memberId) throw new Error("Choose a woman from the Priestess Concierge Team directory.");
    if (!(await currentUserHasConciergeAccess())) throw new Error("Only the Flowtel owner may open this team profile.");
    detail = await getPriestessConciergeProfile(memberId);
    if (!detail) throw new Error("This Flow FM member could not be found.");
    $("teamLoadingCard").classList.add("hidden");
    $("teamProfilePage").classList.remove("hidden");
    renderAll();
  } catch (error) {
    setStatus(error?.message || "The Priestess Concierge Team profile could not be opened.", true);
  }
}

boot();
