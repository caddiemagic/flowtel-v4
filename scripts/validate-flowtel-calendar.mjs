import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const paths=[
  'database/migration-067-flowtel-calendar.sql',
  'client/index.html','client/app.js','client/styles.css',
  'shared/womb-magic-booking.js','shared/queendom-events.js',
  'flow-fm/upcoming-calls/index.html','flow-fm/upcoming-calls/page.js','flow-fm/upcoming-calls/styles.css',
  'flow-fm/availability/index.html','flow-fm/availability/page.js','flow-fm/availability/styles.css',
  'manager/index.html','manager/app.js',
  'manager/availability/index.html','manager/availability/app.js',
  'manager/events/index.html','manager/events/app.js','manager/events/styles.css',
  'queendom-calendar/index.html','queendom-calendar/app.js','queendom-calendar/styles.css',
  'vercel.json','docs/RELEASE-0.10.83.md','docs/CHANGELOG.md',
];
const files=Object.fromEntries(await Promise.all(paths.map(async path=>[path,await read(path)])));
const migration=files['database/migration-067-flowtel-calendar.sql'];
const functionBody=(name)=>{
  const marker=`function public.${name}`;
  const start=migration.indexOf(marker);
  assert(start>=0,`Migration is missing ${name}.`);
  const bodyStart=migration.indexOf('as $$',start);
  const end=migration.indexOf('$$;',bodyStart+5);
  assert(bodyStart>=0&&end>bodyStart,`Could not isolate ${name}.`);
  return migration.slice(start,end+3);
};

// Womb Magic booking polish.
assert(files['client/styles.css'].includes('cohesive Womb Magic consent alignment'));
assert(files['shared/womb-magic-booking.js'].includes("label='Join Zoom'"));
assert(!files['shared/womb-magic-booking.js'].includes("label='Enter Womb Magic'"));
assert(files['flow-fm/upcoming-calls/page.js'].includes('Begin Womb Magic'));

// Owner keeps the full Upcoming Calls calendar; ordinary Priestesses remain scoped.
const callsFn=functionBody('flowtel_list_my_upcoming_service_calls');
assert(callsFn.includes('provider_name text'));
assert(callsFn.includes('and (v_owner or provider.user_id = v_user_id)'));
assert(files['flow-fm/upcoming-calls/page.js'].includes('Held by'));

// Cycle-aware monthly Availability foundation and Acuity owner queue.
for(const table of [
  'flowtel_flow_fm_availability_months',
  'flowtel_flow_fm_availability_month_days',
  'flowtel_flow_fm_availability_month_windows',
]) assert(migration.includes(`public.${table}`),`Missing ${table}.`);
for(const rpc of [
  'flowtel_availability_month_load',
  'flowtel_availability_month_save_day',
  'flowtel_availability_month_submit',
  'flowtel_admin_list_availability_month_updates',
  'flowtel_admin_acknowledge_availability_month',
]) assert(migration.includes(`public.${rpc}`),`Missing ${rpc}.`);
for(const mapping of [
  "v_cycle_day<=5 or v_cycle_day>=27 then 'Inner Winter'",
  "v_cycle_day between 6 and 11 then 'Inner Spring'",
  "v_cycle_day between 12 and 19 then 'Inner Summer'",
  "else 'Inner Autumn'",
]) assert(migration.includes(mapping),`Missing cycle projection mapping: ${mapping}`);
assert(functionBody('flowtel_availability_month_save_day').includes("owner_acknowledged_at=case when first_submitted_at is not null then null"));
assert(files['flow-fm/availability/index.html'].includes('Your calendar, mapped to your cycle'));
assert(files['flow-fm/availability/page.js'].includes('Use ${escapeHtml(day.projected_inner_season'));
assert(files['manager/availability/index.html'].includes('ACUITY UPDATE QUEUE'));
assert(files['manager/availability/app.js'].includes('Mark Updated in Acuity'));

// Queendom Events: one source, audience-aware registration, protected Zoom.
for(const table of ['flowtel_queendom_events','flowtel_queendom_event_registrations']) assert(migration.includes(`public.${table}`));
for(const rpc of [
  'flowtel_list_queendom_events',
  'flowtel_public_queendom_events',
  'flowtel_set_queendom_event_registration',
  'flowtel_get_queendom_event_join_details',
  'flowtel_admin_list_queendom_events',
  'flowtel_admin_save_queendom_event',
  'flowtel_admin_cancel_queendom_event',
]) assert(migration.includes(`public.${rpc}`),`Missing event RPC: ${rpc}`);
const memberFeed=functionBody('flowtel_list_queendom_events');
assert(memberFeed.includes("case when e.audience='flowfm' then 2 else 1 end"));
assert(memberFeed.includes("'can_join'"));
assert(memberFeed.includes("'zoom_ready'"));
assert(!memberFeed.includes("'zoom_url'"),'Member event feed must not return Zoom URL.');
assert(!memberFeed.includes("'zoom_passcode'"),'Member event feed must not return Zoom passcode.');
const publicFeed=functionBody('flowtel_public_queendom_events');
assert(!publicFeed.includes('flowtel_queendom_event_registrations'),'Public embed must not expose registration state.');
assert(!publicFeed.includes("'zoom_url'"),'Public embed must not return Zoom URL.');
assert(!publicFeed.includes("'zoom_passcode'"),'Public embed must not return Zoom passcode.');
const joinFn=functionBody('flowtel_get_queendom_event_join_details');
assert(joinFn.includes("case when v_event.audience='flowfm' then 2 else 1 end"));
assert(joinFn.includes("'zoom_url',v_event.zoom_url"));
assert(joinFn.includes("'zoom_passcode',v_event.zoom_passcode"));
assert(!joinFn.includes('flowtel_queendom_event_registrations'),'Registration must not be required for eligible members to join.');
assert(functionBody('flowtel_admin_save_queendom_event').includes('Cancelled events stay in history and cannot be republished'));

// Member/Lounge calendar and owner creation desk.
for(const token of ['UPCOMING EVENTS IN THE QUEENDOM','MY UPCOMING EVENTS']) assert(files['client/index.html'].includes(token),`Lounge is missing ${token}.`);
for(const token of ['SAVE MY SEAT','JOIN ZOOM','FLOW FM MEMBERS ONLY','loadWombMagicScheduling']) assert(files['client/app.js'].includes(token),`Lounge calendar is missing ${token}.`);
for(const token of ['Event name','Audience','Zoom link','Zoom passcode','Calendar artwork']) assert(files['manager/events/index.html'].includes(token),`Event admin is missing ${token}.`);
assert(files['manager/events/app.js'].includes('uploadQueendomEventImage'));
assert(files['manager/events/app.js'].includes('Cancelled events stay in history'));
for(const token of ['calendar-grid','calendar-event-image','is-embed']) assert(files['queendom-calendar/styles.css'].includes(token),`Queendom Calendar styling is missing ${token}.`);
assert(files['queendom-calendar/app.js'].includes("new URLSearchParams(location.search).get('embed')==='1'"));
assert(files['queendom-calendar/app.js'].includes('listPublicQueendomEvents'));
assert(files['queendom-calendar/app.js'].includes('getQueendomEventJoinDetails'));

// Routes and release wiring.
const vercel=JSON.parse(files['vercel.json']);
const rewrites=new Set((vercel.rewrites||[]).map(item=>item.source));
for(const route of ['/manager/events','/queendom-calendar']) assert(rewrites.has(route),`Missing Vercel rewrite: ${route}`);
assert(files['manager/index.html'].includes('/manager/events/'));
assert(/app\.js\?v=0\.10\.(?:83(?:\.\d+)?|8[4-9]|\d{3,})/.test(files['client/index.html']));
assert(files['flow-fm/availability/index.html'].includes('page.js?v=0.10.83'));
assert(files['flow-fm/upcoming-calls/index.html'].includes('page.js?v=0.10.83'));
assert(files['docs/CHANGELOG.md'].includes('## v0.10.83 — The Flowtel Calendar'));
assert(files['docs/RELEASE-0.10.83.md'].includes('migration-067-flowtel-calendar.sql'));

// Migration integrity basics.
assert(migration.trimStart().startsWith('-- Flowtel v0.10.83'));
assert.equal((migration.match(/\bbegin;/g)||[]).length,1,'Migration should have one top-level BEGIN.');
assert.equal((migration.match(/\bcommit;/g)||[]).length,1,'Migration should have one COMMIT.');
assert.equal((migration.match(/\$\$/g)||[]).length%2,0,'Migration dollar quotes are unbalanced.');

console.log('Flowtel v0.10.83 Flowtel Calendar static validation passed.');
