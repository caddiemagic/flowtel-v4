import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const failures=[];
const expect=(ok,msg)=>{if(!ok)failures.push(msg);};

const migration=read('database/migration-076-cyclical-calendar-event-operations.sql');
const acuity=read('api/acuity.js');
const webhook=read('api/acuity-webhook.js');
const ticket=read('api/event-ticket-verify.js');
const shared=read('shared/queendom-events.js');
const moon=read('shared/moon.js');
const manager=read('manager/events/app.js');
const managerHtml=read('manager/events/index.html');
const agenda=read('queendom-events/app.js');
const agendaCss=read('queendom-events/styles.css');
const calendar=read('queendom-calendar/app.js');
const client=read('client/app.js');
const clientHtml=read('client/index.html');

expect(migration.includes('-- Migration 076'), 'Migration 076 marker is missing.');
expect(migration.includes("event_format in ('single','recurring','series')"), 'Migration 076 must support single, recurring, and series event formats.');
for(const table of ['flowtel_queendom_event_occurrence_registrations','flowtel_queendom_event_attendance']){
  expect(migration.includes(`create table if not exists public.${table}`), `Migration 076 is missing ${table}.`);
  expect(migration.includes(`revoke all on table public.${table} from anon,authenticated`), `${table} must remain RPC/server-only.`);
}
for(const rpc of ['flowtel_admin_configure_queendom_event_operations','flowtel_get_queendom_event_booking_context','flowtel_confirm_queendom_event_registration','flowtel_enter_queendom_event','flowtel_get_queendom_event_flow_map']){
  expect(migration.includes(`function public.${rpc}`), `Migration 076 is missing ${rpc}.`);
}
expect(migration.includes("timezone('America/Los_Angeles',now())"), 'Event attendance must use Flowtel Time for same-day check-in.');
expect(migration.includes("'requires_checkin',true"), 'Protected entry must require a current Flowtel check-in for members.');
expect(migration.includes("cycle_source in ('stay','event_pass')"), 'Attendance must distinguish member Stay context from limited Event Pass cycle context.');
const attendanceBlock=(migration.match(/create table if not exists public\.flowtel_queendom_event_attendance \([\s\S]*?\n\);/)||[''])[0];
expect(attendanceBlock && !/reflection|moonbox|cosmology|journal|checkout_notes/i.test(attendanceBlock), 'Event attendance table must not copy private reflection/Moon Mail/Personal Cosmology data.');
expect((migration.match(/\$\$/g)||[]).length%2===0, 'Migration 076 dollar quotes are unbalanced.');
expect(migration.trim().endsWith('commit;'), 'Migration 076 must commit explicitly.');

expect(acuity.includes("case 'event-operations-owner-setup'"), 'Existing /api/acuity is missing owner event-operations setup action.');
expect(acuity.includes("case 'event-schedule-preview'"), 'Existing /api/acuity is missing Acuity schedule preview/import action.');
expect(acuity.includes("case 'event-enroll'"), 'Existing /api/acuity is missing unified event enrollment action.');
expect(acuity.includes("acuityFetch('/availability/classes'"), 'Acuity class availability must be used for linked event schedules/bookings.');
expect(acuity.includes('includeUnavailable:true'), 'Acuity import must include unavailable/full offerings so recurring schedule dates do not disappear.');
expect(acuity.includes("acuityFetch('/appointments',{method:'POST'"), 'Linked member registration must create the Acuity appointment before Flowtel confirms the seat.');
expect(acuity.includes('findExistingEventAppointment'), 'Linked registration must search for an existing Acuity appointment before POSTing to remain idempotent.');
expect(!acuity.includes('noEmail:true') && !acuity.includes("'noEmail':true"), 'Linked events must not suppress configured Acuity confirmation/reminder emails.');
expect(webhook.includes('flowtel_queendom_event_occurrence_enrollments'), 'Existing Acuity webhook must keep linked event appointment state synchronized.');
expect(ticket.includes('flowtel_queendom_event_occurrence_registrations'), 'Refund/revocation must also close recurring occurrence registrations.');

expect(shared.includes('configureQueendomEventOperationsAdmin'), 'Shared events client is missing generic event-operations configuration.');
expect(shared.includes("event-enroll"), 'Shared event registration must route through Acuity event enrollment.');
expect(shared.includes('enterQueendomEvent') && shared.includes('getQueendomEventFlowMap'), 'Shared event client is missing protected entry/flow-map RPCs.');

expect(managerHtml.includes('Recurring Event — each date stands alone'), 'Owner Event Manager is missing recurring-event mode.');
expect(managerHtml.includes('IMPORT / REFRESH ACUITY SCHEDULE'), 'Owner Event Manager is missing Acuity import/refresh control.');
expect(managerHtml.includes('ACUITY EMAIL DOORWAY'), 'Owner Event Manager is missing the universal Flowtel email doorway.');
expect(manager.includes('loadQueendomEventAcuityScheduleAdmin'), 'Owner Event Manager is not wired to Acuity schedule import.');
expect(manager.includes("fields.format.value=importedOccurrences.length>1?'recurring':'single'"), 'Independent repeated Acuity classes must import as recurring rather than series.');
expect(manager.includes('renderMoonContext'), 'Owner Event Manager must show event lunar context automatically.');

expect(moon.includes('getMoonPhaseMarker'), 'Canonical moon helper is missing calendar phase markers.');
for(const label of ['NEW MOON','HALF FULL MOON','FULL MOON','HALF NEW MOON']) expect(moon.includes(label), `Moon marker ${label} is missing.`);
expect(calendar.includes('getMoonPhaseMarker') && calendar.includes('calendar-moon-marker'), 'Month calendar must render automatic Moon phase markers.');
expect(calendar.includes('listPublicQueendomEvents'), 'Calendar must remain publicly browsable.');
expect(calendar.includes('JOIN THE QUEENDOM TO CLAIM YOUR SEAT'), 'Public Queendom-only events must route non-members to the Queendom doorway.');
expect(calendar.includes('Authenticated calendar feed unavailable') || calendar.includes('signed-in limited identity'), 'Signed-in rank-0/Event Pass identities must be able to fall back to the public calendar.');

for(const label of ['NORTH · INNER AUTUMN','EAST · INNER SUMMER','WEST · INNER WINTER','SOUTH · INNER SPRING']) expect(agenda.includes(label), `Event Flow Map chamber ${label} is missing.`);
expect(agenda.includes('CLAIMED SEATS') && agenda.includes('IN THE ROOM'), 'Event host view must distinguish claimed seats from actual entrants.');
expect(agenda.includes('OPEN HOST FLOW MAP') && agenda.includes('data-refresh-flow-map'), 'Hosts/co-hosts/Owner must be able to open and refresh the Event Flow Map without consuming an attendee seat.');
expect(migration.includes('not v_registered and not v_can_map'), 'Host/co-host/Owner Event Flow Map access must not require an attendee registration.');
expect(agenda.includes('When you enter this gathering, your current Cycle Day and Inner Season are shared with the event host'), 'Event cycle-context disclosure is missing.');
expect(agenda.includes('nextRegisteredOccurrence'), 'Universal Acuity reminder doorway must choose a registered recurring occurrence, not an unclaimed one.');
expect(agenda.includes('activeAccessOccurrenceId'), 'Authentication/Event Pass flow must preserve the selected recurring occurrence.');
expect(agendaCss.includes('.event-flow-chambers') && agendaCss.includes('grid-template-columns:1fr 1fr'), 'Event Flow Map must use the requested four-chamber layout.');

expect(/import\("\.\.\/shared\/queendom-events\.js\?v=0\.10\.90(?:\.\d+)?"\)/.test(client), 'Login isolation must remain folded into current v0.10.90.x via dynamic event-module import.');
expect(!/import\s*\{[^}]*QueendomEvent[^}]*\}\s*from\s*["']\.\.\/shared\/queendom-events\.js/.test(client), 'Client auth bundle must not statically depend on Queendom Events.');
expect(/\.\/app\.js\?v=0\.10\.(?:90(?:\.\d+)?|91(?:\.\d+)?)/.test(clientHtml), 'Client app cache key must remain on the current Flowtel event-capable bundle.');

const apiCount=fs.readdirSync(path.join(root,'api')).filter(name=>name.endsWith('.js')).length;
expect(apiCount===12, `Vercel API function count is ${apiCount}; expected 12/12.`);
expect(!fs.existsSync(path.join(root,'api','event-operations.js')), 'v0.10.90 must not add a 13th Event Operations function.');

if(failures.length){
  console.error(`Flowtel v0.10.90 Cyclical Calendar + Event Operations validation failed (${failures.length}):`);
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
console.log('Flowtel v0.10.90 Cyclical Calendar + Event Operations validation OK.');
