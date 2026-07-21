import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";

const required = [
  "caddie-magic/index.html",
  "caddie-magic/app.js",
  "caddie-magic/styles.css",
  "caddie-magic/score-map/index.html",
  "caddie-magic/score-map/app.js",
  "caddie-magic/collective-map/index.html",
  "caddie-magic/collective-map/app.js",
  "caddie-magic/compass/index.html",
  "caddie-magic/compass/app.js",
  "caddie-magic/compass/admin/index.html",
  "caddie-magic/compass/admin/app.js",
  "caddie-magic/compass/club/index.html",
  "caddie-magic/compass/club/app.js",
  "caddie-magic/caddies/index.html",
  "caddie-magic/caddies/app.js",
  "caddie-magic/caddie-desk/index.html",
  "caddie-magic/caddie-desk/app.js",
  "shared/caddie-magic-access.js",
  "shared/caddie-magic-reviews.js",
  "shared/caddie-magic-compass.js",
  "shared/caddie-magic-schedule.js",
  "shared/caddie-magic-moon-calendar.js",
  "shared/caddie-magic-network.js",
  "shared/product-access.js",
  "assets/caddie-magic-medicine-wheel-directions.png",
  "assets/caddie-magic-map-wheel.png",
  "vercel.json",
  "database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql",
  "database/migration-044-caddie-magic-player-only-access-private-beta.sql",
  "database/migration-045-caddie-magic-player-invite-code-hotfix.sql",
  "database/migration-052-caddie-magic-caddie-network-foundation.sql",
];

const missing = [];
for (const file of required) {
  try {
    await access(file, constants.R_OK);
  } catch {
    missing.push(file);
  }
}

const phaseFiles = [
  "caddie-magic/score-map/index.html",
  "caddie-magic/collective-map/index.html",
  "caddie-magic/compass/index.html",
];
const phaseErrors = [];
for (const file of phaseFiles) {
  const text = await readFile(file, "utf8");
  if (/First Quarter(?! Phase)/.test(text)) phaseErrors.push(`${file}: First Quarter missing Phase`);
  if (/Last Quarter(?! Phase)/.test(text)) phaseErrors.push(`${file}: Last Quarter missing Phase`);
}

const scoreMapHtml = await readFile("caddie-magic/score-map/index.html", "utf8");
if (/Download Score Map Exercise/i.test(scoreMapHtml)) phaseErrors.push("score-map: exercise button should be removed");


const playerCompassHtml = await readFile("caddie-magic/compass/index.html", "utf8");
for (const forbidden of ["Assignments", "Messages", "Caddie Notes"]) {
  if (playerCompassHtml.includes(forbidden)) phaseErrors.push(`player Compass: legacy ${forbidden} UI should be removed`);
}
for (const direction of ["north", "east", "south", "west"]) {
  if (!playerCompassHtml.includes(`/caddie-magic/compass/club/?direction=${direction}`)) phaseErrors.push(`player Compass: missing ${direction} Cardinal Club doorway`);
}

const caddieDeskHtml = await readFile("caddie-magic/caddie-desk/index.html", "utf8");
if (!/requests, availability, consultation preparation/i.test(caddieDeskHtml)) phaseErrors.push("Caddie Desk: service boundary copy missing");

const managerHtml = await readFile("manager/index.html", "utf8");
if (!managerHtml.includes('data-filter="caddie-network"')) phaseErrors.push("manager: Caddie Network owner card missing");
if (managerHtml.includes('data-filter="caddie-reviews"') || managerHtml.includes('data-filter="caddie-compass"')) phaseErrors.push("manager: legacy Caddie assignment/review cards should not be visible");

const migration052 = await readFile("database/migration-052-caddie-magic-caddie-network-foundation.sql", "utf8");
for (const table of ["caddie_magic_caddie_profiles", "caddie_magic_caddie_requests", "caddie_magic_caddie_availability_slots", "caddie_magic_consultations"]) {
  if (!migration052.includes(`create table if not exists public.${table}`)) phaseErrors.push(`migration 052: missing ${table}`);
}
if (!migration052.includes("Availability opens only after the Caddie accepts your request")) phaseErrors.push("migration 052: accepted-only availability guard missing");
if (!migration052.includes("caddie_magic_complete_consultation")) phaseErrors.push("migration 052: Caddie consultation completion RPC missing");
if (!migration052.includes("with cancelled_consultations as")) phaseErrors.push("migration 052: ending a request should cancel its scheduled consultation");
if ((migration052.match(/perform public\.caddie_magic_require_product_access\(\);/g) || []).length < 20) phaseErrors.push("migration 052: RPC product-access guards missing");
if ((migration052.match(/as restrictive for all to authenticated/g) || []).length < 4) phaseErrors.push("migration 052: restrictive product-access table policies missing");

const scoreMapCss = await readFile("caddie-magic/score-map/styles.css", "utf8");
if (!scoreMapCss.includes("deterministic Locker Room-matched mobile controls") || !scoreMapCss.includes("width:100%!important")) {
  phaseErrors.push("score-map: full-width mobile Locker Room control match missing");
}

const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const rewriteSources = new Set((vercel.rewrites || []).map((item) => item.source));
for (const route of ["/caddie-magic/compass", "/caddie-magic/compass/admin", "/caddie-magic/compass/club", "/caddie-magic/caddies", "/caddie-magic/caddie-desk", "/caddie-magic/score-map", "/caddie-magic/collective-map"]) {
  if (!rewriteSources.has(route)) phaseErrors.push(`vercel.json: missing explicit rewrite for ${route}`);
}

if (missing.length || phaseErrors.length) {
  console.error("Caddie Magic validation failed.");
  for (const file of missing) console.error(`Missing: ${file}`);
  for (const issue of phaseErrors) console.error(issue);
  process.exit(1);
}

console.log(`Caddie Magic validation passed (${required.length} canonical files checked).`);
