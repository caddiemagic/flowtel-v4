import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(p, "utf8");
const html = await read("caddie-magic/call-your-caddie/index.html");
const css = await read("caddie-magic/call-your-caddie/styles.css");
const app = await read("caddie-magic/call-your-caddie/app.js");
const shared = await read("shared/caddie-magic-mailbox.js");
const admin = await read("manager/call-your-caddie/app.js");
const studio = await read("manager/call-your-caddie/studio/app.js");
const migration = await read("database/migration-080-call-your-caddie-anonymity.sql");

assert(!html.includes("Got a golf problem?"));
assert(!html.includes("Leave it with your Caddie."));
for (const text of [
  "HOW IT WORKS",
  "You have a problem or an observation",
  "You record a voicemail and tell me about it",
  "Tune in to the Call Your Caddie podcast for my response",
  "Please do not use my name in the podcast",
]) assert(html.includes(text), `Missing exact requested copy: ${text}`);
assert.equal((html.match(/id="mediaConsent"/g) || []).length, 1);
assert(!/id="recordingConsent"|id="publicationConsent"/.test(html));
assert(css.includes("min-height:58px"));
assert(css.includes("font:600 1.05rem"));
assert(app.includes("anonymityRequested.checked"));
assert(shared.includes("p_anonymity_requested"));
assert(admin.includes("ANONYMITY REQUESTED"));
assert(studio.includes('return message?.anonymity_requested ? "ANONYMOUS"'));
assert(migration.includes("anonymity_requested boolean not null default false"));
assert(migration.includes("caddie-mailbox-v2"));
assert(migration.includes("migration 080; migration 081 is next"));
console.log("Flowtel v0.10.92.1 Call Your Caddie polish validation passed.");
