import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const mustContain = (text, token, label) => {
  if (!text.includes(token)) throw new Error(`${label} is missing: ${token}`);
};
const mustNotContain = (text, token, label) => {
  if (text.includes(token)) throw new Error(`${label} must not contain: ${token}`);
};

const migration = read('database/migration-058-flow-fm-initiation-readiness.sql');
for (const token of [
  'flowtel_set_my_flowfm_start_date',
  'flowtel_admin_set_flowfm_start_date',
  'flowtel_flow_fm_availability_windows',
  'flowtel_availability_save_season',
  "'windows'",
  "'days'",
]) mustContain(migration, token, 'Migration 058');
mustNotContain(migration, 'drop table public.flowtel_flow_fm_availability_days', 'Migration 058');
mustNotContain(migration, 'truncate table', 'Migration 058');

const initiation = read('shared/initiation.js');
mustContain(initiation, 'export function flowFmProgressPercent', 'Initiation helper');
mustContain(initiation, '((month - 1) / 12) * 100', 'Initiation helper');
mustNotContain(initiation, 'profile.created_at', 'Initiation helper');

const flowFmApp = read('flow-fm/app.js');
const managerApp = read('manager/app.js');
for (const text of [flowFmApp, managerApp]) mustContain(text, 'flowFmProgressPercent', 'Progress rendering');

const profileHtml = read('profile/index.html');
const profileApp = read('profile/app.js');
const priestessTeamApp = read('manager/priestess-team/app.js');
for (const token of ['flowFmStartDate', 'Flow FM Start Date']) mustContain(profileHtml, token, 'My Profile');
mustContain(profileApp, 'updateMyFlowFmStartDate', 'My Profile');
mustContain(priestessTeamApp, 'setPriestessFlowFmStartDate', 'Priestess Team profile');

const hallHtml = read('flow-fm/index.html');
const hallCss = read('flow-fm/styles.css');
const designCss = read('flow-fm/design-system.css');
mustContain(hallHtml, 'queendom-scarab-sundisk-transparent.png', 'Initiation Hall');
mustContain(hallHtml, 'flowfm-page-hero', 'Initiation Hall');
mustContain(hallCss, '.hall-hero-card--grand::before,.hall-hero-card--grand::after{display:none}', 'Initiation Hall CSS');
mustContain(designCss, '--flowfm-hero-title-size', 'Flow FM design system');

const availabilityHtml = read('flow-fm/availability/index.html');
const availabilityApp = read('flow-fm/availability/page.js');
const availabilityCore = read('shared/flow-fm-availability-core.js');
for (const token of ['Client-Facing Calls', 'client-facing calls']) mustContain(availabilityHtml, token, 'Availability page');
for (const token of ['Inner Winter', 'Inner Spring', 'Inner Summer', 'Inner Autumn']) mustContain(availabilityCore, token, 'Availability core');
for (const token of ['Monday', 'Sunday']) mustContain(availabilityCore, token, 'Availability core');
for (const token of ['Offline', 'Add another time window', 'Save']) mustContain(availabilityApp, token, 'Availability app');
for (const token of ['Moon Day', 'Last Quarter Phase', 'Optional note', 'planet']) mustNotContain(availabilityApp, token, 'Availability app');

const hfrHtml = read('flow-fm/hourly-flow-rate/index.html');
const hfrApp = read('flow-fm/hourly-flow-rate/page.js');
for (const token of ['lifestyleLayersRoom', 'flowfm-page-hero']) mustContain(hfrHtml, token, 'Hourly Flow Rate page');
for (const token of ['MOMENT 1', 'MOMENT 2', 'MOMENT 3', 'MOMENT 4']) mustContain(hfrApp.toUpperCase(), token, 'Hourly Flow Rate app');
for (const token of ['Current Expenses', 'Listing link', 'Lifestyle Layers', 'coming soon']) mustContain(hfrApp, token, 'Hourly Flow Rate app');
for (const token of ['Moment 5', 'Moment 6', 'Meet the Home Base', 'Save my Home Base Number']) mustNotContain(hfrApp, token, 'Hourly Flow Rate app');

const managerHtml = read('manager/index.html');
const managerCss = read('manager/styles.css');
for (const token of ['data-audience="team"', 'data-audience="owner"', 'data-audience="caddie"', 'previewPriestessViewButton']) mustContain(managerHtml, token, 'Concierge Desk');
for (const token of ['Preview Priestess View', 'GOLF COURSE NETWORK', 'PLAYERS + ACCESS', 'CADDIE LIFECYCLE']) mustContain(managerApp, token, 'Concierge Desk app');
mustContain(managerCss, '.preview-priestess-view', 'Concierge Desk CSS');
mustContain(managerApp, 'listCourseCatalog', 'Caddie Network course foundation');

// Validate duplicate HTML IDs across the project.
for (const relative of fs.readdirSync(root, { recursive: true }).filter(name => name.endsWith('.html'))) {
  const text = read(relative);
  const ids = [...text.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${relative} contains duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);
}

// Lightweight CSS brace balance.
for (const relative of fs.readdirSync(root, { recursive: true }).filter(name => name.endsWith('.css'))) {
  const text = read(relative).replace(/\/\*[\s\S]*?\*\//g, '');
  const opens = (text.match(/{/g) || []).length;
  const closes = (text.match(/}/g) || []).length;
  if (opens !== closes) throw new Error(`${relative} has unbalanced CSS braces (${opens}/${closes}).`);
}

console.log('Flow FM initiation readiness static validation passed.');
