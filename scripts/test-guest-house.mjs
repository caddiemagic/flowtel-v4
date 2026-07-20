import assert from 'node:assert/strict';
import {
  GUEST_HOUSE_MAX_BYTES,
  buildGuestHouseReplayUrl,
  createGuestHouseToken,
  guestHouseExpirationDate,
  guestHouseFileSize,
  guestHouseMediaKind,
  guestHouseProjectLimitMessage,
  hashGuestHouseToken,
  normalizeGuestHouseEmail,
  safeGuestHouseFilename,
  validateGuestHouseReplayMetadata,
  validateGuestHouseRequest,
} from '../shared/guest-house-core.js';

assert.equal(normalizeGuestHouseEmail('  Woman@Example.COM '),'woman@example.com');
assert.deepEqual(validateGuestHouseRequest({
  firstName:'Mara',lastName:'Rose',email:' MARA@EXAMPLE.COM ',confirmed:true,
  callDateHint:'Spring 2026',callTopic:'Womb wealth',requesterNote:'Private note',
}),{
  firstName:'Mara',lastName:'Rose',email:'mara@example.com',confirmed:true,
  callDateHint:'Spring 2026',callTopic:'Womb wealth',requesterNote:'Private note',
});
assert.throws(()=>validateGuestHouseRequest({firstName:'Mara',lastName:'Rose',email:'mara@example.com',confirmed:false}),/requesting your own/);
assert.throws(()=>validateGuestHouseRequest({firstName:'',lastName:'Rose',email:'mara@example.com',confirmed:true}),/first name/);

assert.equal(guestHouseMediaKind('call.mp4','video/mp4'),'video');
assert.equal(guestHouseMediaKind('call.m4a','audio/mp4'),'audio');
assert.equal(guestHouseMediaKind('call.pdf','application/pdf'),'');
assert.equal(safeGuestHouseFilename('My Call Replay (Final).mp4'),'My-Call-Replay-Final-.mp4');
assert.deepEqual(validateGuestHouseReplayMetadata({name:'call.webm',type:'video/webm',size:1024}),{
  extension:'webm',mimeType:'video/webm',sizeBytes:1024,mediaKind:'video',
});
assert.throws(()=>validateGuestHouseReplayMetadata({name:'call.pdf',type:'application/pdf',size:1024}),/Choose an MP4/);
assert.throws(()=>validateGuestHouseReplayMetadata({name:'call.mp4',type:'video/mp4',size:GUEST_HOUSE_MAX_BYTES+1}),/smaller than 2 GB/);
assert.match(guestHouseProjectLimitMessage({name:'call.mp4',size:450*1024*1024}),/call\.mp4 \(450 MB\).*Global file size limit.*1 GB.*bucket is already configured for 2 GB/);

const token=createGuestHouseToken();
assert.match(token,/^[a-f0-9]{64}$/);
const hash=await hashGuestHouseToken(token);
assert.match(hash,/^[a-f0-9]{64}$/);
assert.equal(hash,await hashGuestHouseToken(token));
assert.notEqual(hash,token,'Only the SHA-256 token hash should be stored.');

assert.equal(buildGuestHouseReplayUrl('abc',{origin:'https://app.theflowtel.com/'}),'https://app.theflowtel.com/guest-house/replay/?key=abc');
const start=new Date('2026-07-20T12:00:00.000Z');
assert.equal(guestHouseExpirationDate(90,start).toISOString(),'2026-10-18T12:00:00.000Z');
assert.equal(guestHouseExpirationDate(999,start).toISOString(),'2027-07-21T12:00:00.000Z');
assert.equal(guestHouseFileSize(1024),'1.0 KB');
assert.equal(guestHouseFileSize(1024*1024*1024),'1.00 GB');

console.log('Guest House request, file, token, expiration, and private-link tests passed.');
