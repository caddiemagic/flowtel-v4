import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(file,'utf8');
const platformPages=[
  'flow-fm/index.html',
  'flow-fm/portal/index.html',
  'flow-fm/moons/index.html',
  'flow-fm/womb-work/index.html',
  'flow-fm/assignments/index.html',
  'flow-fm/profile-studio/index.html',
  'flow-fm/planning-room/index.html',
  'flow-fm/review/index.html',
  'flow-fm/team-map/index.html',
  'flow-fm/team-map/profile/index.html',
  'flow-fm/hourly-flow-rate/index.html',
  'flow-fm/availability/index.html',
  'flow-fm/time-space/index.html',
];
for(const file of platformPages){
  const html=await read(file);
  assert(html.includes('/flow-fm/platform.css?v=0.10.76'),`${file} is missing the shared platform stylesheet.`);
  assert(html.includes('flowfm-platform-page'),`${file} is missing the shared platform body class.`);
}

const platformCss=await read('flow-fm/platform.css');
const designCss=await read('flow-fm/design-system.css');
assert(platformCss.includes('quiet-luxury Flow FM platform shell'));
assert(platformCss.includes('--ffm-page-title'));
assert(platformCss.includes('overflow-x:auto'), 'Shared navigation is not compact and horizontally accessible.');
assert(designCss.includes('clamp(2rem,4vw,3rem)'), 'Flow FM hero scale is not restrained.');
assert(!/clamp\([^\n]*7rem/i.test(designCss), 'Massive Flow FM heading tokens returned.');

const availabilityHtml=await read('flow-fm/availability/index.html');
const availabilityJs=await read('flow-fm/availability/page.js');
const availabilityCore=await read('shared/flow-fm-availability-core.js');
const migration=await read('database/migration-061-flow-fm-platform-tools-polish.sql');
assert(availabilityHtml.includes('<h1>Availability</h1>'));
assert(availabilityJs.includes('<span>Available</span>'));
assert(!availabilityJs.includes('<span>Offline</span>'));
assert(availabilityJs.includes('weekly_days'));
assert(availabilityJs.includes('windows:[...day.querySelectorAll'), 'Closed days do not return their retained windows.');
assert(!availabilityCore.includes('const windows=available ?'), 'Availability validation still deletes windows for closed days.');
assert(migration.includes('flowtel_flow_fm_availability_day_states'));
assert(migration.includes("'weekly_days'"));
assert(migration.includes('prevents closing a day from destroying its schedule'));

const hfrHtml=await read('flow-fm/hourly-flow-rate/index.html');
const hfrJs=await read('flow-fm/hourly-flow-rate/page.js');
const hfrCore=await read('shared/hourly-flow-rate-calculations.js');
assert(!hfrHtml.includes('witnessRoom'));
assert(!hfrJs.includes('PRIVATE WITNESSING'));
assert(!hfrJs.includes('witnessForm'));
assert(hfrJs.includes('seasonRoomForm'));
assert(hfrJs.includes('data-hourly-flow-rate-result'));
assert(hfrJs.includes('roundHourlyFlowRateUp'));
assert(hfrCore.includes('Math.ceil'));
assert(hfrHtml.includes('Locations and lodging'));

const managerJs=await read('manager/app.js');
const managerHtml=await read('manager/index.html');
const teamJs=await read('manager/priestess-team/app.js');
assert(managerJs.includes('initiation.moon?.name'));
assert(!managerJs.includes('Began in ${initiation.anchorMoon'));
assert(managerHtml.includes('Go to your Room.'));
assert(managerJs.includes("go do day ${room} things"));
assert(teamJs.includes('getPriestessHourlyFlowRate'));
assert(teamJs.includes('Rounded upward whole-number result'));
assert(migration.includes('flowtel_admin_get_member_hourly_flow_rate'));
assert(migration.includes('ceil(v_raw)::integer'));
assert(!/drop table|truncate table/i.test(migration), 'Migration 061 contains destructive table SQL.');
assert.equal((migration.match(/\$\$/g)||[]).length%2,0,'Migration 061 has unmatched SQL dollar quotes.');

console.log('Flow FM v0.10.76 platform, Availability, Hourly Flow Rate, Concierge, and owner-profile validation passed.');
