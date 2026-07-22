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
  "shared/caddie-magic-access.js",
  "shared/caddie-magic-reviews.js",
  "shared/caddie-magic-compass.js",
  "shared/caddie-magic-schedule.js",
  "shared/caddie-magic-moon-calendar.js",
  "shared/caddie-magic-score-calculations.js",
  "shared/product-access.js",
  "assets/caddie-magic-medicine-wheel-directions.png",
  "assets/caddie-magic-map-wheel.png",
  "vercel.json",
  "database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql",
  "database/migration-044-caddie-magic-player-only-access-private-beta.sql",
  "database/migration-045-caddie-magic-player-invite-code-hotfix.sql",
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

const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const rewriteSources = new Set((vercel.rewrites || []).map((item) => item.source));
for (const route of ["/caddie-magic/compass", "/caddie-magic/compass/admin", "/caddie-magic/score-map", "/caddie-magic/collective-map"]) {
  if (!rewriteSources.has(route)) phaseErrors.push(`vercel.json: missing explicit rewrite for ${route}`);
}

if (missing.length || phaseErrors.length) {
  console.error("Caddie Magic validation failed.");
  for (const file of missing) console.error(`Missing: ${file}`);
  for (const issue of phaseErrors) console.error(issue);
  process.exit(1);
}

console.log(`Caddie Magic validation passed (${required.length} canonical files checked).`);
