import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('database/migration-077-event-lifecycle-hotfix.sql','utf8');
const agenda=fs.readFileSync('queendom-events/app.js','utf8');
const client=fs.readFileSync('client/app.js','utf8');
const manager=fs.readFileSync('manager/events/app.js','utf8');
const acuity=fs.readFileSync('api/acuity.js','utf8');

const memberFeed=(migration.match(/create or replace function public\.flowtel_list_queendom_events[\s\S]*?grant execute on function public\.flowtel_list_queendom_events/)||[''])[0];
const publicFeed=(migration.match(/create or replace function public\.flowtel_public_queendom_events[\s\S]*?grant execute on function public\.flowtel_public_queendom_events/)||[''])[0];
assert.match(memberFeed,/e\.status='published'/,'Authenticated feed should include published events only.');
assert.doesNotMatch(memberFeed,/status in \('published','cancelled'\)/,'Authenticated feed must not keep cancelled events visible.');
assert.match(publicFeed,/e\.status='published'/,'Public feed should include published events only.');
assert.doesNotMatch(publicFeed,/status in \('published','cancelled'\)/,'Public feed must not keep cancelled events visible.');

assert.match(agenda,/setQueendomEventRegistration\(eventId,false,occurrenceId\|\|null\)/,'Agenda unclaim must preserve recurring occurrence context.');
assert.match(client,/setQueendomEventRegistration\(event\.event_id,false,occurrenceId\|\|null\)/,'My Upcoming Events unclaim must preserve recurring occurrence context.');
assert.match(acuity,/for\(const enrollment of enrollments\)\{if\(enrollment\.acuity_appointment_id\)await cancelAcuityEventAppointment/,'Flowtel must cancel linked Acuity appointments before releasing the seat.');
assert.match(manager,/row\.status==='published'\?'<button[^']*data-cancel-event[\s\S]*data-delete-event/,'Published events should Cancel; draft/cancelled events should Delete Permanently.');

console.log('Flowtel v0.10.90.2 Event Lifecycle behavior checks passed.');
