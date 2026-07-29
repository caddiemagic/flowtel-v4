import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page=await readFile('flow-fm/profile-studio/page.js','utf8');
const mailbox=await readFile('flow-fm/priestess-mailbox/page.js','utf8');

assert(page.includes("data.get('bio_custom')"),'Custom bio is not the saved bio source.');
assert(page.includes("frameworkSelection(record,'bio')"),'Selected prepared bio is not restored from saved framework metadata.');
assert(page.includes('bioHasCustomEdits'),'Title/template changes do not protect personalized edits.');
assert(page.includes('Restore Original Description'),'Prepared description restore action is missing.');
assert(mailbox.includes('listMyPriestessMailbox'),'Dedicated mailbox does not load the signed-in Priestess threads.');
assert(mailbox.includes('sendAudioToConcierge'),'Dedicated mailbox cannot send audio to the owner.');
assert(mailbox.includes('markReturnedAudioDownloaded'),'Dedicated mailbox cannot acknowledge private downloads.');

console.log('Flowtel v0.10.80 Priestess Profile Personalization + Mailbox Room behavior tests passed.');
