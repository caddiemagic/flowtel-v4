import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manager=await readFile('manager/app.js','utf8');
const managerHtml=await readFile('manager/index.html','utf8');
const profile=await readFile('flow-fm/profile-studio/page.js','utf8');
const mailbox=await readFile('flow-fm/priestess-mailbox/page.js','utf8');

const sample=[
  {direction:'to_practitioner',downloaded_at:null},
  {direction:'to_practitioner',downloaded_at:'2026-07-29T12:00:00Z'},
  {direction:'to_admin',downloaded_at:null},
];
const waiting=sample.filter(row=>row.direction==='to_practitioner' && !row.downloaded_at);
assert.equal(waiting.length,1,'Only undownloaded member deliveries should count.');

assert(manager.includes('memberMailboxWaiting'),'Concierge Team unread count is missing.');
assert(manager.includes('listMyPriestessMailbox'),'Concierge Team does not load the signed-in Priestess mailbox.');
assert(managerHtml.includes('teamPriestessMailboxStatus'),'Team Mailbox status target is missing.');
assert(profile.includes('waitingPriestessMailboxCount'),'Profile Studio unread count is missing.');
assert(profile.includes('profileMailboxBadge'),'Profile Studio badge wiring is missing.');
assert(mailbox.includes('waitingMailboxFiles'),'Mailbox room unread count is missing.');
assert(mailbox.includes('markReturnedAudioDownloaded'),'Download acknowledgment remains required.');
assert(mailbox.indexOf('markReturnedAudioDownloaded') < mailbox.indexOf("setMessage('Your private file has been received"),'Success message must follow the download acknowledgment.');

console.log('Flowtel v0.10.80.1 Priestess Mailbox Delivery Alert behavior tests passed.');
