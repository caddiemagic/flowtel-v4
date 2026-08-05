import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const files = Object.fromEntries(await Promise.all([
  'client/styles.css',
  'manager/availability/index.html',
  'manager/availability/app.js',
  'manager/availability/styles.css',
  'flow-fm/profile-studio/index.html',
  'flow-fm/profile-studio/page.js',
  'shared/priestess-profile-options.js',
  'caddie-magic/index.html',
  'caddie-magic/app.js',
  'caddie-magic/styles.css',
  'caddie-magic/caddie-desk/index.html',
  'caddie-magic/caddie-desk/app.js',
  'shared/caddie-magic-booking.js',
  'shared/caddie-magic-network.js',
  'api/caddie-acuity.js',
  'api/acuity-webhook.js',
  'server/acuity-server.js',
  'manager/caddie-scheduling/index.html',
  'manager/caddie-scheduling/app.js',
  'vercel.json',
  'database/migration-066-priestess-title-caddie-acuity-scheduling.sql',
  'docs/RELEASE-0.10.81.3.md',
  'docs/RELEASE-CADDIE-MAGIC-0.6.0.md',
].map(async (path) => [path, await read(path)])));

for (const id of ['#saveReflectionButton', '#choosePractitionerButton', '.womb-magic-suite-action']) assert(files['client/styles.css'].includes(id));
assert(files['client/styles.css'].includes('background:var(--blush-2)!important'));
assert(files['client/styles.css'].includes('.womb-magic-suite-card::after'));

assert(files['manager/availability/index.html'].includes('exact days, hours, timezone'));
assert(files['manager/availability/styles.css'].includes('#fbf7f1'));
assert(!files['manager/availability/styles.css'].includes('background:#071722'));
for (const token of ['FLOW_FM_WEEKDAYS', 'formatFlowFmAvailabilityTime', 'timezoneDisplayName', 'availability-day-list']) assert(files['manager/availability/app.js'].includes(token));

for (const token of ['siren-priestess', 'Siren Priestess', 'Voice Activation', 'Magnetic Expression Mentorship']) assert(files['shared/priestess-profile-options.js'].includes(token));
for (const token of ['name="published_title"', 'Choose a Guiding Archetype', 'Your Published Title', 'frameworkLanguage: `Profile Studio selections: title=']) assert(files['flow-fm/profile-studio/page.js'].includes(token));
assert(files['flow-fm/profile-studio/index.html'].includes('page.js?v=0.10.81.3'));

assert(files['caddie-magic/index.html'].includes('caddieMagicBookingRoot'));
assert(files['caddie-magic/app.js'].includes('mountCaddieMagicBooking'));
for (const token of ['caddie_master_session', 'paired_caddie_session', "case'reschedule'", 'acceptedRequest(context)', "source_product:'caddie_magic'"]) assert(files['api/caddie-acuity.js'].includes(token));
for (const token of ['Book This Session', 'Reschedule This Session']) assert(files['shared/caddie-magic-booking.js'].includes(token));
assert(files['shared/caddie-magic-booking.js'].includes("api('cancel'"));
assert(files['shared/caddie-magic-booking.js'].includes("api('reschedule'"));

assert(files['api/acuity-webhook.js'].includes("local.source_product==='caddie_magic'"));
assert(files['api/acuity-webhook.js'].includes("'caddie_magic_appointment_access_grants'"));
assert(files['server/acuity-server.js'].includes('requireCaddieMagicPlayer'));
assert(files['server/acuity-server.js'].includes('requireCaddieMagicOwner'));
assert(files['server/acuity-server.js'].includes('Flowtel + Caddie Magic Acuity Bridge/0.10.81.3-0.6.0'));

for (const token of ['acuitySessionsDeskCard', 'Acuity Scheduling Is Live']) assert(files['caddie-magic/caddie-desk/index.html'].includes(token));
for (const token of ['listMyUpcomingCaddieSessions', 'getCaddieAppointmentSnapshot', 'openAppointmentSnapshot']) assert(files['caddie-magic/caddie-desk/app.js'].includes(token));
for (const token of ['caddie_magic_list_my_upcoming_sessions', 'caddie_magic_get_appointment_snapshot']) assert(files['shared/caddie-magic-network.js'].includes(token));

assert(files['manager/caddie-scheduling/index.html'].includes('upcomingSetup'));
assert(files['manager/caddie-scheduling/app.js'].includes('upcoming_sessions'));
const vercel = JSON.parse(files['vercel.json']);
assert(vercel.rewrites.some((item) => item.source === '/manager/caddie-scheduling'));
assert(vercel.headers.filter((item) => item.source.startsWith('/caddie-magic')).every((item) => item.headers.some((header) => header.key === 'X-Caddie-Magic-Version' && header.value === '0.6.0')));

const migration = files['database/migration-066-priestess-title-caddie-acuity-scheduling.sql'];
for (const token of ['caddie_master', 'payment_mode', 'caddie_magic_appointment_access_grants', 'caddie_magic_has_active_appointment_access', 'caddie_magic_list_my_upcoming_sessions', 'caddie_magic_get_appointment_snapshot']) assert(migration.includes(token));
assert(!/\b(delete\s+from|truncate\s+table|drop\s+table)\b/i.test(migration));
assert(migration.includes("notify pgrst, 'reload schema'"));
assert(files['docs/RELEASE-0.10.81.3.md'].includes('Siren Priestess'));
assert(files['docs/RELEASE-CADDIE-MAGIC-0.6.0.md'].includes('Acuity `changed` webhook is reused'));

console.log('Flowtel v0.10.81.3 and Caddie Magic v0.6.0 static validation passed.');
