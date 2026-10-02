import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("caddie-magic/call-your-caddie/index.html", "utf8");
const app = await readFile("caddie-magic/call-your-caddie/app.js", "utf8");
const shared = await readFile("shared/caddie-magic-mailbox.js", "utf8");
const api = await readFile("api/caddie-acuity.js", "utf8");
const migration = await readFile("database/migration-081-call-your-caddie-public-recorder.sql", "utf8");
const release = await readFile("docs/RELEASE-0.10.93.md", "utf8");

assert(html.includes("VOICEMAIL LINE OPEN"));
assert(html.includes("2.</span><strong>Leave me a message"));
assert(app.includes("submitPublicCaddieMailboxMessage"));
assert(app.includes("Public callers intentionally continue without authentication"));
assert(shared.includes("uploadToSignedUrl"));
assert(api.includes("public-mailbox-init") && api.includes("public-mailbox-finalize"));
assert(api.includes("object/upload/sign"));
assert(migration.includes("public_browser_voice_note"));
assert(migration.includes("to service_role"));
assert(!migration.includes("to anon;"));
assert(release.includes("12/12"));
assert(release.includes("New environment variables: **0**"));

console.log("Flowtel v0.10.93 public Call Your Caddie release validation passed.");
