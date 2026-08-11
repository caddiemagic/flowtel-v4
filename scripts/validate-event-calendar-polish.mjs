import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [clientHtml, clientJs, clientCss, agendaJs, agendaCss, agendaHtml, embedDoc, releaseDoc] = await Promise.all([
  read('client/index.html'),
  read('client/app.js'),
  read('client/styles.css'),
  read('queendom-events/app.js'),
  read('queendom-events/styles.css'),
  read('queendom-events/index.html'),
  read('docs/QUEENDOM-EVENTS-EMBED.md'),
  read('docs/RELEASE-0.10.84.2.md')
]);

assert.match(clientHtml, /UPCOMING EVENTS IN THE QUEENDOM/);
assert.doesNotMatch(clientHtml, /The experiences you have chosen\./);
assert.match(clientHtml, /id="openMyUpcomingEventsButton"/);
assert.match(clientHtml, /id="my-upcoming-events"[^>]*hidden/);
assert.match(clientJs, /slice\(0,3\)/);
assert.match(clientJs, /mode==='discover'/);
assert.match(clientJs, /mode==='manage'/);
assert.match(clientJs, /setLoungeEventsView\("mine"/);
assert.match(clientCss, /lounge-event-list-discovery/);
assert.match(clientCss, /object-fit:contain/);

assert.match(agendaJs, /rows\.slice\(0,4\)/);
assert.match(agendaJs, /COMING UP/);
assert.match(agendaJs, /VIEW ALL UPCOMING EVENTS/);
assert.match(agendaJs, /flowtel:queendom-events-height/);
assert.match(agendaCss, /agenda-embed-featured/);
assert.match(agendaCss, /agenda-event\.is-embed-compact/);
assert.match(agendaCss, /object-fit:contain/);
assert.match(agendaHtml, /0\.10\.84\.2/);
assert.match(embedDoc, /app\.theflowtel\.com\/queendom-events\/\?embed=1/);
assert.match(embedDoc, /flowtel:queendom-events-height/);
assert.match(releaseDoc, /No migration is required/);
assert.match(releaseDoc, /Next migration number remains \*\*070\*\*/);

console.log('Flowtel v0.10.84.2 event calendar polish validator passed.');
