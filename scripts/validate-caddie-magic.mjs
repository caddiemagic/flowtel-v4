import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";

const required = [
  "caddie-magic/index.html",
  "caddie-magic/app.js",
  "caddie-magic/styles.css",
  "caddie-magic/score-map/index.html",
  "caddie-magic/score-map/app.js",
  "caddie-magic/score-map/styles.css",
  "caddie-magic/score-map/printable/index.html",
  "caddie-magic/collective-map/index.html",
  "caddie-magic/collective-map/app.js",
  "caddie-magic/collective-map/styles.css",
  "caddie-magic/compass/index.html",
  "caddie-magic/compass/app.js",
  "caddie-magic/compass/styles.css",
  "caddie-magic/compass/admin/index.html",
  "caddie-magic/compass/admin/app.js",
  "caddie-magic/compass/club/index.html",
  "caddie-magic/compass/club/app.js",
  "caddie-magic/caddies/index.html",
  "caddie-magic/caddies/app.js",
  "caddie-magic/caddie-desk/index.html",
  "caddie-magic/caddie-desk/app.js",
  "caddie-magic/caddie-desk/styles.css",
  "shared/caddie-magic-access.js",
  "shared/caddie-magic-reviews.js",
  "shared/caddie-magic-compass.js",
  "shared/caddie-magic-network.js",
  "shared/caddie-magic-schedule.js",
  "shared/caddie-magic-moon-calendar.js",
  "shared/caddie-magic-score-calculations.js",
  "shared/product-access.js",
  "assets/caddie-magic-medicine-wheel-directions.png",
  "assets/caddie-magic-map-wheel.png",
  "manager/index.html",
  "manager/app.js",
  "manager/styles.css",
  "vercel.json",
  "database/migration-044-caddie-magic-player-only-access-private-beta.sql",
  "database/migration-045-caddie-magic-player-invite-code-hotfix.sql",
  "database/migration-052-caddie-magic-caddie-network-foundation.sql",
  "database/migration-052-combined-flowtel-caddie-updates.sql",
  "database/migration-053-caddie-network-reintegration-shared-scheduling.sql",
];

const missing = [];
for (const file of required) {
  try { await access(file, constants.R_OK); } catch { missing.push(file); }
}
assert.deepEqual(missing, [], `Missing Caddie Magic files:\n${missing.join("\n")}`);

const read = (file) => readFile(file, "utf8");
const files = {
  playerHtml: await read("caddie-magic/index.html"),
  playerJs: await read("caddie-magic/app.js"),
  playerCss: await read("caddie-magic/styles.css"),
  scoreHtml: await read("caddie-magic/score-map/index.html"),
  scoreJs: await read("caddie-magic/score-map/app.js"),
  scoreCss: await read("caddie-magic/score-map/styles.css"),
  collectiveHtml: await read("caddie-magic/collective-map/index.html"),
  collectiveCss: await read("caddie-magic/collective-map/styles.css"),
  compassHtml: await read("caddie-magic/compass/index.html"),
  compassJs: await read("caddie-magic/compass/app.js"),
  compassCss: await read("caddie-magic/compass/styles.css"),
  clubHtml: await read("caddie-magic/compass/club/index.html"),
  clubJs: await read("caddie-magic/compass/club/app.js"),
  directoryHtml: await read("caddie-magic/caddies/index.html"),
  directoryJs: await read("caddie-magic/caddies/app.js"),
  deskHtml: await read("caddie-magic/caddie-desk/index.html"),
  deskJs: await read("caddie-magic/caddie-desk/app.js"),
  deskCss: await read("caddie-magic/caddie-desk/styles.css"),
  network: await read("shared/caddie-magic-network.js"),
  reviews: await read("shared/caddie-magic-reviews.js"),
  scores: await read("shared/caddie-magic-score-calculations.js"),
  managerHtml: await read("manager/index.html"),
  managerJs: await read("manager/app.js"),
  managerCss: await read("manager/styles.css"),
  migration: await read("database/migration-053-caddie-network-reintegration-shared-scheduling.sql"),
};

// Version coherence and removal of internal user-facing version pills.
const caddieHtmlFiles = [
  "caddie-magic/index.html",
  "caddie-magic/score-map/index.html",
  "caddie-magic/collective-map/index.html",
  "caddie-magic/compass/index.html",
  "caddie-magic/compass/admin/index.html",
  "caddie-magic/compass/club/index.html",
  "caddie-magic/caddies/index.html",
  "caddie-magic/caddie-desk/index.html",
];
for (const file of caddieHtmlFiles) {
  const html = await read(file);
  assert(html.includes("0.5.1"), `${file}: missing v0.5.1 cache/version wiring.`);
  assert(!html.includes("cm-version"), `${file}: internal version pill is still user-facing.`);
  assert(!/v0\.(4\.6|5\.0)/.test(html), `${file}: stale active Caddie version remains.`);
}
assert(files.managerHtml.includes('app.js?v=0.10.68-caddie-0.5.1'), "Manager loader is not coordinated with Caddie Magic v0.5.1.");

const vercel = JSON.parse(await read("vercel.json"));
const rewriteSources = new Set((vercel.rewrites || []).map((item) => item.source));
for (const route of [
  "/caddie-magic",
  "/caddie-magic/score-map",
  "/caddie-magic/collective-map",
  "/caddie-magic/compass",
  "/caddie-magic/compass/admin",
  "/caddie-magic/compass/club",
  "/caddie-magic/caddies",
  "/caddie-magic/caddie-desk",
]) assert(rewriteSources.has(route), `vercel.json: missing explicit rewrite for ${route}`);
const versionHeaders = (vercel.headers || [])
  .filter((entry) => String(entry.source || "").startsWith("/caddie-magic") || String(entry.source || "").startsWith("/manager"))
  .flatMap((entry) => entry.headers || [])
  .filter((header) => header.key === "X-Caddie-Magic-Version");
assert(versionHeaders.length >= 2, "Caddie Magic version headers are missing.");
assert(versionHeaders.every((header) => header.value === "0.5.1"), "Caddie Magic version headers are not coherent at 0.5.1.");

// Player Profile: exact approved card family plus separate Caddie Master services.
for (const label of ["Assignments", "Caddie Compass", "Caddie Network", "Calendar"]) {
  assert(files.playerJs.includes(`<span>${label}</span>`), `Player Profile card missing: ${label}`);
}
assert(files.playerHtml.includes('id="lockerRoomSharingToggle"'), "Locker Room sharing toggle is missing from Player Profile.");
assert(files.playerHtml.includes('id="caddieDeskDoor"'), "Conditional full-width Caddie Desk lifecycle doorway is missing.");
for (const stateCopy of ["Complete Your Caddie Profile", "Enter the Caddie Desk", "Your Caddie service access is paused"]) {
  assert(files.playerJs.includes(stateCopy), `Caddie Desk lifecycle copy missing: ${stateCopy}`);
}
assert(files.playerHtml.includes("CADDIE MASTER NOTES"), "Caddie Master Notes section is missing.");
assert(files.playerHtml.includes("Messages with The Caddie Master"), "VIP Caddie Master Messages are missing.");
assert(files.playerJs.includes('isPlayer ? "You" : "The Caddie Master"'), "Message thread does not distinguish You and The Caddie Master.");
assert(files.playerJs.includes("vip_messaging_enabled"), "VIP messaging gate is missing from Player UI.");
assert(files.playerJs.includes("available_review_credits"), "Scorecard Review credit state is missing from Player UI.");
assert(files.playerHtml.includes('app.js?v=0.5.1-login-hotfix-1'), "Player Profile login bootstrap cache-bust is missing.");
assert(/const invitationParams = new URLSearchParams\(window\.location\.search\);[\s\S]*bindEvents\(\);\s*bootPortal\(\);\s*$/.test(files.playerJs), "Player Profile module does not initialize invitation state, bind controls, and restore the remembered session at top level.");

// Compass must be a functional four-door map, not the reverted assignment/message surface.
for (const direction of ["north", "east", "south", "west"]) {
  assert(files.compassHtml.includes(`/caddie-magic/compass/club/?direction=${direction}`), `Compass ${direction} Club Room link is missing.`);
}
assert(!/assignmentList|dispatchList|sendDispatch/i.test(files.compassHtml), "Legacy Assignments/Messages remain in the Player Compass HTML.");
assert(!/getCompassAssignments|getCompassDispatches|sendCompassDispatch/.test(files.compassJs), "Legacy Assignments/Messages remain wired into the Player Compass app.");
assert(files.compassHtml.includes('id="calendar"'), "Upcoming Golf Calendar was not preserved in the Compass.");
assert(files.compassCss.includes("Upcoming Golf practical calendar typography"), "Upcoming Golf polish marker is missing.");

// Cardinal Club and Moon/Phase rules.
for (const [direction, phase, days] of [
  ["North", "Last Quarter Phase", "20–26"],
  ["East", "Full Moon Phase", "12–19"],
  ["South", "First Quarter Phase", "6–11"],
  ["West", "New Moon Phase", "27–5"],
]) {
  assert(files.clubJs.includes(direction.toLowerCase()), `Cardinal Club app is missing ${direction}.`);
  assert(files.clubJs.includes(phase), `Cardinal Club app is missing ${phase}.`);
  assert(files.clubJs.includes(days), `Cardinal Club app is missing Moon Days ${days}.`);
}
for (const [file, text] of Object.entries({ score: files.scoreHtml, collective: files.collectiveHtml, compass: files.compassHtml, club: files.clubHtml })) {
  assert(!/First Quarter(?! Phase)/.test(text), `${file}: First Quarter span is missing “Phase”.`);
  assert(!/Last Quarter(?! Phase)/.test(text), `${file}: Last Quarter span is missing “Phase”.`);
}

// Preserve v0.4.6 geometry and valid-score behavior.
for (const token of [
  ".cm-map-north{grid-column:1;grid-row:1}",
  ".cm-map-east{grid-column:2;grid-row:1}",
  ".cm-map-west{grid-column:1;grid-row:2}",
  ".cm-map-south{grid-column:2;grid-row:2}",
]) assert(files.scoreCss.includes(token), `Score Map geometry missing: ${token}`);
for (const token of [
  ".cm-collective-north{grid-column:1;grid-row:1}",
  ".cm-collective-east{grid-column:2;grid-row:1}",
  ".cm-collective-west{grid-column:1;grid-row:2}",
  ".cm-collective-south{grid-column:2;grid-row:2}",
]) assert(files.collectiveCss.includes(token), `Locker Room geometry missing: ${token}`);
assert(files.scores.includes("validGolfScore"), "Shared valid-score calculation is missing.");
assert(files.playerJs.includes("averageValidGolfScore"), "Player Profile no longer uses valid-score averages.");
assert(files.scoreJs.includes("validGolfScore(entry.score) !== null"), "Score Map no longer excludes thought-only entries from score calculations.");
assert(files.playerJs.includes("max"), "Player date guard could not be verified.");

// Simplified Caddie Profile, controlled courses, and seven-day shared schedule.
for (const retiredId of [
  "caddieYearsExperience", "caddieProfilePhoto", "caddiePebbleExperience",
  "caddiePhilosophy", "caddieConsultationMethod", "caddieConsultationLength", "caddieMeetingLink",
]) assert(!files.deskHtml.includes(retiredId), `Retired Caddie Profile field remains: ${retiredId}`);
for (const token of ["courseCatalog", "courseRequestName", "weeklyScheduleGrid", "scheduleExceptionForm", "Acuity + Zoom Integration Prepared"]) {
  assert(files.deskHtml.includes(token), `Caddie Desk foundation missing: ${token}`);
}
assert(files.deskJs.includes("Pending Verification"), "Private pending-course verification state is missing.");
for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) assert(files.deskJs.includes(day), `Weekly schedule is missing ${day}.`);
for (const times of ["9:00 · 10:00 · 11:00", "1:00 · 2:00 · 3:00", "5:00 · 6:00 · 7:00"]) assert(files.deskJs.includes(times), `Schedule daypart is missing ${times}.`);
for (const service of ["Calls", "Caddying"]) assert(files.deskHtml.includes(service), `Schedule service toggle missing: ${service}`);
assert(files.deskHtml.includes("45-minute"), "Caddie Consultation duration is not fixed at 45 minutes in the Caddie Desk.");
assert(files.directoryJs.includes("45-minute"), "Directory booking copy does not identify the 45-minute consultation.");

// Shared module and additive database/RLS foundations.
for (const rpc of [
  "caddie_magic_list_course_catalog",
  "caddie_magic_get_my_course_settings",
  "caddie_magic_save_my_courses",
  "caddie_magic_request_course",
  "caddie_magic_get_my_schedule",
  "caddie_magic_save_my_weekly_schedule",
  "caddie_magic_add_my_schedule_exception",
  "caddie_magic_get_my_master_access",
  "caddie_magic_set_vip_messaging",
]) assert(files.network.includes(rpc), `Shared Caddie Network wrapper missing RPC: ${rpc}`);
assert(files.reviews.includes("caddie_magic_close_score_review"), "Scorecard Review credit restoration wrapper is missing.");
for (const table of [
  "flowtel_provider_scheduling_profiles",
  "flowtel_provider_service_types",
  "flowtel_provider_weekly_availability",
  "flowtel_provider_availability_exceptions",
  "flowtel_external_appointments",
  "caddie_magic_courses",
  "caddie_magic_caddie_courses",
  "caddie_magic_course_requests",
  "caddie_magic_master_access",
]) assert(files.migration.includes(`public.${table}`), `Migration 053 missing table foundation: ${table}`);
for (const course of ["Pebble Beach Golf Links", "Spyglass Hill Golf Course", "The Links at Spanish Bay", "Cypress Point Club", "Monterey Peninsula Country Club"]) {
  assert(files.migration.includes(course), `Initial course catalog missing: ${course}`);
}
for (const token of [
  "floor(v_total / 28.0)",
  "revoke insert, update, delete on public.caddie_magic_review_requests from authenticated",
  "status in ('requested','completed')",
  "status in ('requested','completed','cancelled','declined')",
  "duration_minutes, is_active",
  "'Caddie Consultation', 45",
  "array[9,10,11]",
  "array[13,14,15]",
  "array[17,18,19]",
  "interval '45 minutes'",
  "caddie_magic_refresh_consultation_slots",
  "flowtel_current_user_has_product_access('caddie_magic')",
]) assert(files.migration.includes(token), `Migration 053 behavior missing: ${token}`);
assert(files.migration.includes("Both historical migration 052 files are already represented in the live schema"), "Migration 053 does not protect the two historical migration 052 bodies.");
assert(files.migration.includes("Migration 037 is retired"), "Migration 053 does not preserve retired migration 037 warning.");
assert.equal((files.migration.match(/\$\$/g) || []).length % 2, 0, "Migration 053 has unmatched SQL dollar quotes.");

// Owner-only operational wiring.
for (const token of [
  "Invite as Caddie", "VIP Messages", "caddie-network", "reviewCourseRequest",
  "setCaddieProfileStatus", "setVipCaddieMasterMessaging", "Cancel + Restore Credit", "Decline + Restore Credit",
]) assert(files.managerJs.includes(token), `Owner Caddie Network wiring missing: ${token}`);
assert(files.managerHtml.includes("Scorecard Reviews"), "Owner Desk has not adopted Scorecard Review language.");
assert(files.managerCss.includes("owner Caddie Network queue"), "Owner Caddie Network queue styling is missing.");

function duplicateIds(html) {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}
for (const file of caddieHtmlFiles) {
  const html = await read(file);
  assert.deepEqual(duplicateIds(html), [], `${file}: duplicate HTML IDs found.`);
}

function balancedCss(text) {
  let depth = 0, quote = "", comment = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i], n = text[i + 1];
    if (comment) { if (c === "*" && n === "/") { comment = false; i += 1; } continue; }
    if (!quote && c === "/" && n === "*") { comment = true; i += 1; continue; }
    if (quote) { if (c === "\\") { i += 1; continue; } if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "{") depth += 1;
    if (c === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && !quote && !comment;
}
for (const [name, css] of Object.entries({ player: files.playerCss, score: files.scoreCss, collective: files.collectiveCss, compass: files.compassCss, desk: files.deskCss, manager: files.managerCss })) {
  assert(balancedCss(css), `${name} CSS is structurally unbalanced.`);
}

console.log(`Caddie Magic v0.5.1 validation passed (${required.length} canonical files plus routes, roles, SQL, and UI boundaries checked).`);
