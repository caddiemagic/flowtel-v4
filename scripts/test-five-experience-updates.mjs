import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import {
  GUEST_HOUSE_STATUS_LABELS,
  guestHouseReplayDaysRemaining,
  guestHouseReplayExpirationCopy,
} from '../shared/guest-house-core.js';
import {
  labelForWorkshopReplayNoteType,
  normalizeWorkshopKey,
  validateWorkshopReplayNote,
} from '../shared/replay-notes-core.js';

assert.equal(normalizeWorkshopKey(' Four Seasons / Flowtel Workshop '),'four-seasons-flowtel-workshop');
assert.equal(labelForWorkshopReplayNoteType('cycle_data'),'Track This in Cycle Data');
assert.deepEqual(validateWorkshopReplayNote({
  workshopKey:'four-seasons-flowtel-workshop',
  workshopTitle:'Four Seasons Flowtel Workshop',
  noteType:'reflection',
  noteBody:'I can feel my Inner Autumn asking for a quieter pace.',
  sourceUrl:'/assets/Four-Seasons-Flowtel-Workshop.mp4',
}),{
  workshopKey:'four-seasons-flowtel-workshop',
  workshopTitle:'Four Seasons Flowtel Workshop',
  noteType:'reflection',
  noteBody:'I can feel my Inner Autumn asking for a quieter pace.',
  sourceUrl:'/assets/Four-Seasons-Flowtel-Workshop.mp4',
});
assert.throws(()=>validateWorkshopReplayNote({workshopKey:'x',workshopTitle:'Replay',noteType:'invalid',noteBody:'Hello'}),/what kind of note/i);
assert.throws(()=>validateWorkshopReplayNote({workshopKey:'x',workshopTitle:'Replay',noteType:'note',noteBody:''}),/Write the note/);

assert.equal(GUEST_HOUSE_STATUS_LABELS.locating,'Concierge is locating the recording');
assert.equal(GUEST_HOUSE_STATUS_LABELS.ready,'Replay Room is ready');
assert.equal(GUEST_HOUSE_STATUS_LABELS.unable_to_locate,"Concierge couldn't find the replay");
const start=new Date('2026-07-20T12:00:00.000Z');
const end=new Date('2026-08-17T12:00:00.000Z');
assert.equal(guestHouseReplayDaysRemaining(end,start),28);
assert.equal(guestHouseReplayExpirationCopy(end,start),'This replay will be deleted in 28 days.');

const loungeHtml=await readFile('client/index.html','utf8');
assert(loungeHtml.includes('id="loungeWorkshopVideo"'),'Lounge workshop player is missing.');
assert(loungeHtml.includes('/replay-notes/?workshop=four-seasons-flowtel-workshop'),'Embedded replay-notes portal is missing.');
const guestHouseHtml=await readFile('guest-house/index.html','utf8');
assert(!guestHouseHtml.includes('The Guest House is a threshold. The Queendom is the world beyond it.'),'Large Guest House threshold headline was not removed.');
assert(/AN INVITATION BEYOND THE GUEST HOUSE/i.test(guestHouseHtml),'Guest House invitation eyebrow must remain.');
assert(guestHouseHtml.includes('JOIN THE QUEENDOM'),'Guest House invitation button must remain.');

const caddieCss=await readFile('caddie-magic/compass/styles.css','utf8');
assert(caddieCss.includes('Upcoming Golf practical calendar typography'),'Caddie Magic calendar font clarity rules are missing.');
assert(caddieCss.includes('"Helvetica Neue",Arial,sans-serif'),'Caddie Magic practical calendar font stack is missing.');

console.log('Lounge workshop media is supplied through private Storage.');


console.log('Five-experience update behavior tests passed.');
