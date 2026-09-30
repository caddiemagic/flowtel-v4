import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const calendarHtml = read('queendom-calendar/index.html');
const calendarApp = read('queendom-calendar/app.js');
const calendarCss = read('queendom-calendar/styles.css');
const eventsHtml = read('queendom-events/index.html');
const eventsApp = read('queendom-events/app.js');
const eventsCss = read('queendom-events/styles.css');
const clientHtml = read('client/index.html');
const clientApp = read('client/app.js');
const clientCss = read('client/styles.css');

assert.match(calendarHtml, /styles\.css\?v=0\.10\.91\.2/, 'Calendar CSS cache key must be v0.10.91.2.');
assert.match(calendarHtml, /app\.js\?v=0\.10\.91\.2/, 'Calendar app cache key must be v0.10.91.2.');
assert.match(eventsHtml, /styles\.css\?v=0\.10\.91\.2/, 'Upcoming Events CSS cache key must be v0.10.91.2.');
assert.match(eventsHtml, /app\.js\?v=0\.10\.91\.2/, 'Upcoming Events app cache key must be v0.10.91.2.');
assert.match(clientHtml, /styles\.css\?v=0\.10\.91\.2/, 'Client CSS cache key must be v0.10.91.2.');
assert.match(clientHtml, /app\.js\?v=0\.10\.91\.2/, 'Client app cache key must be v0.10.91.2.');

assert.match(calendarHtml, /gatherings happening in the Flowtel/, 'Calendar hero copy must say gatherings happen in the Flowtel.');
assert.match(calendarApp, /events\.find\([\s\S]*?\|\|previewEvents\.find/, 'Calendar event opening must fall back to the six-month preview feed.');
assert.match(calendarApp, /function calendarDetailUrl\(/, 'Calendar must provide native/deep-link detail URLs.');
assert.match(calendarApp, /function eventRoomUrl\(/, 'Calendar must provide a protected Event Room URL.');
assert.match(calendarApp, /class="calendar-preview-open" href=/, 'Coming Up Next title/date must be a native link fallback.');
assert.match(calendarApp, /class="calendar-event-tile[\s\S]*?href=/, 'Month calendar tiles must provide native link fallbacks.');
assert.match(calendarApp, /SEAT CLAIMED · OPEN EVENT<\/a>/, 'Claimed preview seat must open the protected Event Room.');
assert.match(calendarApp, /window\.location\.href=eventRoomUrl\(event\)/, 'Calendar Enter Gathering must hand off to the full Event Room.');
assert.match(calendarApp, /params\.delete\('openEvent'\);params\.delete\('occurrence'\)/, 'Closing a deep-linked event sheet must clear the cached event query state.');

assert.match(calendarCss, /calendar-event-image img\{object-fit:contain/, 'Calendar artwork must preserve the full image.');
assert.match(calendarCss, /event-dialog-image\{[^}]*object-fit:contain/, 'Calendar dialog artwork must preserve the full image.');
assert.match(calendarCss, /event-dialog-actions \.save-seat\.is-saved\{background:linear-gradient/, 'Claimed seat state must use the pink button treatment.');
assert.match(calendarCss, /max-height:92dvh/, 'Calendar mobile dialog must use a compact viewport-aware sheet.');

assert.match(eventsApp, /window\.open\('about:blank','_blank'\)/, 'Protected Zoom entry must establish the mobile window synchronously.');
assert.match(eventsApp, /else window\.location\.href=entry\.meeting_url/, 'Protected Zoom entry must have a same-tab mobile fallback.');
assert.match(eventsCss, /agenda-seat\.is-saved\{background:linear-gradient/, 'Upcoming Events claimed state must use the pink button treatment.');
assert.match(eventsCss, /@media\(max-width:600px\)[\s\S]*?\.agenda-event\{grid-template-columns:1fr/, 'Upcoming Events cards must stack on narrow mobile screens.');

assert.match(clientApp, /function loungeRegisteredEventUrl\(/, 'Lounge must create a native protected Event Room URL.');
assert.match(clientApp, /<a class=\"lounge-join-button\" href=/, 'Lounge Open Event must use a native link on mobile and desktop.');
assert.match(clientCss, /lounge-event-actions>\.lounge-join-button[\s\S]*?width:100%/, 'Lounge Open Event and calendar actions must share full action width.');
assert.match(clientCss, /lounge-my-calendar-card \.lounge-event-row[\s\S]*?grid-template-columns:1fr/, 'My Upcoming Events cards must stack on mobile.');
assert.match(clientCss, /lounge-my-calendar-card \.lounge-event-actions\{grid-column:1;grid-template-columns:1fr/, 'My Upcoming Events mobile actions must stack one per row.');
assert.match(clientCss, /lounge-my-calendar-card \.lounge-event-art img\{object-fit:contain/, 'Lounge event artwork must preserve the full image.');

console.log('Flowtel v0.10.91.2 Mobile Event Experience validation OK.');
