import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read=file=>readFile(file,'utf8');
const shared=await read('shared/priestess-mailbox.js');
const memberHtml=await read('flow-fm/priestess-mailbox/index.html');
const memberJs=await read('flow-fm/priestess-mailbox/page.js');
const memberCss=await read('flow-fm/priestess-mailbox/styles.css');
const profileHtml=await read('flow-fm/profile-studio/index.html');
const managerHtml=await read('manager/index.html');
const managerJs=await read('manager/app.js');
const managerCss=await read('manager/styles.css');
const mailboxMigration=await read('database/migration-052-combined-flowtel-caddie-updates.sql');

for(const token of [
  "'mp4'","'mov'","'m4v'","'webm'",
  'sendPrivateFileToConcierge','returnPrivateFile','uploadPriestessMailboxFile',
  'tus-js-client@4','retryDelays','findPreviousUploads','preparePendingTransfer','localStorage',
  'PRIESTESS_MAILBOX_MAX_BYTES = 250 * 1024 * 1024',
]) assert(shared.includes(token),`Shared mailbox module is missing ${token}.`);

for(const token of ['page.js?v=0.10.80.2','styles.css?v=0.10.80.2']) assert(memberHtml.includes(token),`Member mailbox cache key is missing ${token}.`);
for(const token of ['Choose a private file','sendPrivateFileToConcierge','mailbox-upload-progress','Uploading privately… ${value}%']) assert(memberJs.includes(token),`Member private-media flow is missing ${token}.`);
for(const token of ['.mailbox-selected-file','.mailbox-upload-progress','.mailbox-upload-guidance']) assert(memberCss.includes(token),`Member private-media styling is missing ${token}.`);
assert(!memberJs.includes('Choose your audio'),'Member uploader is still audio-only.');
assert(!memberJs.includes('name="audio_file"'),'Member upload field is still audio-only.');

for(const token of ['app.js?v=0.10.80.2','Private files awaiting you']) assert(managerHtml.includes(token),`Manager private-media shell is missing ${token}.`);
for(const token of ['PRIESTESS_MAILBOX_ACCEPT','returnPrivateFile','data-return-file','SEND PRIVATE FILE BACK','admin-mailbox-return-progress']) assert(managerJs.includes(token),`Manager private-media return is missing ${token}.`);
for(const token of ['.admin-mailbox-return-progress','input[type="file"]::file-selector-button']) assert(managerCss.includes(token),`Manager private-media styling is missing ${token}.`);
assert(!managerJs.includes('Return edited audio'),'Owner return remains audio-only.');
assert(profileHtml.includes('Send private audio, video, images, or documents'),'Profile Studio doorway does not describe private media exchange.');

for(const mime of ["'video/mp4'","'video/quicktime'","'video/x-m4v'","'video/webm'"]) assert(mailboxMigration.includes(mime),`Live mailbox foundation is missing ${mime}.`);
assert(mailboxMigration.includes('file_size_limit=262144000'),'Mailbox bucket foundation is not 250 MB.');
try{
  await access('database/migration-063-priestess-mailbox-private-media.sql');
  assert.fail('A new migration 063 was added even though the existing bucket foundation already supports private media.');
}catch(error){
  if(error?.code!=='ENOENT') throw error;
}

console.log('Flowtel v0.10.80.2 Priestess Mailbox private-media static validation passed.');
