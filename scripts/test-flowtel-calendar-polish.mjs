import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=(file)=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const clientHtml=read('client/index.html');
const clientCss=read('client/styles.css');
const clientJs=read('client/app.js');
const eventsHtml=read('manager/events/index.html');
const eventsJs=read('manager/events/app.js');
const shared=read('shared/queendom-events.js');
const calendar=read('queendom-calendar/app.js');
const migration=read('database/migration-068-flowtel-calendar-polish.sql');

assert(!clientHtml.includes('Everyone can see what is happening; membership protects the rooms themselves.'),'Removed Lounge sentence returned.');
assert(clientCss.includes('.lounge-events-card{width:100%;max-width:760px;margin:22px auto'),'Lounge event cards are not aligned to the existing 760px Lounge width.');
assert(eventsHtml.includes('Pacific Time — Pacific Standard / Daylight Time'),'Timezone selector is not using human-readable names.');
assert(eventsHtml.includes('<select id="eventHost">'),'Event host is not a dropdown.');
assert(!eventsHtml.includes('<input id="eventHost"'),'Free-text host input returned.');
assert(eventsJs.includes('loadQueendomEventHostsAdmin'),'Event editor is not loading Flow FM host members.');
assert(eventsJs.includes('host_member_id:fields.host.value||null'),'Event editor is not saving the linked host member.');
assert(eventsJs.indexOf('await saveQueendomEventAdmin(values);') < eventsJs.indexOf('await uploadQueendomEventImage(id'),'Event must save before optional artwork upload.');
assert(shared.includes("p_host_member_id:payload.host_member_id||null"),'Host member is not sent to the admin save RPC.');
assert(shared.includes('Event artwork storage is not installed yet'),'Bucket-not-found error is not translated.');
assert(shared.includes('The Flowtel Calendar database setup is not complete yet'),'Schema-cache setup error is not translated.');
assert(clientJs.includes('timezoneDisplayName'),'Lounge event timezone is not humanized.');
assert(clientJs.includes('/flow-fm/team-map/profile/?member='),'Lounge host does not link to the Priestess profile.');
assert(calendar.includes('/flow-fm/team-map/profile/?member='),'Calendar host does not link to the Priestess profile.');
assert(migration.includes("'flowtel-queendom-event-images'"),'Migration 068 does not repair the event artwork bucket.');
assert(migration.includes('add column if not exists host_member_id'),'Migration 068 does not add the host link.');
assert(migration.includes('flowtel_admin_list_queendom_event_hosts'),'Migration 068 does not add the host directory RPC.');
assert(migration.includes("notify pgrst, 'reload schema'"),'Migration 068 does not refresh PostgREST schema cache.');

console.log('Flowtel v0.10.83.1 calendar polish tests passed.');
