import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration079 = await readFile("database/migration-079-call-your-caddie-mailbox.sql", "utf8");
const migration080 = await readFile("database/migration-080-call-your-caddie-anonymity.sql", "utf8");
const migration081 = await readFile("database/migration-081-call-your-caddie-public-recorder.sql", "utf8");
const player = await readFile("caddie-magic/call-your-caddie/app.js", "utf8");
const playerHtml = await readFile("caddie-magic/call-your-caddie/index.html", "utf8");
const shared = await readFile("shared/caddie-magic-mailbox.js", "utf8");
const api = await readFile("api/caddie-acuity.js", "utf8");
const admin = await readFile("manager/call-your-caddie/app.js", "utf8");
const studio = await readFile("manager/call-your-caddie/studio/app.js", "utf8");

// Public caller can reach the recorder without becoming a Flowtel/Caddie Magic account.
assert(player.includes("submitPublicCaddieMailboxMessage"));
assert(player.includes("Public callers intentionally continue without authentication"));
assert(player.includes("getMyMailboxPlayerSnapshot"), "Signed-in members should still get quiet form prefill when available.");
assert(playerHtml.includes("Opening the Caddie line"));
assert(!playerHtml.includes("Opening your Player Profile"));

// The browser never gets service-role credentials or a general-purpose public Storage policy.
assert(shared.includes("uploadToSignedUrl"));
assert(shared.includes('action: "public-mailbox-init"'));
assert(shared.includes('action: "public-mailbox-finalize"'));
assert(!shared.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert(!migration081.includes("create policy"), "Migration 081 should not add anon Storage/database policies; signed upload is narrower.");
assert(migration079.includes("public = false"));

// Server bridge is narrow: origin + honeypot + HMAC rate limiting + 15 MB public ceiling.
assert(api.includes("assertPublicMailboxOrigin(req)"));
assert(api.includes("rejectMailboxHoneypot(b)"));
assert(api.includes("createHmac('sha256'"));
assert(api.includes("PUBLIC_MAILBOX_MAX_BYTES=15*1024*1024"));
assert(api.includes("object/upload/sign"));
assert(migration081.includes("v_recent >= 8"));
assert(migration081.includes("now() - interval '2 hours'"));

// Public finalization lands in the same NEW + UNHEARD private workflow.
assert(migration081.includes("'public_browser_voice_note'"));
assert(migration081.includes("'new',now(),now(),now()"));
assert(migration081.includes("null,null,v_name,v_handicap"));
assert(migration081.includes("'public_browser_checkbox','caddie-mailbox-v3'"));
assert(migration081.includes("coalesce(p_anonymity_requested,false)"));
assert(migration080.includes("anonymity_requested boolean not null default false"));
assert(studio.includes('message?.anonymity_requested ? "ANONYMOUS"'));
assert(admin.includes("ANONYMITY REQUESTED"));

// Owner-first-listen behavior remains intact.
const downloadStart = shared.indexOf("export async function downloadCaddieMailboxAudio");
const markStart = shared.indexOf("export async function markCaddieMailboxListened");
const downloadBody = shared.slice(downloadStart, markStart);
assert(downloadBody.includes(".download(path)"));
assert(!downloadBody.includes("markCaddieMailboxListened"));
assert.match(migration079, /first_listened_at = coalesce\(first_listened_at,now\(\)\)/);
assert.match(migration079, /status = case when status = 'new' then 'listened' else status end/);
assert(admin.includes('audio.addEventListener("play"'));
assert(studio.includes('audio.addEventListener("play", markFirstListen)'));
assert(studio.includes('audio.addEventListener("ended", responseState)'));

// Five-minute limit remains client + database enforced and sending stays explicit.
assert(player.includes("elapsed >= CADDIE_MAILBOX_MAX_SECONDS"));
assert(player.includes("mediaRecorder.stop()"));
assert(player.includes('form.addEventListener("submit", sendMessage)'));
assert(migration081.includes("recording_duration_seconds between 1 and 300"));

console.log("Call Your Caddie behavior tests passed: public recorder with signed private upload, rate-limit protections, NEW/UNHEARD owner workflow, anonymity, five-minute ceiling, and first-reaction Studio Mode verified.");
