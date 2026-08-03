import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(file,'utf8');
const shared=await read('shared/priestess-mailbox.js');
const memberHtml=await read('flow-fm/priestess-mailbox/index.html');
const memberJs=await read('flow-fm/priestess-mailbox/page.js');
const memberCss=await read('flow-fm/priestess-mailbox/styles.css');
const profileHtml=await read('flow-fm/profile-studio/index.html');
const managerHtml=await read('manager/index.html');
const managerJs=await read('manager/app.js');
const managerCss=await read('manager/styles.css');
const mailboxMigration=await read('database/migration-063-priestess-mailbox-1gb-inbox-clearance.sql');

for(const token of [
  "'mp4'","'mov'","'m4v'","'webm'",
  'sendPrivateFileToConcierge','returnPrivateFile','uploadPriestessMailboxFile',
  'tus-js-client@4','retryDelays','findPreviousUploads','preparePendingTransfer','localStorage','onBeforeRequest',
  'isCompactJwt','supabase.auth.refreshSession()','Your Flowtel session needs to be refreshed.',
  'PRIESTESS_MAILBOX_MAX_BYTES = 1 * 1024 * 1024 * 1024',
]) assert(shared.includes(token),`Shared mailbox module is missing ${token}.`);

for(const token of ['page.js?v=0.10.80.4','styles.css?v=0.10.80.4']) assert(memberHtml.includes(token),`Member mailbox cache key is missing ${token}.`);
for(const token of ['Choose a private file','sendPrivateFileToConcierge','mailbox-upload-progress','Uploading privately… ${value}%']) assert(memberJs.includes(token),`Member private-media flow is missing ${token}.`);
for(const token of ['.mailbox-selected-file','.mailbox-upload-progress','.mailbox-upload-guidance']) assert(memberCss.includes(token),`Member private-media styling is missing ${token}.`);
assert(!memberJs.includes('Choose your audio'),'Member uploader is still audio-only.');
assert(!memberJs.includes('name="audio_file"'),'Member upload field is still audio-only.');

for(const token of ['app.js?v=0.10.80.4','Private files awaiting you']) assert(managerHtml.includes(token),`Manager private-media shell is missing ${token}.`);
for(const token of ['PRIESTESS_MAILBOX_ACCEPT','returnPrivateFile','data-return-file','SEND PRIVATE FILE BACK','admin-mailbox-return-progress','CLEAR WITHOUT DOWNLOADING','clearMailboxFileNotification']) assert(managerJs.includes(token),`Manager private-media return is missing ${token}.`);
for(const token of ['.admin-mailbox-return-progress','input[type="file"]::file-selector-button','.admin-mailbox-file-actions']) assert(managerCss.includes(token),`Manager private-media styling is missing ${token}.`);
assert(!managerJs.includes('Return edited audio'),'Owner return remains audio-only.');
assert(!shared.includes('SUPABASE_PUBLISHABLE_KEY'),'Resumable uploads still import the opaque publishable key.');
assert(!shared.includes("request.setHeader('apikey'"),'Resumable requests still send an apikey header.');
assert(!/headers:\s*\{[\s\S]*?apikey:/m.test(shared),'Resumable base headers still include apikey.');
assert(profileHtml.includes('Send private audio, video, images, or documents'),'Profile Studio doorway does not describe private media exchange.');

for(const mime of ["'video/mp4'","'video/quicktime'","'video/x-m4v'","'video/webm'"]) assert(mailboxMigration.includes(mime),`Live mailbox foundation is missing ${mime}.`);
for(const token of [
  'file_size_limit = 1073741824',
  'flowtel_mailbox_create_thread',
  'flowtel_mailbox_admin_add_return_file',
  'flowtel_mailbox_admin_send_file',
  'Choose a private file between 1 byte and 1 GB.',
  String.raw`\.(pdf|txt|csv|zip|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|webp|gif|mp3|wav|m4a|aac|ogg|mp4|mov|m4v|webm)$`,
]) assert(mailboxMigration.includes(token),`Mailbox migration is missing ${token}.`);
assert(!/drop table|truncate table|delete from public\.flowtel_priestess_mailbox/i.test(mailboxMigration),'Mailbox migration contains destructive history SQL.');
assert.equal((mailboxMigration.match(/\$\$/g)||[]).length%2,0,'Mailbox migration has unmatched SQL dollar quotes.');

console.log('Flowtel v0.10.80.4 Priestess Mailbox private-media static validation passed.');
