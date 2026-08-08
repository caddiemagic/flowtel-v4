import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { extractZoomMeetingUrl }=require('../server/acuity-server.js');

assert.equal(
  extractZoomMeetingUrl({location:'https://us06web.zoom.us/j/123456789?pwd=rose'}),
  'https://us06web.zoom.us/j/123456789?pwd=rose',
);
assert.equal(
  extractZoomMeetingUrl({location:'Join on Zoom: <a href="https://priestess.zoom.us/j/987654321?pwd=gold&amp;tk=moon">Enter</a>'}),
  'https://priestess.zoom.us/j/987654321?pwd=gold&tk=moon',
);
assert.equal(
  extractZoomMeetingUrl({location:{url:'https://zoom.us/my/wombmagic'}}),
  'https://zoom.us/my/wombmagic',
);
assert.equal(extractZoomMeetingUrl({location:'https://zoom.us.evil.example/j/123'}),'');
assert.equal(extractZoomMeetingUrl({location:'https://example.com/zoom-room'}),'');
assert.equal(extractZoomMeetingUrl({location:'Monterey, California'}),'');

console.log('Flowtel v0.10.82 Enter Womb Magic behavior checks passed.');
