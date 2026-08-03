import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(file,'utf8');
const managerHtml=await read('manager/index.html');
const managerJs=await read('manager/app.js');
const managerCss=await read('manager/styles.css');
const profileHtml=await read('flow-fm/profile-studio/index.html');
const profileJs=await read('flow-fm/profile-studio/page.js');
const profileCss=await read('flow-fm/profile-studio/styles.css');
const mailboxHtml=await read('flow-fm/priestess-mailbox/index.html');
const mailboxJs=await read('flow-fm/priestess-mailbox/page.js');
const mailboxCss=await read('flow-fm/priestess-mailbox/styles.css');

for(const token of ['data-team-priestess-mailbox','teamPriestessMailboxStatus','teamPriestessMailboxNote']) assert(managerHtml.includes(token),`Manager Team Mailbox is missing ${token}.`);
for(const token of ['listMyPriestessMailbox','memberMailboxWaiting','data-team-priestess-mailbox','NEW ${memberMailboxWaiting===1?"FILE":"FILES"}']) assert(managerJs.includes(token),`Manager alert logic is missing ${token}.`);
assert(managerCss.includes('[data-team-priestess-mailbox].has-alert'),'Manager Team Mailbox alert styling is missing.');
for(const token of ['profileMailboxBadge','profile-mailbox-actions']) assert(profileHtml.includes(token),`Profile Studio Mailbox alert markup is missing ${token}.`);
for(const token of ['waitingPriestessMailboxCount','loadProfileMailboxAlert','listMyPriestessMailbox']) assert(profileJs.includes(token),`Profile Studio Mailbox alert logic is missing ${token}.`);
assert(profileCss.includes('.profile-mailbox-doorway.has-alert'),'Profile Studio alert styling is missing.');
for(const token of ['page.js?v=0.10.80.3','styles.css?v=0.10.80.3']) assert(mailboxHtml.includes(token),`Mailbox cache key is missing ${token}.`);
for(const token of ['waitingMailboxFiles','mailbox-delivery-alert','is-waiting','markReturnedAudioDownloaded']) assert(mailboxJs.includes(token),`Mailbox room alert logic is missing ${token}.`);
for(const token of ['.mailbox-delivery-alert','.mailbox-file.is-waiting']) assert(mailboxCss.includes(token),`Mailbox room alert styling is missing ${token}.`);
assert(!/\b(?:email|sms|push notification)\b/i.test(mailboxJs),'The in-platform alert must not silently create external notifications.');

console.log('Flowtel v0.10.80.1 Priestess Mailbox Delivery Alert static validation passed.');
