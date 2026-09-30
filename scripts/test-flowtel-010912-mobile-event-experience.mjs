import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../queendom-calendar/app.js', import.meta.url), 'utf8');
const events = fs.readFileSync(new URL('../queendom-events/app.js', import.meta.url), 'utf8');

// Regression contract: a Coming Up Next event does not need to be in the visible month.
assert.ok(app.includes("events.find(item=>String(item.event_id)===String(id))||previewEvents.find"));
// Registered preview CTA bypasses the lightweight calendar sheet and opens the protected room.
assert.ok(app.includes('href="${esc(eventRoomUrl(event))}">✓ SEAT CLAIMED · OPEN EVENT'));
// The lightweight calendar sheet never tries to perform the protected Zoom workflow itself.
assert.ok(!app.includes('async function joinEvent(event,button)'));
// iOS popup protection: open synchronously, populate after protected checks, same-tab fallback available.
assert.ok(events.includes("window.open('about:blank','_blank')"));
assert.ok(events.includes('zoomWindow.location.replace(entry.meeting_url)'));
assert.ok(events.includes('else window.location.href=entry.meeting_url'));

console.log('Flowtel v0.10.91.2 Mobile Event Experience behavior checks passed.');
