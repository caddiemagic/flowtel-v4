import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [clientHtml, clientJs, agendaHtml, agendaCss, releaseDoc, changelog, roadmap] = await Promise.all([
  read('client/index.html'),
  read('client/app.js'),
  read('queendom-events/index.html'),
  read('queendom-events/styles.css'),
  read('docs/RELEASE-0.10.84.3.md'),
  read('docs/CHANGELOG.md'),
  read('docs/FLOWTEL_ROADMAP.md')
]);

assert.match(clientHtml, /app\.js\?v=0\.10\.84\.3/);
assert.match(clientJs, /const today=localTodayISO\(\)/);
assert.doesNotMatch(clientJs, /loungeTodayIso\(/);
assert.match(clientJs, /Flowtel Lounge events could not open or render\./);
assert.match(clientJs, /Upcoming events could not open just now\./);

assert.match(agendaHtml, /GO TO MY SUITE/);
assert.match(agendaHtml, /href="\/client\/\?suite=1"/);
assert.match(agendaHtml, /RETURN TO THE LOUNGE/);
assert.match(agendaHtml, /href="\/client\/\?lounge=1"/);
assert.match(agendaHtml, /agenda-flowtel-nav-bottom/);
assert.match(agendaHtml, /app\.js\?v=0\.10\.84\.3/);
assert.match(agendaCss, /\.is-embed \.agenda-flowtel-nav\{display:none\}/);

assert.match(releaseDoc, /No migration is required/);
assert.match(releaseDoc, /Next migration number remains \*\*070\*\*/);
assert.match(changelog, /v0\.10\.84\.3 — Upcoming Events Navigation \+ Lounge Repair/);
assert.match(roadmap, /Current — v0\.10\.84\.3 Upcoming Events Navigation \+ Lounge Repair/);

console.log('Flowtel v0.10.84.3 Upcoming Events navigation + Lounge repair validator passed.');
