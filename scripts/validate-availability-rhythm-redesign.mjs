import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(file,'utf8');
const html=await read('flow-fm/availability/index.html');
const page=await read('flow-fm/availability/page.js');
const css=await read('flow-fm/availability/styles.css');
const core=await read('shared/flow-fm-availability-core.js');
const shared=await read('shared/flow-fm-availability.js');
const migration058=await read('database/migration-058-flow-fm-initiation-readiness.sql');
const migration061=await read('database/migration-061-flow-fm-platform-tools-polish.sql');

for(const token of ['SET YOUR SEASONAL RHYTHM','availabilityOverview','availabilityEditor','page.js?v=0.10.79']) assert(html.includes(token),`Availability HTML is missing ${token}.`);
for(const token of ['Edit rhythm','Yes, I’m available','No calls this season','Which days feel available?','Choose exact times','Customize a day','Use this rhythm all year','Save My Rhythm']) assert(page.includes(token),`Availability flow is missing ${token}.`);
for(const token of ['Morning','Afternoon','Evening']) assert(core.includes(token),`Availability presets are missing ${token}.`);
for(const token of ['availability-overview','availability-season-card','rhythm-step','weekday-chips','preset-grid','custom-day-editor','rhythm-review']) assert(css.includes(token),`Availability CSS is missing ${token}.`);
for(const token of ['FLOW_FM_AVAILABILITY_PRESETS','summarizeFlowFmAvailabilityDays','formatFlowFmAvailabilityDayList','matchingFlowFmAvailabilityPreset']) assert(core.includes(token),`Availability core is missing ${token}.`);
assert(shared.includes('flowtel_availability_save_season'),'Existing availability save boundary changed unexpectedly.');
assert(migration058.includes('flowtel_flow_fm_availability_windows'),'Recurring availability storage is missing.');
assert(migration061.includes('flowtel_flow_fm_availability_day_states'),'Availability day-state preservation is missing.');
assert(page.includes('source?.windows'),'Closed days no longer preserve their retained windows.');
assert(!page.includes('availability-week')&&!page.includes('Save ${escapeHtml(season)} Availability'),'The old all-seasons weekday grid remains active.');
assert(!/drop table|truncate table/i.test(migration061),'Migration 061 contains destructive SQL.');

console.log('Flow FM v0.10.79 Availability Rhythm Redesign static validation passed.');
