import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read=(path)=>readFile(path,'utf8');
const files={
  migration:await read('database/migration-050-five-experience-updates.sql'),
  replayHtml:await read('replay-notes/index.html'),
  replayJs:await read('replay-notes/app.js'),
  replayCss:await read('replay-notes/styles.css'),
  replayShared:await read('shared/replay-notes.js'),
  loungeHtml:await read('client/index.html'),
  loungeJs:await read('client/app.js'),
  loungeCss:await read('client/styles.css'),
  guestHtml:await read('guest-house/index.html'),
  guestCore:await read('shared/guest-house-core.js'),
  guestShared:await read('shared/guest-house.js'),
  guestPortalApi:await read('api/guest-house-portal.js'),
  guestAccessApi:await read('api/guest-house-access.js'),
  managerHtml:await read('manager/index.html'),
  managerJs:await read('manager/app.js'),
  managerCss:await read('manager/styles.css'),
  caddieCss:await read('caddie-magic/compass/styles.css'),
  caddieAdminCss:await read('caddie-magic/compass/admin/styles.css'),
  vercel:JSON.parse(await read('vercel.json')),
};

function ids(html){return [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);}
function uniqueIds(name,html){
  const found=ids(html); const duplicates=[...new Set(found.filter((id,index)=>found.indexOf(id)!==index))];
  assert.deepEqual(duplicates,[],`${name} duplicate ids: ${duplicates.join(', ')}`);
}
function cssBalanced(name,css){
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,`${name} CSS braces are unbalanced.`);
}
function moduleSyntax(name,source){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  assert.equal(result.status,0,`${name} browser-module syntax failed:\n${result.stderr||result.stdout}`);
}

uniqueIds('Replay Notes',files.replayHtml);
uniqueIds('Flowtel client',files.loungeHtml);
uniqueIds('Guest House',files.guestHtml);
uniqueIds('Concierge',files.managerHtml);
cssBalanced('Replay Notes',files.replayCss);
cssBalanced('Flowtel client',files.loungeCss);
cssBalanced('Concierge',files.managerCss);
cssBalanced('Caddie compass',files.caddieCss);
cssBalanced('Caddie admin',files.caddieAdminCss);
moduleSyntax('Replay Notes',files.replayJs);
moduleSyntax('Flowtel client',files.loungeJs);
moduleSyntax('Concierge',files.managerJs);

// Workshop replay notes: append-only, private, cycle-aware, and owner-readable.
for(const token of [
  'create table if not exists public.flowtel_workshop_replay_notes',
  'flowtel_save_workshop_replay_note',
  'flowtel_get_my_workshop_replay_notes',
  'flowtel_admin_get_workshop_replay_notes',
  'flowtel_workshop_replay_notes_product_boundary',
  "public.flowtel_current_user_has_product_access('flowtel')",
  "'workshop_replay'::text",
  'flowtel_get_flow_map_entries',
]) assert(files.migration.includes(token),`Migration 050 missing replay-note requirement: ${token}`);
assert(files.migration.includes('revoke insert, update, delete on public.flowtel_workshop_replay_notes from authenticated'),'Replay notes are not append-only for browser roles.');
assert(files.migration.includes("timezone('America/Los_Angeles', now())"),'Replay notes do not use Flowtel Time.');
assert(files.migration.includes("coalesce(s.checkin_date::date,(timezone('America/Los_Angeles',s.checked_in_at))::date) = v_today"),'Replay notes should only copy cycle context from the current Flowtel Day stay.');
assert(files.replayJs.includes('getMoonMagic()'),'Replay notes do not capture current Moon context.');
assert(files.replayShared.includes('flowtel_save_workshop_replay_note'),'Replay-note save helper is missing.');
assert(files.managerJs.includes('listAdminWorkshopReplayNotes'),'Concierge owner replay-note reporting is missing.');
assert(files.managerHtml.includes('data-filter="workshop-notes"'),'Concierge Workshop Notes doorway is missing.');

// Lounge video, Flow FM gate, and embedded living note portal.
assert(files.loungeHtml.includes('/assets/Four-Seasons-Flowtel-Workshop.mp4'),'Approved Lounge video source is missing.');
assert(files.loungeHtml.includes('id="flowFmWorkshopLoungeCard"'),'Flow FM Lounge video card is missing.');
assert(files.loungeHtml.includes('/replay-notes/?workshop=four-seasons-flowtel-workshop'),'Embedded replay notes are missing beneath the Lounge video.');
assert(files.loungeJs.includes('effectiveFlowFmRank(currentProfile || {})<2'),'Lounge workshop is not gated to Flow FM members.');
assert((files.vercel.rewrites||[]).some(item=>item.source==='/replay-notes'&&item.destination==='/replay-notes/index.html'),'Replay Notes rewrite is missing.');
assert((files.vercel.headers||[]).some(item=>item.source==='/replay-notes'&&item.headers?.some(h=>h.key==='X-Robots-Tag')),'Replay Notes no-index header is missing.');

// Guest House quiet queue, neutral statuses, replay expiry, cleanup, and receipts.
assert(!files.guestCore.includes('Her Replay Room is ready'),'Gendered ready status remains.');
assert(!files.guestCore.includes("find her replay"),'Gendered unable-to-locate status remains.');
assert(files.managerJs.includes('guestHouseExpandedRequestId'),'One-at-a-time collapsed queue state is missing.');
assert(files.managerJs.includes('data-guest-house-toggle'),'Collapsed request toggle is missing.');
assert(files.managerJs.includes('purgeExpiredGuestHouseReplays'),'Owner-triggered expired replay cleanup is missing.');
assert(files.managerJs.includes('Housekeeping must never hide the owner queue'),'Cleanup failure is not isolated from the Guest House queue.');
for(const token of ['expires_at','view_count','download_count','flowtel_guest_house_admin_get_expired_files','replay_expired']){
  assert(files.migration.includes(token),`Migration 050 missing Guest House lifecycle item: ${token}`);
}
assert(files.guestPortalApi.includes('fileIsAvailable'),'Account portal does not enforce file expiration.');
assert(files.guestPortalApi.includes('fileReachedReplayExpiration'),'Account portal does not distinguish expiration from an owner-removed file.');
assert(files.guestAccessApi.includes('fileIsAvailable'),'Legacy portal does not enforce file expiration.');
assert(files.guestAccessApi.includes('fileReachedReplayExpiration'),'Legacy portal does not distinguish expiration from an owner-removed file.');
assert(files.guestPortalApi.includes('recordFileReceipt'),'Account portal does not record replay receipts.');
assert(files.guestAccessApi.includes('recordReceipt'),'Legacy portal does not record replay receipts.');
assert(files.guestShared.includes(".from(GUEST_HOUSE_REPLAY_BUCKET)"),'Expired private Storage removal is missing.');

// Guest House invitation copy cleanup.
assert(!files.guestHtml.includes('The Guest House is a threshold. The Queendom is the world beyond it.'),'Removed threshold headline remains.');
assert(/AN INVITATION BEYOND THE GUEST HOUSE/i.test(files.guestHtml),'Invitation eyebrow was removed.');
assert(files.guestHtml.includes('JOIN THE QUEENDOM'),'Invitation button was removed.');

// Caddie Magic practical scanning without changing product boundaries.
assert(files.caddieCss.includes('Upcoming Golf practical calendar typography'),'Portal Upcoming Golf font polish is missing.');
assert(files.caddieAdminCss.includes('owner Upcoming Golf practical calendar typography'),'Owner Upcoming Golf font polish is missing.');
assert(files.managerCss.includes('Caddie Magic Upcoming Golf calendar readability'),'Concierge Upcoming Golf font polish is missing.');

let assetPresent=true;
try{await access('assets/Four-Seasons-Flowtel-Workshop.mp4');}catch{assetPresent=false;}
if(!assetPresent) console.warn('WARNING: The Lounge code is complete, but assets/Four-Seasons-Flowtel-Workshop.mp4 was not present in the supplied source ZIP.');

console.log(`Five-experience update validation passed${assetPresent?' with the Lounge video asset present':' with one documented missing media asset'}.`);
