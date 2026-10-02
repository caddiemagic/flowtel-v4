import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const html = await readFile("caddie-magic/call-your-caddie/index.html", "utf8");
const app = await readFile("caddie-magic/call-your-caddie/app.js", "utf8");
const studio = await readFile("manager/call-your-caddie/studio/app.js", "utf8");
const migration = await readFile("database/migration-080-call-your-caddie-anonymity.sql", "utf8");

// One required media-consent control; anonymity remains optional and independent.
assert.equal((html.match(/type="checkbox"/g) || []).length, 2);
assert.match(html, /id="mediaConsent" type="checkbox" required/);
assert.match(html, /id="anonymityRequested" type="checkbox" \/>/);
assert(app.includes("consentRecording: mediaConsent.checked"));
assert(app.includes("consentPublication: mediaConsent.checked"));
assert(app.includes("anonymityRequested: anonymityRequested.checked"));

// Private name is preserved in storage/admin, while Studio Mode masks it for public use.
assert(migration.includes("caller_name text" ) || migration.includes("p_caller_name text"));
assert(migration.includes("p_anonymity_requested boolean"));
assert(studio.includes('message?.anonymity_requested ? "ANONYMOUS"'));
assert(studio.includes("callerName: current.caller_name"));
console.log("Flowtel v0.10.92.1 Call Your Caddie polish behavior test passed.");
