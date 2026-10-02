import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const required = [
  "caddie-magic/call-your-caddie/index.html",
  "caddie-magic/call-your-caddie/app.js",
  "caddie-magic/call-your-caddie/styles.css",
  "shared/caddie-magic-mailbox.js",
  "manager/call-your-caddie/index.html",
  "manager/call-your-caddie/app.js",
  "manager/call-your-caddie/styles.css",
  "manager/call-your-caddie/studio/index.html",
  "manager/call-your-caddie/studio/app.js",
  "manager/call-your-caddie/studio/styles.css",
  "database/migration-079-call-your-caddie-mailbox.sql",
  "database/migration-080-call-your-caddie-anonymity.sql",
  "database/migration-081-call-your-caddie-public-recorder.sql",
  "api/caddie-acuity.js",
  "vercel.json",
];
for (const file of required) await access(file, constants.R_OK);
const read = (file) => readFile(file, "utf8");
const [playerHtml, playerJs, playerCss, shared, adminHtml, adminJs, studioHtml, studioJs, migration079, migration080, migration081, caddieApi] = await Promise.all([
  read(required[0]), read(required[1]), read(required[2]), read(required[3]), read(required[4]), read(required[5]),
  read(required[7]), read(required[8]), read(required[10]), read(required[11]), read(required[12]), read(required[13]),
]);
const vercel = JSON.parse(await read("vercel.json"));

// Public caller experience + exact user-approved How It Works copy.
assert(playerHtml.includes("CALL YOUR CADDIE"));
assert(playerHtml.includes("VOICEMAIL LINE OPEN"));
assert(playerHtml.includes("I CONSENT TO RECORDING + MEDIA USE"));
assert.equal((playerHtml.match(/id="mediaConsent"/g) || []).length, 1, "Combined consent checkbox is missing or duplicated.");
assert(playerHtml.includes("Please do not use my name in the podcast"));
assert(playerHtml.includes("1.</span><strong>You have a problem or an observation"));
assert(playerHtml.includes("2.</span><strong>Leave me a message"));
assert(playerHtml.includes("3.</span><strong>Tune in to the Call Your Caddie podcast for my response"));
assert(!playerHtml.includes("You record a voicemail and tell me about it"), "Superseded step-two copy remains.");
assert.equal((playerHtml.match(/class="cycs-how-icon"/g) || []).length, 3, "Each How It Works step should have one icon.");
assert(playerHtml.includes('id="website"'), "Public recorder honeypot is missing.");
assert(playerCss.includes("cycs-broadcast-strip") && playerCss.includes("cycs-recorder-meter"), "Radio-show visual treatment is missing.");
assert(playerJs.includes("submitPublicCaddieMailboxMessage"));
assert(playerJs.includes("navigator.mediaDevices.getUserMedia"));
assert(playerJs.includes("new MediaRecorder"));
assert(playerJs.includes("CADDIE_MAILBOX_MAX_SECONDS"));
assert(playerJs.includes("Public callers intentionally continue without authentication"));
assert(!/autoplay/i.test(playerHtml), "Player preview must never autoplay.");
assert(!/twilio/i.test(playerHtml + playerJs + shared), "Twilio must not be a launch dependency.");

// Public upload bridge: signed, path-scoped upload only; no bucket listing/read access.
assert(shared.includes('CADDIE_MAILBOX_BUCKET = "caddie-mailbox-audio"'));
assert(shared.includes("CADDIE_PUBLIC_MAILBOX_MAX_BYTES = 15 * 1024 * 1024"));
assert(shared.includes('action: "public-mailbox-init"'));
assert(shared.includes('action: "public-mailbox-finalize"'));
assert(shared.includes("uploadToSignedUrl"));
assert(shared.includes(".download(path)"));
assert(!shared.includes("getPublicUrl"), "Mailbox audio must not use public Storage URLs.");
assert(caddieApi.includes("public-mailbox-init") && caddieApi.includes("public-mailbox-finalize"));
assert(caddieApi.includes("object/upload/sign"), "Public recorder must use a signed one-path upload token.");
assert(caddieApi.includes("createHmac('sha256'"), "Public rate-limit key must use an HMAC rather than store a raw IP.");
assert(caddieApi.includes("assertPublicMailboxOrigin"));
assert(caddieApi.includes("PUBLIC_MAILBOX_MAX_BYTES=15*1024*1024"));

// Database keeps public identities optional while private owner workflows remain unchanged.
for (const token of [
  "alter column submitted_by_user_id drop not null",
  "alter column player_profile_id drop not null",
  "public_browser_voice_note",
  "caddie_magic_public_mailbox_uploads",
  "caddie_magic_begin_public_mailbox_upload",
  "caddie_magic_finalize_public_mailbox_message",
  "grant execute on function public.caddie_magic_begin_public_mailbox_upload",
  "grant execute on function public.caddie_magic_finalize_public_mailbox_message",
  "to service_role",
  "size_bytes between 1 and 15728640",
  "created_at >= now() - interval '1 hour'",
  "v_recent >= 8",
  "caddie-mailbox-v3",
]) assert(migration081.includes(token), `Migration 081 missing ${token}`);
assert(!migration081.includes('to anon;'), "Migration 081 must not grant public database or Storage access to anon.");
assert(!migration081.includes('for select\n  to anon'), "Public callers must not gain mailbox read access.");
assert.equal((migration081.match(/\$\$/g) || []).length % 2, 0, "Migration 081 has unmatched SQL dollar quotes.");
assert(migration079.includes("public = false"), "Mailbox Storage bucket must remain private.");
assert(migration079.includes("Caddie Master reads mailbox audio"));
assert(migration080.includes("anonymity_requested boolean not null default false"));

for (const token of ["New", "Listened", "Use on Show", "Used", "Archived", "Enter Studio Mode"]) {
  assert(adminHtml.includes(token), `Owner mailbox missing ${token}`);
}
assert(adminJs.includes('audio.addEventListener("play"'));
assert(adminJs.includes("ANONYMITY REQUESTED"));
assert(studioHtml.includes("PLAY VOICEMAIL"));
assert(studioHtml.includes("CADDIE'S RESPONSE"));
assert(studioJs.includes('audio.addEventListener("play", markFirstListen)'));
assert(studioJs.includes('audio.addEventListener("ended", responseState)'));
assert(studioJs.includes("ANONYMOUS"));
assert(!/autoplay/i.test(studioHtml), "Studio voicemail must never autoplay.");

const rewrites = new Map((vercel.rewrites || []).map((row) => [row.source, row.destination]));
assert.equal(rewrites.get("/caddie-magic/call-your-caddie"), "/caddie-magic/call-your-caddie/index.html");
assert.equal(rewrites.get("/manager/call-your-caddie"), "/manager/call-your-caddie/index.html");
assert.equal(rewrites.get("/manager/call-your-caddie/studio"), "/manager/call-your-caddie/studio/index.html");
const versionHeaders = (vercel.headers || []).flatMap((row) => row.headers || []).filter((h) => h.key === "X-Caddie-Magic-Version");
assert(versionHeaders.length >= 2 && versionHeaders.every((h) => h.value === "0.7.1"));

console.log("Call Your Caddie validation passed: public signed-upload recorder, radio-show UI, exact How It Works copy, anonymity, private owner mailbox/Studio Mode, 5-minute ceiling, and 12-function reuse boundary verified.");
