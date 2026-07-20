import assert from 'node:assert/strict';
import { loungeVideoFileSize,safeLoungeVideoFilename,validateLoungeVideo,LOUNGE_VIDEO_MAX_BYTES } from '../shared/lounge-video-core.js';

assert.equal(loungeVideoFileSize(450*1024*1024),'450.0 MB');
assert.equal(safeLoungeVideoFilename('Four Seasons / Flowtel Workshop.mp4'),'Four-Seasons-Flowtel-Workshop.mp4');
assert.equal(validateLoungeVideo({name:'workshop.mp4',type:'video/mp4',size:450*1024*1024}).extension,'mp4');
assert.throws(()=>validateLoungeVideo({name:'notes.pdf',type:'application/pdf',size:100}),/MP4/);
assert.throws(()=>validateLoungeVideo({name:'huge.mp4',type:'video/mp4',size:LOUNGE_VIDEO_MAX_BYTES+1}),/2 GB/);
console.log('Lounge video core tests passed.');
