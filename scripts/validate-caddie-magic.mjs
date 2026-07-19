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
  "shared/product-access.js",
  "database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql",
  "database/migration-044-caddie-magic-player-only-access-private-beta.sql",
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

if (missing.length || phaseErrors.length) {
  console.error("Caddie Magic validation failed.");
  for (const file of missing) console.error(`Missing: ${file}`);
  for (const issue of phaseErrors) console.error(issue);
  process.exit(1);
}

console.log(`Caddie Magic validation passed (${required.length} canonical files checked).`);
