import {
  downloadCaddieMailboxAudio,
  formatMailboxDuration,
  listCaddieMailboxMessages,
  markCaddieMailboxListened,
  requireCaddieMailboxOwner,
  updateCaddieMailboxMessage,
} from "../../shared/caddie-magic-mailbox.js?v=0.7.0";

const $ = (id) => document.getElementById(id);
const listNode = $("mailboxList");
const statusNode = $("mailboxStatus");
let messages = [];
let activeFilter = "new";
const audioUrls = new Map();

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles", timeZoneName: "short" }).format(new Date(value));
}
function labelStatus(status = "") {
  return ({ new: "NEW", listened: "LISTENED", selected: "USE ON SHOW", used: "USED", archived: "ARCHIVED" })[status] || String(status).toUpperCase();
}
function setStatus(text = "", error = false) {
  statusNode.textContent = text;
  statusNode.classList.toggle("error", Boolean(error));
}
function statusButton(message, status, label, cls = "secondary") {
  if (message.status === status) return "";
  return `<button class="cm-button ${cls}" type="button" data-set-status="${status}" data-message-id="${message.message_id}">${label}</button>`;
}

function filteredMessages() {
  if (activeFilter === "all") return messages;
  return messages.filter((message) => message.status === activeFilter);
}

function renderCounts() {
  const counts = Object.fromEntries(["new", "listened", "selected", "used", "archived"].map((status) => [status, messages.filter((m) => m.status === status).length]));
  const unheard = messages.filter((m) => !m.first_listened_at && !["used", "archived"].includes(m.status)).length;
  $("summaryTitle").textContent = unheard ? `${unheard} unheard message${unheard === 1 ? "" : "s"}.` : "The mailbox is caught up.";
  $("mailboxCounts").innerHTML = `
    <article><span>UNHEARD</span><strong>${unheard}</strong></article>
    <article><span>SHOW QUEUE</span><strong>${counts.selected}</strong></article>
    <article><span>USED</span><strong>${counts.used}</strong></article>`;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const count = button.dataset.filter === "all" ? messages.length : counts[button.dataset.filter] || 0;
    button.innerHTML = `${button.textContent.split(" · ")[0]} <span>· ${count}</span>`;
  });
}

function messageCard(message) {
  const unheard = !message.first_listened_at;
  const badge = unheard && !["used", "archived"].includes(message.status) ? `${labelStatus(message.status)} · UNHEARD` : labelStatus(message.status);
  return `<article class="mailbox-message ${unheard ? "is-unheard" : ""}" data-card-id="${message.message_id}">
    <div class="mailbox-message-top">
      <div><span class="mailbox-badge">${escapeHtml(badge)}</span><h3>${escapeHtml(message.caller_name)}</h3><p>HCP ${escapeHtml(message.handicap)}</p></div>
      <div class="mailbox-meta"><strong>${formatMailboxDuration(message.recording_duration_seconds)}</strong><time>${escapeHtml(formatDate(message.received_at))}</time></div>
    </div>
    <div class="mailbox-consent">✓ Recording + publication consent · ${escapeHtml(formatDate(message.consented_at))}</div>
    <div class="mailbox-audio" data-audio-wrap="${message.message_id}">
      <button class="cm-button" type="button" data-play="${message.message_id}">▶ Play Voicemail</button>
    </div>
    <div class="mailbox-edit-grid">
      <label>Caller Name<input type="text" maxlength="60" data-name="${message.message_id}" value="${escapeHtml(message.caller_name)}"></label>
      <label>Notes<textarea rows="3" maxlength="5000" data-notes="${message.message_id}" placeholder="Private Caddie Master notes…">${escapeHtml(message.admin_notes || "")}</textarea></label>
    </div>
    <div class="mailbox-actions">
      <button class="cm-button secondary" type="button" data-save="${message.message_id}">Save Details</button>
      ${statusButton(message, "selected", "Use on Show", "")}
      ${message.status === "selected" ? `<a class="cm-button" href="/manager/call-your-caddie/studio/?message=${message.message_id}">Open in Studio</a>` : ""}
      ${statusButton(message, "used", "Mark Used")}
      ${statusButton(message, "archived", "Archive", "ghost")}
    </div>
  </article>`;
}

function render() {
  renderCounts();
  const rows = filteredMessages();
  listNode.innerHTML = rows.length ? rows.map(messageCard).join("") : `<div class="mailbox-empty">No ${activeFilter === "all" ? "" : escapeHtml(activeFilter) + " "}messages here.</div>`;
  bindCardActions();
}

async function ensureAudio(messageId, { autoplay = false } = {}) {
  const message = messages.find((row) => row.message_id === messageId);
  const wrap = document.querySelector(`[data-audio-wrap="${messageId}"]`);
  if (!message || !wrap) return;
  let url = audioUrls.get(messageId);
  if (!url) {
    wrap.innerHTML = `<span class="mailbox-loading-audio">Loading private audio…</span>`;
    const blob = await downloadCaddieMailboxAudio(message);
    url = URL.createObjectURL(blob);
    audioUrls.set(messageId, url);
  }
  wrap.innerHTML = `<audio controls preload="metadata" data-audio="${messageId}" src="${url}"></audio>`;
  const audio = wrap.querySelector("audio");
  let marked = Boolean(message.first_listened_at);
  audio.addEventListener("play", async () => {
    if (marked) return;
    marked = true;
    try {
      await markCaddieMailboxListened(messageId);
      message.first_listened_at = new Date().toISOString();
      if (message.status === "new") message.status = "listened";
      renderCounts();
    } catch (error) {
      marked = false;
      setStatus(error?.message || "The first-listen state could not be saved.", true);
    }
  });
  if (autoplay) {
    try { await audio.play(); } catch (_) { setStatus("Audio is ready. Press play in the player to begin."); }
  }
}

async function saveMessage(messageId, nextStatus = null) {
  const message = messages.find((row) => row.message_id === messageId);
  if (!message) return;
  const name = document.querySelector(`[data-name="${messageId}"]`)?.value ?? message.caller_name;
  const notes = document.querySelector(`[data-notes="${messageId}"]`)?.value ?? message.admin_notes ?? "";
  const status = nextStatus || message.status;
  await updateCaddieMailboxMessage(messageId, { status, callerName: name, adminNotes: notes });
  message.caller_name = String(name).trim();
  message.admin_notes = String(notes).trim() || null;
  message.status = status;
  if (status === "selected" && !message.selected_at) message.selected_at = new Date().toISOString();
  if (status === "used" && !message.used_at) message.used_at = new Date().toISOString();
  if (status === "archived" && !message.archived_at) message.archived_at = new Date().toISOString();
}

function bindCardActions() {
  document.querySelectorAll("[data-play]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try { await ensureAudio(button.dataset.play, { autoplay: true }); }
    catch (error) { setStatus(error?.message || "The voicemail could not be opened.", true); button.disabled = false; }
  }));
  document.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try { await saveMessage(button.dataset.save); setStatus("Mailbox details saved."); }
    catch (error) { setStatus(error?.message || "Mailbox details could not be saved.", true); }
    finally { button.disabled = false; }
  }));
  document.querySelectorAll("[data-set-status]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await saveMessage(button.dataset.messageId, button.dataset.setStatus);
      setStatus(button.dataset.setStatus === "selected" ? "Added to the Show Queue." : `Message marked ${button.dataset.setStatus}.`);
      render();
    } catch (error) { setStatus(error?.message || "The mailbox state could not be updated.", true); button.disabled = false; }
  }));
}

async function boot() {
  try {
    await requireCaddieMailboxOwner();
    messages = await listCaddieMailboxMessages();
    $("mailboxDesk").classList.remove("hidden");
    render();
  } catch (error) {
    $("summaryTitle").textContent = "Caddie Mailbox unavailable.";
    setStatus(error?.message || "The Caddie Mailbox could not be opened.", true);
  }
}

$("mailboxTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((node) => node.classList.toggle("is-active", node === button));
  render();
});
window.addEventListener("pagehide", () => audioUrls.forEach((url) => URL.revokeObjectURL(url)));
boot();
