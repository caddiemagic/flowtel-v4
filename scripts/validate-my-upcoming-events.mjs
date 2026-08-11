import fs from 'node:fs';
import assert from 'node:assert/strict';

const required=[
  'queendom-events/index.html',
  'queendom-events/app.js',
  'queendom-events/styles.css',
  'client/index.html',
  'client/app.js',
  'client/styles.css',
  'shared/queendom-events.js',
  'vercel.json',
  'docs/FLOWTEL_ROADMAP.md',
  'docs/QUEENDOM-EVENTS-EMBED.md',
  'docs/RELEASE-0.10.84.md',
  'docs/CHANGELOG.md',
];
for(const file of required)assert(fs.existsSync(file),`Missing ${file}`);

const agendaHtml=fs.readFileSync('queendom-events/index.html','utf8');
const agendaApp=fs.readFileSync('queendom-events/app.js','utf8');
const agendaCss=fs.readFileSync('queendom-events/styles.css','utf8');
const clientHtml=fs.readFileSync('client/index.html','utf8');
const clientApp=fs.readFileSync('client/app.js','utf8');
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const roadmap=fs.readFileSync('docs/FLOWTEL_ROADMAP.md','utf8');
const changelog=fs.readFileSync('docs/CHANGELOG.md','utf8');

assert(agendaHtml.includes('Upcoming Events'),'Agenda heading missing.');
assert(agendaHtml.includes('data-audience="all"')&&agendaHtml.includes('data-audience="queendom"')&&agendaHtml.includes('data-audience="flowfm"'),'Agenda filters missing.');
assert(agendaApp.includes("listPublicQueendomEvents({monthCount:12})"),'Agenda must use the sanitized public event feed.');
assert(agendaApp.includes("target=\"_top\""),'Embedded Save My Seat links must escape the iframe into Flowtel.');
assert(agendaApp.includes("target.searchParams.set('saveEvent',event.event_id)"),'Agenda must carry only the event id into the registration doorway.');
assert(!agendaApp.includes('zoom_url')&&!agendaApp.includes('zoom_passcode'),'Public agenda must never request or render Zoom credentials.');
assert(agendaCss.includes('.agenda-month-events')&&agendaCss.includes('.agenda-event'),'Agenda event presentation missing.');
assert(clientHtml.includes('MY UPCOMING EVENTS'),'Lounge must use My Upcoming Events language.');
assert(clientHtml.includes('id="my-upcoming-events"'),'My Upcoming Events anchor missing.');
assert(clientApp.includes('await registerPendingEventDoorway();'),'Authenticated entrance must resume pending event registration.');
assert(clientApp.includes('await setQueendomEventRegistration(eventDoorwayEventId,true);'),'Doorway must use the existing protected registration RPC.');
assert(clientApp.includes('showCheckIn();')&&clientApp.includes('Check in for today and Flowtel will take you straight to My Upcoming Events.'),'Event doorway must preserve normal daily check-in when required.');
assert(clientApp.includes('ADD TO CALENDAR')&&clientApp.includes('calendar.google.com/calendar/render')&&clientApp.includes("type:'text/calendar;charset=utf-8'"),'Personal-calendar handoff missing.');
assert(clientApp.includes('Join from My Upcoming Events in the Flowtel')&&!clientApp.includes('zoom_url`'),'Calendar handoff should point back to Flowtel, not serialize Zoom credentials.');
assert(vercel.rewrites.some(route=>route.source==='/queendom-events'&&route.destination==='/queendom-events/index.html'),'Vercel agenda route missing.');
assert(roadmap.includes('Deferred — Flowtel Messaging + Wake Up Text')&&roadmap.includes('6:00 AM')&&roadmap.includes('Day 1–28 affirmation library'),'Wake Up Text roadmap detail missing.');
assert(changelog.startsWith('## v0.10.84'),'Changelog must begin with v0.10.84.');

console.log(`Flowtel v0.10.84 My Upcoming Events validator passed (${required.length} release files checked).`);
