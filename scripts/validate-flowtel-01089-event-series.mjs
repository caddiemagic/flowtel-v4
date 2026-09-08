import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};

const migration=read('database/migration-075-queendom-multi-session-event-series.sql');
const shared=read('shared/queendom-events.js');
const acuity=read('api/acuity.js');
const webhook=read('api/acuity-webhook.js');
const manager=read('manager/events/app.js');
const managerHtml=read('manager/events/index.html');
const client=read('client/app.js');
const agenda=read('queendom-events/app.js');
const calendar=read('queendom-calendar/app.js');

expect(migration.includes('-- Migration 075'), 'Migration 075 release marker is missing.');
for(const field of ['event_format','series_count','series_interval_days','acuity_appointment_type_id','acuity_calendar_id']){
  expect(migration.includes(`add column if not exists ${field}`), `Migration 075 is missing parent event field ${field}.`);
}
for(const table of ['flowtel_queendom_event_occurrences','flowtel_queendom_event_series_enrollments','flowtel_queendom_event_occurrence_enrollments']){
  expect(migration.includes(`create table if not exists public.${table}`), `Migration 075 is missing ${table}.`);
  expect(migration.includes(`revoke all on table public.${table} from anon,authenticated`), `${table} must remain RPC/server-only.`);
}
expect(migration.includes('flowtel_admin_configure_queendom_event_series'), 'Admin series configuration RPC is missing.');
expect(migration.includes('flowtel_get_queendom_event_series_booking_context'), 'Protected series booking-context RPC is missing.');
expect(migration.includes("v_event.event_format='series'"), 'Series checks are missing from the migration.');
expect(migration.includes('flowtel_queendom_event_access_state(p_event_id,v_member)'), 'Series booking must reuse the canonical event entitlement boundary.');
expect(migration.includes('flowtel_queendom_event_registrations') && migration.includes('cancelled_at is null'), 'Series booking must require the existing active Flowtel registration.');
expect(migration.includes("Message the Front Desk if you need to leave the vortex"), 'Acuity-enrolled series must not be browser-unsaved independently of the Acuity seat.');
expect(migration.includes('Cancel the enrolled class series in Acuity first'), 'Flowtel series cancellation must guard against leaving Acuity reminders active.');
expect(migration.includes("case when v_event.event_format='single' then v_event.zoom_url else null end"), 'Series must not expose the parent Zoom URL as a generic top-level room URL.');
expect(migration.includes("oe.member_id=v_member"), 'Protected series meeting URLs must be scoped to the authenticated member.');
expect(!migration.includes('grant select on public.flowtel_queendom_event_occurrence_enrollments'), 'Protected series enrollment rows must not gain direct SELECT grants.');
expect((migration.match(/\$\$/g)||[]).length%2===0, 'Migration 075 dollar quotes are unbalanced.');
expect(migration.trim().endsWith('commit;'), 'Migration 075 must commit explicitly.');

expect(shared.includes('ensureQueendomEventSeriesEnrollment') && shared.includes("event-series-enroll"), 'Shared event client is missing series enrollment orchestration.');
expect(shared.includes('configureQueendomEventSeriesAdmin') && shared.includes('flowtel_admin_configure_queendom_event_series'), 'Shared event admin is missing series configuration.');
expect(shared.includes('setQueendomEventRegistration') && shared.includes('result.series_enrollment'), 'One Flowtel registration must trigger series enrollment rather than a second registration system.');

expect(acuity.includes("case 'event-series-owner-setup'"), 'Existing /api/acuity function is missing owner series setup action.');
expect(acuity.includes("case 'event-series-enroll'"), 'Existing /api/acuity function is missing member series enrollment action.');
expect(acuity.includes("acuityFetch('/availability/classes'"), 'Acuity class-series enrollment must validate the mapped class offering before booking.');
expect(acuity.includes("String(type.type||'').toLowerCase()!=='series'"), 'Acuity appointment type must be verified as a true series.');
expect(acuity.includes('acuityAppointmentsForSeries') && acuity.includes('only POST when there is no evidence'), 'Series booking must search Acuity before POSTing to prevent duplicate enrollment after a lost response.');
expect(acuity.includes("acuityFetch('/appointments',{method:'POST'"), 'Series enrollment must book through the existing Acuity server boundary.');
expect(!acuity.includes("noEmail:true") && !acuity.includes("'noEmail':true") && !acuity.includes('noEmail=true'), 'Series enrollment must not suppress configured Acuity confirmation/reminder emails.');
expect(acuity.includes("status:'failed'") && acuity.includes('Acuity could not enroll this series'), 'A confirmed Acuity booking failure must not leave a permanently pending local lock.');
expect(acuity.includes('extractZoomMeetingUrl(best)'), 'Per-session Zoom doorway must come from the Acuity appointment payload.');
expect(webhook.includes('flowtel_queendom_event_occurrence_enrollments') && webhook.includes('queendom_event_series'), 'Existing Acuity webhook must synchronize event-series occurrences.');
expect(webhook.includes('normalizeEmail') && webhook.includes('profiles.find'), 'Webhook association must match a registered Flowtel member by exact normalized email.');

expect(managerHtml.includes('Multi-Session Series') && managerHtml.includes('Acuity group series') && managerHtml.includes('Days between sessions'), 'Owner Event Manager is missing the series setup controls.');
expect(manager.includes('loadQueendomEventSeriesAcuitySetupAdmin') && manager.includes('configureQueendomEventSeriesAdmin'), 'Owner Event Manager is not wired to Acuity series mapping.');
expect(manager.includes('stageAsDraft'), 'New published series must be staged safely before the recurrence layer is configured.');

for(const [name,text] of [['client/app.js',client],['queendom-events/app.js',agenda],['queendom-calendar/app.js',calendar]]){
  expect(text.includes('ensureQueendomEventSeriesEnrollment'), `${name} must synchronize Acuity when a registered series room opens.`);
  expect(text.includes('event_format') && text.includes('series'), `${name} is missing multi-session rendering.`);
}
expect(client.includes('APPLE / OUTLOOK · ALL SESSIONS'), 'My Upcoming Events must export all series sessions to ICS.');
expect(client.includes('JOIN ZOOM · SESSION'), 'My Upcoming Events must launch the current protected session doorway.');
expect(client.includes('loungeEventIsFuture'), 'My Upcoming Events must keep the parent vortex visible through the final session.');
expect(agenda.includes('4-WEEK VORTEX') && agenda.includes('seriesRoomMarkup'), 'Queendom agenda must present the series as one vortex with a session itinerary.');
expect(calendar.includes('SESSION') && calendar.includes('4-WEEK VORTEX') && calendar.includes('data-save-seat'), 'Month calendar must surface each session while preserving one parent registration.');

expect(!fs.existsSync(path.join(root,'api','event-series.js')), 'v0.10.89 must not add a 13th event-series serverless function.');
const apiCount=fs.readdirSync(path.join(root,'api')).filter(name=>name.endsWith('.js')).length;
expect(apiCount===12, `Vercel API function count changed to ${apiCount}; expected 12/12.`);
expect(!acuity.includes('womb_magic_portal_id') || fs.existsSync(path.join(root,'api','womb-magic-portal.js')), 'The group event series must remain separate from the private 4-Week Womb Magic Portal.');

if(failures.length){
  console.error(`Flowtel v0.10.89 Event Series validation failed (${failures.length}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Flowtel v0.10.89 Multi-Session Event Series + Acuity Group Enrollment validation OK.');
