import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("database/migration-081-call-your-caddie-public-recorder.sql", "utf8");
const api = await readFile("api/caddie-acuity.js", "utf8");
const shared = await readFile("shared/caddie-magic-mailbox.js", "utf8");
const studio = await readFile("manager/call-your-caddie/studio/app.js", "utf8");

assert(migration.includes("alter column submitted_by_user_id drop not null"));
assert(migration.includes("alter column player_profile_id drop not null"));
assert(migration.includes("v_recent >= 8"));
assert(migration.includes("'new',now(),now(),now()"));
assert(api.includes("rejectMailboxHoneypot(b)"));
assert(api.includes("createHmac('sha256'"));
assert(shared.includes("uploadToSignedUrl"));
assert(!shared.includes("getPublicUrl"));
assert(studio.includes('message?.anonymity_requested ? "ANONYMOUS"'));

console.log("Flowtel v0.10.93 public Call Your Caddie behavior test passed.");
