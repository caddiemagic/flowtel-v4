import assert from 'node:assert/strict';
import {
  GUEST_HOUSE_MAX_BYTES,
  GUEST_HOUSE_STATUS_LABELS,
  buildGuestHouseReplayUrl,
  createGuestHouseToken,
  guestHouseExpirationDate,
  guestHouseFileSize,
  guestHouseReplayDaysRemaining,
  guestHouseReplayExpirationCopy,
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
  callMemory:'I remember talking about womb wealth and receiving.',
}),{
  firstName:'Mara',lastName:'Rose',email:'mara@example.com',confirmed:true,
  callMemory:'I remember talking about womb wealth and receiving.',
});
assert.throws(()=>validateGuestHouseRequest({firstName:'Mara',lastName:'Rose',callMemory:'Memory',confirmed:false}),/requesting your own/);
assert.throws(()=>validateGuestHouseRequest({firstName:'Mara',lastName:'Rose',callMemory:'',confirmed:true}),/what you remember/);
assert.equal(GUEST_HOUSE_STATUS_LABELS.locating,'Concierge is locating the recording');
assert.equal(GUEST_HOUSE_STATUS_LABELS.ready,'Replay Room is ready');
assert.equal(GUEST_HOUSE_STATUS_LABELS.unable_to_locate,"Concierge couldn't find the replay");

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

const replayStart=new Date('2026-07-20T12:00:00.000Z');
const replayEnd=new Date('2026-08-17T12:00:00.000Z');
assert.equal(guestHouseReplayDaysRemaining(replayEnd,replayStart),28);
assert.equal(guestHouseReplayExpirationCopy(replayEnd,replayStart),'This replay will be deleted in 28 days.');
assert.equal(guestHouseReplayExpirationCopy(replayStart,replayStart),'This replay has reached the end of its 28-day Guest House stay.');


console.log('Guest House account request, status, file, token, expiration, and private-link tests passed.');
