import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const paths=[
  'server/acuity-server.js',
  'api/acuity.js',
  'shared/womb-magic-booking.js',
  'client/index.html',
  'client/app.js',
  'client/styles.css',
  'flow-fm/upcoming-calls/index.html',
  'flow-fm/upcoming-calls/page.js',
  'flow-fm/upcoming-calls/styles.css',
  'docs/RELEASE-0.10.82.md',
  'docs/CHANGELOG.md',
];
const files=Object.fromEntries(await Promise.all(paths.map(async path=>[path,await read(path)])));

for(const token of ['extractZoomMeetingUrl','zoom.us','zoom.com','zoomgov.com']) assert(files['server/acuity-server.js'].includes(token));
assert(files['server/acuity-server.js'].includes('Flowtel + Caddie Magic Acuity Bridge/0.10.82-0.6.0'));
for(const token of ['meeting_url:meetingUrlFor(appointment)||null','refreshMeetingPayload','external_payload','flowtel_list_my_upcoming_service_calls']) assert(files['api/acuity.js'].includes(token));
assert(files['api/acuity.js'].includes("source_product=eq.flowtel"));
assert(!files['api/acuity.js'].includes('external_payload:appointment.external_payload'));

for(const token of ['Enter Womb Magic','wm-enter-womb-magic','noopener noreferrer','Zoom room will appear here']) assert(files['shared/womb-magic-booking.js'].includes(token));
for(const token of ['Begin Womb Magic','call-launch','noopener noreferrer','Zoom room preparing']) assert(files['flow-fm/upcoming-calls/page.js'].includes(token));
assert(files['client/styles.css'].includes('Flowtel v0.10.82 — Enter Womb Magic Zoom doorway'));
assert(files['flow-fm/upcoming-calls/styles.css'].includes('Flowtel v0.10.82 — Priestess Zoom doorway'));
assert(files['client/index.html'].includes('styles.css?v=0.10.82'));
assert(files['client/index.html'].includes('app.js?v=0.10.82'));
assert(files['client/app.js'].includes('womb-magic-booking.js?v=0.10.82'));
assert(files['flow-fm/upcoming-calls/index.html'].includes('page.js?v=0.10.82'));
assert(files['docs/RELEASE-0.10.82.md'].includes('No database migration is required'));
assert(files['docs/CHANGELOG.md'].startsWith('## v0.10.82 — Enter Womb Magic'));

console.log('Flowtel v0.10.82 Enter Womb Magic static validation passed.');
