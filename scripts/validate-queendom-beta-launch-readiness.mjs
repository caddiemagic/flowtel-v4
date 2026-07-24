import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = file => readFile(path.join(root, file), 'utf8');

const dateHelper = await read('shared/flowtel-date.js');
const initiation = await read('shared/initiation.js');
const profileApp = await read('profile/app.js');
const profileHtml = await read('profile/index.html');
const teamApp = await read('manager/priestess-team/app.js');
const teamHtml = await read('manager/priestess-team/index.html');
const hallHtml = await read('flow-fm/index.html');
const hallApp = await read('flow-fm/app.js');
const hallUi = await read('flow-fm/ui.js');
const hallCss = await read('flow-fm/styles.css');
const clientApp = await read('client/app.js');
const clientHtml = await read('client/index.html');
const changelog = await read('docs/CHANGELOG.md');
const release = await read('docs/RELEASE-0.10.75.md');

for (const token of ['America/Los_Angeles', 'dateOnlyParts', 'formatDateOnly', 'flowtelTodayISO']) {
  assert(dateHelper.includes(token), `Flowtel date helper is missing ${token}.`);
}
assert(initiation.includes("calendarDateParts(started)"), 'Initiation progress does not preserve date-only start values.');
assert(initiation.includes('startedDateISO'), 'Initiation status does not expose the exact saved start date.');
assert(!initiation.includes('const startedAt = started ? new Date(started) : null'), 'Unsafe date-only timestamp parsing returned.');
assert(profileApp.includes('flowtelTodayISO()'), 'Member Flow FM start-date maximum is not based on Flowtel Time.');
assert(teamApp.includes('formatDateOnly(value'), 'Owner Flow FM start-date display may still shift backward.');
assert(teamApp.includes('flowtelTodayISO()'), 'Owner Flow FM start-date maximum is not based on Flowtel Time.');
assert(profileHtml.includes('app.js?v=0.10.75'), 'My Profile cache key is stale.');
assert(teamHtml.includes('app.js?v=0.10.76'), 'Priestess Team profile cache key is stale.');

assert(hallHtml.includes('<h1>13 Moons</h1>'), 'Initiation Hall title was not changed to 13 Moons.');
assert(!hallHtml.includes('The Doors Ahead'), 'The old Initiation Hall title remains.');
assert(hallHtml.includes('CURRENT MOON') && hallHtml.includes('NEXT STEP'), 'Initiation Hall orientation labels are incomplete.');
assert(hallHtml.includes('ROOMS + TOOLS'), 'Initiation Hall support-room hierarchy is missing.');
assert(hallHtml.includes('app.js?v=0.10.77') && hallHtml.includes('styles.css?v=0.10.77'), 'Initiation Hall cache keys are stale.');
assert(hallUi.includes("label: 'Availability'"), 'Flow FM navigation still says Client-Facing Calls.');
assert(hallApp.includes("eyebrow:'AVAILABILITY'"), 'Availability support-room label is stale.');
assert(hallCss.includes('Initiation Hall quiet-luxury rhythm'), 'Quiet-luxury Initiation Hall styling is missing.');
assert(hallCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'Moon path does not use the simplified logical grid.');
assert(hallCss.includes('.temple-door-crown') && hallCss.includes('display:none!important'), 'Ornate Moon-door decoration is not restrained.');

assert(clientApp.includes("const LOUNGE_SEASON_ORDER=['autumn','summer','winter','spring'];"), 'Four Seasons quadrant order must be Autumn, Summer, Winter, Spring.');
assert(clientHtml.includes('app.js?v=0.10.75') && clientHtml.includes('styles.css?v=0.10.75'), 'Client cache keys are stale.');

assert(changelog.includes('v0.10.75'), 'Changelog is missing v0.10.75.');
assert(release.includes('Queendom Beta Launch Experience'), 'Release note title is missing.');
assert(release.includes('No new migration required'), 'Release note must state migration status.');

try {
  await access(path.join(root, 'database/migration-061-queendom-beta-launch.sql'));
  assert.fail('A migration 061 file was added even though this release does not require schema changes.');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const ids = [...hallHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], 'Initiation Hall contains duplicate IDs.');

const cssWithoutComments = hallCss.replace(/\/\*[\s\S]*?\*\//g, '');
assert.equal((cssWithoutComments.match(/{/g) || []).length, (cssWithoutComments.match(/}/g) || []).length, 'Initiation Hall CSS braces are unbalanced.');

console.log('Flowtel v0.10.75 Queendom beta launch readiness validation passed.');
