import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=file=>readFile(file,'utf8');
const profileHtml=await read('flow-fm/profile-studio/index.html');
const profilePage=await read('flow-fm/profile-studio/page.js');
const profileCss=await read('flow-fm/profile-studio/styles.css');
const mailboxHtml=await read('flow-fm/priestess-mailbox/index.html');
const mailboxPage=await read('flow-fm/priestess-mailbox/page.js');
const mailboxCss=await read('flow-fm/priestess-mailbox/styles.css');
const manager=await read('manager/index.html');
const vercel=JSON.parse(await read('vercel.json'));

for(const token of ['Choose a Profile Description','Make It Your Own','Use This Description','Restore Original Description']) assert(profilePage.includes(token),`Profile Studio is missing ${token}.`);
assert(profilePage.includes("name=\"bio_custom\""),'Editable bio textarea is missing.');
assert(profilePage.includes('bioHasCustomEdits'),'Personalized bio protection is missing.');
assert(profilePage.includes("frameworkSelection(record,'bio')"),'Saved template choice is not restored.');
assert(!profileHtml.includes('id="priestessMailboxSection"'),'The full mailbox still lives inside Profile Studio.');
assert(profileHtml.includes('/flow-fm/priestess-mailbox/'),'Profile Studio mailbox doorway is missing.');
for(const token of ['priestess-mailbox-card','priestessMailboxSection','page.js?v=0.10.80.5']) assert(mailboxHtml.includes(token),`Dedicated mailbox HTML is missing ${token}.`);
for(const token of ['listMyPriestessMailbox','sendPrivateFileToConcierge','createMailboxDownloadUrl','markReturnedAudioDownloaded']) assert(mailboxPage.includes(token),`Dedicated mailbox logic is missing ${token}.`);
assert(manager.includes('href="/flow-fm/priestess-mailbox/"'),'Concierge Team Rooms do not link to the Priestess Mailbox.');
assert(vercel.rewrites.some(row=>row.source==='/flow-fm/priestess-mailbox'),'Priestess Mailbox rewrite is missing.');
assert(vercel.headers.some(row=>row.source==='/flow-fm/priestess-mailbox' && row.headers.some(header=>header.key==='Cache-Control' && header.value.includes('no-store'))),'Priestess Mailbox private cache header is missing.');
for(const token of ['bio-editor-field','profile-mailbox-doorway']) assert(profileCss.includes(token),`Profile personalization CSS is missing ${token}.`);
assert(mailboxCss.includes('priestess-mailbox-page'),'Mailbox page CSS is missing.');

console.log('Flowtel v0.10.80 Priestess Profile Personalization + Mailbox Room static validation passed.');
