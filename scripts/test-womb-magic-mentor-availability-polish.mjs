import assert from 'node:assert/strict';
import fs from 'node:fs';

const suite=fs.readFileSync(new URL('../client/index.html',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../client/styles.css',import.meta.url),'utf8');
const booking=fs.readFileSync(new URL('../shared/womb-magic-booking.js',import.meta.url),'utf8');
const relationships=fs.readFileSync(new URL('../shared/relationships.js',import.meta.url),'utf8');
const powderApp=fs.readFileSync(new URL('../cycle-data/app.js',import.meta.url),'utf8');
const powderStyles=fs.readFileSync(new URL('../cycle-data/styles.css',import.meta.url),'utf8');
const manager=fs.readFileSync(new URL('../manager/app.js',import.meta.url),'utf8');
const managerHtml=fs.readFileSync(new URL('../manager/index.html',import.meta.url),'utf8');
const ownerAvailability=fs.readFileSync(new URL('../manager/availability/app.js',import.meta.url),'utf8');
const ownerAvailabilityHtml=fs.readFileSync(new URL('../manager/availability/index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../database/migration-065-mentor-directory-owner-availability.sql',import.meta.url),'utf8');

assert.match(suite,/womb-magic-suite-action/);
assert.doesNotMatch(suite,/data-wm-load-dates|See Available Dates/);
assert.match(styles,/\.womb-magic-suite-action[\s\S]*width:100%/);
assert.match(booking,/monthInput\?\.addEventListener\('change'/);
assert.match(booking,/firstAvailableButton\?\.addEventListener\('click',async/);
assert.match(booking,/await loadDates\(\)/);
assert.match(booking,/data-wm-date-detail/);
assert.match(booking,/data-wm-consent-host/);
assert.match(booking,/Available times for/);
assert.match(styles,/\.wm-date-option/);
assert.match(styles,/\.wm-mentor-copy strong[\s\S]*font-weight:400/);

assert.match(relationships,/flowtel_list_available_mentors/);
assert.doesNotMatch(relationships,/PHASE_1_RESTRICT_MENTORS_TO_ADMIN_OWNER/);
assert.match(migration,/concierge_access_enabled/);
assert.match(migration,/flow_fm_effective_membership_rank/);
assert.match(migration,/mentor_accepting_clients/);

assert.match(powderApp,/layoutPowderRoomNotes/);
assert.match(powderApp,/data-powder-note/);
assert.match(powderStyles,/grid-auto-flow:dense/);
assert.match(powderStyles,/grid-auto-rows:8px/);

assert.match(managerHtml,/href="\/manager\/availability\/"/);
assert.match(manager,/loadFlowFmAvailabilityCount/);
assert.match(ownerAvailability,/Available Now/);
assert.match(ownerAvailability,/day_states/);
assert.match(ownerAvailability,/dayStateFor/);
assert.match(ownerAvailabilityHtml,/Incomplete Rhythms/);
assert.match(ownerAvailabilityHtml,/Recently Updated/);
assert.match(migration,/flowtel_flow_fm_availability_season_status/);
assert.match(migration,/flowtel_admin_list_flow_fm_availability/);
assert.match(migration,/flowtel_flow_fm_availability_day_states/);
assert.match(migration,/'day_states'/);
assert.match(migration,/closing a day does not erase/);
assert.doesNotMatch(migration,/drop table|truncate table/i);

console.log('Flowtel v0.10.81.2 behavior checks passed.');
