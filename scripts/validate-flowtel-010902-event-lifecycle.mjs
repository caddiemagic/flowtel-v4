import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const migration=read('database/migration-077-event-lifecycle-hotfix.sql');
const acuity=read('api/acuity.js');
const shared=read('shared/queendom-events.js');
const agenda=read('queendom-events/app.js');
const agendaCss=read('queendom-events/styles.css');
const client=read('client/app.js');
const manager=read('manager/events/app.js');
const managerHtml=read('manager/events/index.html');
const failures=[];
const expect=(ok,msg)=>{if(!ok)failures.push(msg);};

expect(migration.includes('Flowtel v0.10.90.2 — Event Lifecycle Hotfix'),'Migration 077 release marker missing.');
expect(migration.includes("e.status='published'"),'Member/public event feeds must exclude cancelled events.');
expect(migration.includes('flowtel_cancel_queendom_event_registration'),'Migration 077 must add member registration cancellation RPC.');
expect(migration.includes('flowtel_admin_delete_queendom_event'),'Migration 077 must add permanent admin delete RPC.');
expect(migration.includes("if v_event.status='published'"),'Permanent delete must require published events to be cancelled first.');
expect(migration.includes("oe.status in ('pending','scheduled','rescheduled')"),'Permanent delete must refuse active Acuity appointment mappings.');
expect(migration.includes('delete from public.flowtel_queendom_events where id=p_event_id'),'Permanent delete must use the parent event cascade boundary.');
expect(migration.trim().endsWith('commit;'),'Migration 077 must commit explicitly.');

expect(shared.includes("acuityEventApi('event-unclaim'"),'Member unclaim must route through the existing Acuity server boundary.');
expect(shared.includes('deleteQueendomEventAdmin'),'Shared event client must expose Owner/Admin permanent delete.');
expect(acuity.includes("case 'event-unclaim'"),'Existing /api/acuity function must expose event-unclaim without adding another function.');
expect(acuity.includes('/cancel`')||acuity.includes('/cancel'), 'Acuity-linked unclaim must cancel the real Acuity appointment.');
expect(acuity.includes("status:'cancelled'"),'Acuity-linked unclaim must synchronize local enrollment state to cancelled.');
expect(acuity.includes('flowtel_cancel_queendom_event_registration'),'Acuity cancellation must complete before Flowtel releases the seat.');

expect(agenda.includes('UNCLAIM MY SEAT'),'Public/member event calendar must expose UNCLAIM MY SEAT.');
expect(agenda.includes('data-unclaim-event'),'Event calendar must bind unclaim actions.');
expect(agendaCss.includes('.agenda-unclaim'),'Event calendar must style the secondary unclaim action.');
expect(client.includes('data-lounge-unclaim'),'My Upcoming Events must expose UNCLAIM MY SEAT.');
expect(client.includes('loungeNextRegisteredOccurrence'),'Recurring My Upcoming Events must target the member\'s registered occurrence.');

expect(managerHtml.includes('deleteEventButton'),'Event Admin form must expose permanent delete.');
expect(manager.includes('data-delete-event'),'Event Admin list must expose permanent delete for non-published events.');
expect(manager.includes('deleteQueendomEventAdmin'),'Event Admin must call the protected permanent-delete RPC.');
expect(manager.includes('This cannot be undone.'),'Permanent delete must require explicit destructive confirmation.');

const apiCount=fs.readdirSync(path.join(root,'api')).filter(name=>name.endsWith('.js')).length;
expect(apiCount===12,`Vercel API function count is ${apiCount}; expected 12/12.`);

if(failures.length){
  console.error(`Flowtel v0.10.90.2 Event Lifecycle validation failed (${failures.length}):`);
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
console.log('Flowtel v0.10.90.2 Event Lifecycle validation OK.');
