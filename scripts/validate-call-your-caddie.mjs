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
  "docs/RELEASE-0.10.92.md",
  "docs/RELEASE-CADDIE-MAGIC-0.7.0.md",
  "vercel.json",
];
for (const file of required) await access(file, constants.R_OK);
const read = (file) => readFile(file, "utf8");
const playerHtml = await read(required[0]);
const playerJs = await read(required[1]);
const shared = await read(required[3]);
const adminHtml = await read(required[4]);
const adminJs = await read(required[5]);
const studioHtml = await read(required[7]);
const studioJs = await read(required[8]);
const migration = await read(required[10]);
const migration080 = await read("database/migration-080-call-your-caddie-anonymity.sql");
const vercel = JSON.parse(await read("vercel.json"));

assert(playerHtml.includes("CALL YOUR CADDIE"));
assert(playerHtml.includes("I CONSENT TO RECORDING + MEDIA USE"));
assert.equal((playerHtml.match(/id="mediaConsent"/g) || []).length, 1, "Combined consent checkbox is missing or duplicated.");
assert(!playerHtml.includes("recordingConsent") && !playerHtml.includes("publicationConsent"), "Legacy split consent controls remain.");
assert(playerHtml.includes("Please do not use my name in the podcast"));
assert(playerHtml.includes("HOW IT WORKS"));
assert(playerHtml.includes("You have a problem or an observation"));
assert(playerHtml.includes("You record a voicemail and tell me about it"));
assert(playerHtml.includes("Tune in to the Call Your Caddie podcast for my response"));
assert(!playerHtml.includes("Got a golf problem?"));
assert(!playerHtml.includes("Leave it with your Caddie."));
assert(playerHtml.includes("SEND TO MY CADDIE") || playerHtml.includes("Send to My Caddie"));
assert(playerJs.includes("navigator.mediaDevices.getUserMedia"));
assert(playerJs.includes("new MediaRecorder"));
assert(playerJs.includes("CADDIE_MAILBOX_MAX_SECONDS"));
assert(playerJs.includes("submitCaddieMailboxMessage"));
assert(!/autoplay/i.test(playerHtml), "Player preview must never autoplay.");
assert(!/twilio/i.test(playerHtml + playerJs + shared), "Twilio must not be a Phase 1 dependency.");
assert(playerJs.includes("anonymityRequested.checked"));
assert(shared.includes("p_anonymity_requested"));

assert(shared.includes('CADDIE_MAILBOX_BUCKET = "caddie-mailbox-audio"'));
assert(shared.includes("CADDIE_MAILBOX_MAX_SECONDS = 300"));
assert(shared.includes(".upload(storagePath, audioBlob"));
assert(shared.includes(".download(path)"));
assert(!shared.includes("getPublicUrl"), "Mailbox audio must not use public Storage URLs.");

for (const token of ["New", "Listened", "Use on Show", "Used", "Archived", "Enter Studio Mode"]) {
  assert(adminHtml.includes(token), `Owner mailbox missing ${token}`);
}
assert(adminJs.includes('audio.addEventListener("play"'), "First-listen state must be bound to real playback.");
assert(adminJs.includes("markCaddieMailboxListened"));
assert(adminJs.includes("downloadCaddieMailboxAudio"));

assert(studioHtml.includes("PLAY VOICEMAIL"));
assert(studioHtml.includes("CADDIE'S RESPONSE"));
assert(studioJs.includes("downloadCaddieMailboxAudio"));
assert(studioJs.includes('audio.addEventListener("play", markFirstListen)'));
assert(studioJs.includes('audio.addEventListener("ended", responseState)'));
assert(!/autoplay/i.test(studioHtml), "Studio voicemail must never autoplay.");
assert(studioJs.includes("anonymity_requested"));
assert(studioJs.includes("ANONYMOUS"));
assert(adminJs.includes("ANONYMITY REQUESTED"));

for (const token of [
  "caddie_magic_mailbox_messages",
  "caddie-mailbox-audio",
  "public = false",
  "browser_voice_note",
  "recording_duration_seconds between 1 and 300",
  "consent_recording and consent_publication",
  "flowtel_current_user_has_product_access('caddie_magic')",
  "flowtel_current_user_is_concierge()",
  "caddie_magic_submit_mailbox_message",
  "caddie_magic_mailbox_admin_list",
  "caddie_magic_mailbox_mark_listened",
  "caddie_magic_mailbox_admin_update",
]) assert(migration.includes(token), `Migration 079 missing ${token}`);
assert.equal((migration.match(/\$\$/g) || []).length % 2, 0, "Migration 079 has unmatched SQL dollar quotes.");
for (const token of ["anonymity_requested", "caddie-mailbox-v2", "p_anonymity_requested", "caddie_magic_mailbox_admin_list"]) assert(migration080.includes(token), `Migration 080 missing ${token}`);
assert.equal((migration080.match(/\$\$/g) || []).length % 2, 0, "Migration 080 has unmatched SQL dollar quotes.");

const rewrites = new Map((vercel.rewrites || []).map((row) => [row.source, row.destination]));
assert.equal(rewrites.get("/caddie-magic/call-your-caddie"), "/caddie-magic/call-your-caddie/index.html");
assert.equal(rewrites.get("/manager/call-your-caddie"), "/manager/call-your-caddie/index.html");
assert.equal(rewrites.get("/manager/call-your-caddie/studio"), "/manager/call-your-caddie/studio/index.html");
const versionHeaders = (vercel.headers || []).flatMap((row) => row.headers || []).filter((h) => h.key === "X-Caddie-Magic-Version");
assert(versionHeaders.length >= 2 && versionHeaders.every((h) => h.value === "0.7.0"));

console.log("Call Your Caddie validation passed: browser recording, combined consent, anonymity request, private mailbox, owner queue, Studio Mode, 5-minute ceiling, routes, and no-Twilio launch boundary verified.");
