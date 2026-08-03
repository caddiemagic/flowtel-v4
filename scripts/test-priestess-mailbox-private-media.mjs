import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shared=await readFile('shared/priestess-mailbox.js','utf8');
const member=await readFile('flow-fm/priestess-mailbox/page.js','utf8');
const manager=await readFile('manager/app.js','utf8');

const extensionBlock=shared.match(/PRIESTESS_MAILBOX_FILE_EXTENSIONS\s*=\s*\[([\s\S]*?)\];/);
assert(extensionBlock,'Mailbox extension list is missing.');
const extensions=[...extensionBlock[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
const accepts=(name,size)=>extensions.includes(String(name).toLowerCase().split('.').pop()) && size>0 && size<=250*1024*1024;

for(const name of ['journey.mp4','journey.mov','journey.m4v','journey.webm','voice.m4a','notes.pdf','image.jpg','archive.zip']){
  assert(accepts(name,20*1024*1024),`${name} should be accepted by the private mailbox.`);
}
for(const name of ['installer.exe','script.js','disk.dmg']){
  assert(!accepts(name,1024),`${name} should remain blocked.`);
}
assert(!accepts('oversized.mp4',250*1024*1024+1),'Files larger than 250 MB must be rejected.');
assert(shared.includes('PRIESTESS_MAILBOX_RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024'),'Large-file threshold is not 6 MB.');
assert(shared.includes('findPreviousUploads'),'Large uploads cannot discover a resumable transfer.');
assert(shared.includes('preparePendingTransfer'),'Retry-safe transfer identity is missing.');
assert(shared.includes('fingerprint:()=>Promise.resolve'),'Resumable uploads do not use a path-specific fingerprint.');
assert(member.includes('sendPrivateFileToConcierge'),'Member uploads are not using the private-file function.');
assert(member.includes('Uploading privately… ${value}%'),'Member upload progress is missing.');
assert(manager.includes('returnPrivateFile'),'Owner returns are not using the private-file function.');
assert(manager.includes('data-return-file'),'Owner return file input is missing.');
assert(manager.includes('admin-mailbox-return-progress'),'Owner return progress is missing.');

console.log('Flowtel v0.10.80.2 Priestess Mailbox private-media behavior tests passed.');
