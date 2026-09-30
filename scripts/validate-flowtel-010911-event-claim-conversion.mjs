import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=(file)=>fs.readFileSync(file,'utf8');
const calendar=read('queendom-calendar/app.js');
const calendarHtml=read('queendom-calendar/index.html');
const calendarCss=read('queendom-calendar/styles.css');
const client=read('client/app.js');
const clientHtml=read('client/index.html');
const bridge=read('api/squarespace-bridge.js');
const release=read('docs/RELEASE-0.10.91.1.md');

assert.match(calendarHtml,/queendom-calendar\/app\.js\?v=0\.10\.91\.(?:1|2)/,'Calendar app cache key must retain the v0.10.91.1+ event-claim bundle.');
assert.match(calendarHtml,/queendom-calendar\/styles\.css\?v=0\.10\.91\.(?:1|2)/,'Calendar CSS cache key must retain the v0.10.91.1+ event-claim bundle.');
assert.match(clientHtml,/app\.js\?v=0\.10\.91\.(?:1|2)/,'Client app cache key must retain the v0.10.91.1+ event-claim bundle.');
assert.match(clientHtml,/styles\.css\?v=0\.10\.91\.(?:1|2)/,'Client CSS cache key must retain the v0.10.91.1+ event-claim bundle.');

assert.match(calendar,/calendar-preview-claim/,'Next-three preview must expose seat claim controls.');
assert.match(calendar,/CLAIM MY SEAT/,'Preview must say CLAIM MY SEAT.');
assert.match(calendar,/✓ SEAT CLAIMED · OPEN EVENT/,'Claimed preview state must expose OPEN EVENT.');
assert.match(calendar,/setQueendomEventRegistration\(event\.event_id,true,event\.event_format==='recurring'\?activeOccurrence\(event\)\?\.occurrence_id\|\|null:null\)/,'Preview registration must preserve exact recurring occurrence and whole-series semantics.');
assert.match(calendar,/ALREADY IN THE QUEENDOM\? ENTER FLOWTEL|calendarEnterFlowtel/,'Signed-out preview must offer an Enter Flowtel doorway.');
assert.match(calendarHtml,/NOT YET A MEMBER\? JOIN THE QUEENDOM/,'Signed-out preview must offer the Queendom signup doorway.');
assert.match(calendarHtml,/https:\/\/www\.theidyllcollective\.com\/queendomhome/,'Preview must use the canonical Queendom signup URL.');
assert.match(calendar,/if\(profile\)return `<a class="calendar-preview-claim" href="\$\{QUEENDOM_JOIN_URL\}"/,'Signed-in nonmember must route to the Queendom signup rather than member enrollment.');
assert.match(calendarCss,/\.claim-doorway/,'Claim doorway styling is missing.');

assert.match(client,/eventDoorwayOccurrenceId=String\(urlParam\("occurrence"\)/,'Client must retain exact event occurrence from the doorway URL.');
assert.match(client,/setQueendomEventRegistration\(eventDoorwayEventId,true,eventDoorwayOccurrenceId\|\|null\)/,'Authenticated event doorway must claim the exact occurrence.');
assert.match(client,/occurrence_id:String\(context\?\.occurrenceId/,'Membership activation must forward exact occurrence context to the server.');
assert.match(client,/url\.searchParams\.delete\("occurrence"\)/,'Event doorway cleanup must remove occurrence after claim.');

assert.match(bridge,/function safeFlowtelUuid/,'Server must validate event return identifiers.');
assert.match(bridge,/flowtelInviteRedirect\(\{ eventId = null, occurrenceId = null \}/,'Invite redirect must accept fixed event context.');
assert.match(bridge,/target\.searchParams\.set\("saveEvent", safeEventId\)/,'Invite redirect must preserve the event id.');
assert.match(bridge,/target\.searchParams\.set\("occurrence", safeOccurrenceId\)/,'Invite redirect must preserve the recurring occurrence id.');
assert.match(bridge,/eventId: body\.event_id \|\| null/,'Provisioning handler must pass event context only from the activation request.');
assert.doesNotMatch(bridge,/redirectTo\s*=\s*body\./,'Client input must never become an arbitrary invite redirect URL.');

assert.match(release,/No database change/,'Release notes must explicitly state no migration.');
assert.match(release,/12 \/ 12/,'Release notes must preserve the 12-function ceiling.');

console.log('✓ Flowtel v0.10.91.1 Event Claim Conversion validator passed.');
