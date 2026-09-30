import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getMoonPhaseMarker } from '../shared/moon.js';

const markers=[
  ['2026-09-10','NEW MOON',1],
  ['2026-09-17','HALF FULL MOON',8],
  ['2026-09-24','FULL MOON',15],
  ['2026-10-01','HALF NEW MOON',22],
];
for(const [date,label,day] of markers){
  const marker=getMoonPhaseMarker(date);
  assert.equal(marker?.label,label,`${date} should render ${label}`);
  assert.equal(marker?.moonDay,day,`${date} should be Flowtel Moon Day ${day}`);
}
assert.equal(getMoonPhaseMarker('2026-09-11'),null,'Non-threshold moon days should not clutter the event calendar.');

const agenda=fs.readFileSync('queendom-events/app.js','utf8');
assert.match(agenda,/nextRegisteredOccurrence/,'Universal event doorway must target a registered recurring occurrence.');
assert.match(agenda,/e\.event_format==='recurring'\?eventOccurrences\(e\)\.filter\(item=>item\.is_registered\)/,'Live alert must not advertise an unclaimed recurring occurrence.');
assert.match(agenda,/activeAccessOccurrenceId/,'Recurring occurrence selection must survive authentication/Event Pass creation.');

const calendar=fs.readFileSync('queendom-calendar/app.js','utf8');
assert.match(calendar,/memberMode=false;\s*events=await listPublicQueendomEvents/,'Rank-0 signed-in identities should fall back to the public calendar rather than fail closed on discovery.');

const acuity=fs.readFileSync('api/acuity.js','utf8');
assert.ok((acuity.match(/includeUnavailable:true/g)||[]).length>=3,'Import and booking checks should include full/unavailable Acuity class offerings.');
assert.doesNotMatch(acuity,/noEmail\s*:\s*true/,'Acuity event registration must leave configured confirmation/reminder email enabled.');

console.log('Flowtel v0.10.90 Event Operations behavior checks passed.');
