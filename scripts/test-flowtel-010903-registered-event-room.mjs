import assert from 'node:assert/strict';
import fs from 'node:fs';

const agenda=fs.readFileSync('queendom-events/app.js','utf8');
const calendar=fs.readFileSync('queendom-calendar/app.js','utf8');
const client=fs.readFileSync('client/app.js','utf8');
const clientHtml=fs.readFileSync('client/index.html','utf8');

const currentOccurrence=(agenda.match(/function currentOccurrence\(detail,requestedId=''\)\{[\s\S]*?\}\nfunction currentSeriesOccurrence/)||[''])[0];
assert.match(currentOccurrence,/requestedId[\s\S]*rows\.find\(item=>String\(item\.occurrence_id\)===String\(requestedId\)\)/,'Explicit recurring occurrence must remain first priority.');
assert.match(currentOccurrence,/event_format==='recurring'[\s\S]*filter\(item=>item\.is_registered\)/,'Without an explicit occurrence, recurring rooms must prefer registered occurrences.');

const room=(agenda.match(/async function openEventRoom\(eventId,requestedOccurrenceId=''\)\{[\s\S]*?\n\}\nfunction closeEventRoom/)||[''])[0];
assert.match(room,/registeredContext=detail\.event_format==='series'\?occurrenceItinerary\(detail,current\):''/,'Only Series/Vortex rooms should render a multi-gathering itinerary.');
assert.doesNotMatch(room,/\$\{occurrenceItinerary\(detail,current\)\}/,'Registered recurring rooms must not inject all upcoming gatherings unconditionally.');
assert.match(room,/data-room-unclaim/,'Registered Event Room must render UNCLAIM MY SEAT.');
assert.match(room,/data-occurrence-id=.*recurringOccurrenceId/,'Recurring room unclaim must carry the exact occurrence id.');
assert.match(room,/await unclaimSeat\(button\.dataset\.eventId,button\.dataset\.occurrenceId\|\|''\)/,'Room unclaim must call the existing Acuity-first release path.');
assert.match(room,/if\(released\)\{closeEventRoom\(\)/,'Successful in-room unclaim should close the now-unregistered room.');
assert.doesNotMatch(agenda,/NEXT GATHERING CLAIMED/,'Registered action copy must not use NEXT GATHERING CLAIMED.');

const preview=(calendar.match(/function previewMoments\(rows\)\{[\s\S]*?\n\}/)||[''])[0];
assert.match(preview,/flatMap/,'Calendar preview must flatten recurring/series occurrences into gathering moments.');
assert.match(preview,/slice\(0,3\)/,'Calendar preview must cap itself at three upcoming gatherings.');
assert.match(calendar,/data-preview-occurrence-id/,'Calendar preview must preserve occurrence identity.');
assert.match(calendar,/data-release-seat/,'Calendar dialog must support seat release.');
assert.match(calendar,/setQueendomEventRegistration\(event\.event_id,target,event\.event_format==='recurring'\?occurrence\?\.occurrence_id:null\)/,'Calendar unclaim must preserve recurring occurrence identity.');

const loungeView=(client.match(/function setLoungeEventsView\(_view,[\s\S]*?\n\}/)||[''])[0];
assert.match(loungeView,/discovery\.classList\.add\("hidden"\)/,'Lounge discovery card must remain hidden.');
assert.match(loungeView,/mine\.classList\.remove\("hidden"\)/,'Lounge must show My Upcoming Events directly.');
assert.match(clientHtml,/href="\/queendom-calendar\/">View All Upcoming Events<\/a>/,'Lounge must expose one View All Upcoming Events calendar doorway.');
assert.doesNotMatch(clientHtml,/id="backToUpcomingEventsButton"/,'Lounge should not retain the Back to Upcoming Events toggle.');

console.log('Flowtel v0.10.90.3 Event Experience behavior checks passed.');
