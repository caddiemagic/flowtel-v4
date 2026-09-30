import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const agenda=read('queendom-events/app.js');
const agendaCss=read('queendom-events/styles.css');
const agendaHtml=read('queendom-events/index.html');
const calendar=read('queendom-calendar/app.js');
const calendarCss=read('queendom-calendar/styles.css');
const calendarHtml=read('queendom-calendar/index.html');
const client=read('client/app.js');
const clientHtml=read('client/index.html');
const failures=[];
const expect=(ok,msg)=>{if(!ok)failures.push(msg);};

expect(agendaHtml.includes('/queendom-events/app.js?v=0.10.90.3'),'Queendom Events app cache key must be v0.10.90.3.');
expect(agendaHtml.includes('/queendom-events/styles.css?v=0.10.90.3'),'Queendom Events CSS cache key must be v0.10.90.3.');
expect(agenda.includes("if(detail?.event_format==='recurring'){const registered=rows.filter(item=>item.is_registered);"),'Recurring room selection must prefer the member\'s registered occurrence.');
expect(agenda.includes("const registeredContext=detail.event_format==='series'?occurrenceItinerary(detail,current):'';"),'Recurring registered rooms must not render the full recurring itinerary.');
expect(agenda.includes('data-room-unclaim'),'Registered Event Room must expose an in-room unclaim action.');
expect(agenda.includes("const recurringOccurrenceId=detail.event_format==='recurring'?String(current?.occurrence_id||''):'';"),'Recurring in-room unclaim must preserve the exact occurrence id.');
expect(agenda.includes("unclaimSeat(button.dataset.eventId,button.dataset.occurrenceId||'')"),'In-room unclaim must use the existing Flowtel + Acuity cancellation path.');
expect(agenda.includes("'✓ SEAT CLAIMED · OPEN EVENT'"),'Registered event copy must say SEAT CLAIMED · OPEN EVENT.');
expect(!agenda.includes('NEXT GATHERING CLAIMED'),'Old NEXT GATHERING CLAIMED copy must be removed.');
expect(agendaCss.includes('.agenda-room-unclaim'),'Registered Event Room unclaim action must be styled.');

expect(calendarHtml.includes('id="calendarPreview"'),'The Queendom Calendar must include a compact upcoming preview region.');
expect(calendarHtml.includes('/queendom-calendar/app.js?v=0.10.90.3'),'Calendar app cache key must be v0.10.90.3.');
expect(calendarHtml.includes('/queendom-calendar/styles.css?v=0.10.90.3'),'Calendar CSS cache key must be v0.10.90.3.');
expect(calendar.includes('function previewMoments(rows)'),'Calendar must derive upcoming preview moments.');
expect(calendar.includes('.slice(0,3)'),'Calendar preview must be limited to the next three gatherings.');
expect(calendar.includes('data-preview-event-id'),'Calendar preview items must open exact event/occurrence details.');
expect(calendar.includes('data-release-seat'),'Calendar dialog must expose UNCLAIM MY SEAT for registered events.');
expect(calendar.includes("setQueendomEventRegistration(event.event_id,target,event.event_format==='recurring'?occurrence?.occurrence_id:null)"),'Calendar seat release must preserve recurring occurrence id.');
expect(calendarCss.includes('.calendar-preview-list'),'Calendar next-three preview must be styled.');

expect(clientHtml.includes('id="loungeEventsCard" aria-hidden="true"'),'Legacy Lounge discovery card must remain hidden by default.');
expect(clientHtml.includes('id="my-upcoming-events" aria-hidden="false"'),'My Upcoming Events must be visible by default in the Lounge.');
expect(clientHtml.includes('href="/queendom-calendar/">View All Upcoming Events</a>'),'Visible Lounge footer must point to The Queendom Calendar.');
expect(!clientHtml.includes('id="backToUpcomingEventsButton"'),'Lounge must not expose a Back to Upcoming Events toggle.');
expect(client.includes('function setLoungeEventsView(_view'),'Lounge view helper must force the member view rather than toggle discovery.');
expect(client.includes('discovery.classList.add("hidden")'),'Lounge discovery view must stay hidden for members.');
expect(clientHtml.includes('./app.js?v=0.10.90.3'),'Client app cache key must be v0.10.90.3.');

const apiCount=fs.readdirSync(path.join(root,'api')).filter(name=>name.endsWith('.js')).length;
expect(apiCount===12,`Vercel API function count is ${apiCount}; expected 12/12.`);

if(failures.length){
  console.error(`Flowtel v0.10.90.3 Event Experience validation failed (${failures.length}):`);
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
console.log('Flowtel v0.10.90.3 Event Experience validation OK.');
