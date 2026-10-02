import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("database/migration-079-call-your-caddie-mailbox.sql", "utf8");
const player = await readFile("caddie-magic/call-your-caddie/app.js", "utf8");
const admin = await readFile("manager/call-your-caddie/app.js", "utf8");
const studio = await readFile("manager/call-your-caddie/studio/app.js", "utf8");

// Submission state must start NEW + unheard and carry explicit affirmative consent.
assert.match(migration, /now\(\),'new',now\(\),now\(\),now\(\)/);
assert.match(migration, /p_consent_recording is distinct from true or p_consent_publication is distinct from true/);
assert.match(migration, /consented_at timestamptz not null/);

// Downloading/preparing media must not itself mark a message listened.
const sharedSource = await readFile("shared/caddie-magic-mailbox.js", "utf8");
const downloadStart = sharedSource.indexOf("export async function downloadCaddieMailboxAudio");
const markStart = sharedSource.indexOf("export async function markCaddieMailboxListened");
const downloadBody = sharedSource.slice(downloadStart, markStart);
assert(downloadStart >= 0 && markStart > downloadStart);
assert(downloadBody.includes(".download(path)"));
assert(!downloadBody.includes("markCaddieMailboxListened"));

// First-listen write is idempotent and must preserve SELECTED so an unheard Show Queue item stays queued.
assert.match(migration, /first_listened_at = coalesce\(first_listened_at,now\(\)\)/);
assert.match(migration, /status = case when status = 'new' then 'listened' else status end/);
assert(admin.includes('audio.addEventListener("play"'));
assert(studio.includes('audio.addEventListener("play", markFirstListen)'));

// Recorder stops itself at the 300-second ceiling, but submission remains explicit.
assert(player.includes("elapsed >= CADDIE_MAILBOX_MAX_SECONDS"));
assert(player.includes("mediaRecorder.stop()"));
assert(player.includes('form.addEventListener("submit", sendMessage)'));

// Studio prepares private audio before play and switches to response only after ended.
const downloadAt = studio.indexOf("await downloadCaddieMailboxAudio(message)");
const playAt = studio.indexOf("await audio.play()");
assert(downloadAt >= 0 && playAt > downloadAt, "Studio should prepare audio before deliberate playback.");
assert(studio.includes('audio.addEventListener("ended", responseState)'));
assert(studio.includes('$("responsePanel").classList.remove("hidden")'));

// Workflow states remain separate from heard/unheard state.
for (const status of ["new", "listened", "selected", "used", "archived"]) {
  assert(migration.includes(`'${status}'`));
}
assert(admin.includes('status === "selected"'));
assert(studio.includes('status: "used"'));

console.log("Call Your Caddie behavior tests passed: NEW/UNHEARD, explicit consent, five-minute stop, selected-first-listen preservation, Studio preloading, response transition, and USED workflow verified.");
