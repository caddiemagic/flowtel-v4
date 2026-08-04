import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/acuity.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../database/migration-064-acuity-womb-magic-scheduling.sql',import.meta.url),'utf8');
const suite=fs.readFileSync(new URL('../client/index.html',import.meta.url),'utf8');
const booking=fs.readFileSync(new URL('../shared/womb-magic-booking.js',import.meta.url),'utf8');
const nav=fs.readFileSync(new URL('../flow-fm/ui.js',import.meta.url),'utf8');
const redirect=fs.readFileSync(new URL('../flow-fm/womb-magic/page.js',import.meta.url),'utf8');
const calls=fs.readFileSync(new URL('../flow-fm/upcoming-calls/page.js',import.meta.url),'utf8');
const manager=fs.readFileSync(new URL('../manager/app.js',import.meta.url),'utf8');
const managerHtml=fs.readFileSync(new URL('../manager/index.html',import.meta.url),'utf8');

assert.match(api,/case 'book'/);
assert.match(api,/case 'reschedule'/);
assert.match(api,/case 'cancel'/);
assert.match(api,/WOMB_MAGIC_CONSENT_LANGUAGE/);
assert.match(api,/listed_timezone/);
assert.match(migration,/flowtel_appointment_access_grants/);
assert.match(migration,/flowtel_can_view_cycle_subject/);
assert.match(migration,/access_days_after/);

assert.match(suite,/data-wm-panel/);
assert.match(suite,/COMPLIMENTARY MENTOR CALL/);
assert.doesNotMatch(suite,/href="\/flow-fm\/womb-magic\//);
assert.match(booking,/Consent \+ Book My Call/);
assert.match(booking,/wm-mentor-card/);
assert.doesNotMatch(booking,/provider\.bio/);
assert.doesNotMatch(nav,/label: 'Womb Magic'/);
assert.match(redirect,/\/client\/\?suite=1&wombMagic=1/);

assert.match(calls,/This Week/);
assert.match(calls,/Next Week/);
assert.match(calls,/Later/);
assert.match(calls,/timezoneDisplayName/);
assert.match(calls,/Access closes/);
assert.match(manager,/loadUpcomingServiceCallCount/);
assert.match(managerHtml,/id="upcomingCallsCount">0/);

console.log('Acuity Womb Magic behavior checks passed.');
