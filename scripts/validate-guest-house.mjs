import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files={
  requestHtml:await readFile('guest-house/index.html','utf8'),
  requestJs:await readFile('guest-house/app.js','utf8'),
  requestCss:await readFile('guest-house/styles.css','utf8'),
  replayHtml:await readFile('guest-house/replay/index.html','utf8'),
  replayJs:await readFile('guest-house/replay/page.js','utf8'),
  replayCss:await readFile('guest-house/replay/styles.css','utf8'),
  managerHtml:await readFile('manager/index.html','utf8'),
  managerJs:await readFile('manager/app.js','utf8'),
  managerCss:await readFile('manager/styles.css','utf8'),
  requestApi:await readFile('api/guest-house-request.js','utf8'),
  accessApi:await readFile('api/guest-house-access.js','utf8'),
  notifyApi:await readFile('api/guest-house-notify.js','utf8'),
  shared:await readFile('shared/guest-house.js','utf8'),
  core:await readFile('shared/guest-house-core.js','utf8'),
  migration:await readFile('database/migration-048-guest-house-call-replay-room.sql','utf8'),
  supabase:await readFile('shared/supabase.js','utf8'),
};
const vercel=JSON.parse(await readFile('vercel.json','utf8'));

function ids(html){return [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);}
function validateUniqueIds(name,html){const found=ids(html);const duplicates=found.filter((id,index)=>found.indexOf(id)!==index);assert.deepEqual(duplicates,[],`${name} duplicate HTML ids: ${duplicates.join(', ')}`);}
function validateCss(name,css){assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,`${name} CSS braces are unbalanced.`);}
validateUniqueIds('Guest House request',files.requestHtml);
validateUniqueIds('Guest House replay',files.replayHtml);
validateUniqueIds('Concierge Desk',files.managerHtml);
validateCss('Guest House request',files.requestCss);
validateCss('Guest House replay',files.replayCss);
validateCss('Concierge Desk',files.managerCss);

for(const id of ['guestHouseTitle','requestCard','requestTitle','guestHouseRequestForm','guestHouseRequestStatus']){
  assert(ids(files.requestHtml).includes(id),`Missing request-page element: ${id}`);
}
for(const id of ['replayRoom','replayStatus']) assert(ids(files.replayHtml).includes(id),`Missing replay-page element: ${id}`);
assert(ids(files.managerHtml).includes('guestHouseRequestCount'),'Guest House Concierge stat count is missing.');
assert(files.managerJs.includes('data-filter="guest-house"') || files.managerHtml.includes('data-filter="guest-house"'),'Guest House Concierge filter is missing.');
assert(files.managerJs.includes('renderGuestHouseQueue'),'Guest House owner request queue is not wired.');
assert(files.managerJs.includes('uploadGuestHouseReplay'),'Owner replay upload is not wired.');
assert(files.managerJs.includes('deactivateGuestHouseReplay'),'Safe removal of a mistaken replay is not wired.');
assert(files.managerJs.includes('prepareGuestHouseAccess'),'Private room-key preparation is not wired.');
assert(files.managerJs.includes('revokeGuestHouseAccess'),'Private room-key revocation is not wired.');
assert(files.managerJs.includes('sendGuestHouseInvitation'),'Optional invitation email is not wired.');

assert((vercel.rewrites||[]).some(item=>item.source==='/guest-house'&&item.destination==='/guest-house/index.html'),'Public Guest House rewrite missing.');
assert((vercel.rewrites||[]).some(item=>item.source==='/guest-house/replay'&&item.destination==='/guest-house/replay/index.html'),'Private Replay Room rewrite missing.');
assert((vercel.headers||[]).some(item=>item.source==='/guest-house/replay'&&item.headers?.some(header=>header.key==='X-Robots-Tag')),'Replay Room no-index header missing.');
assert(!files.supabase.includes('"/guest-house/"'),'Guest House must remain outside the Flowtel authenticated-route guard.');

for(const table of ['guests','requests','files','events']){
  assert(files.migration.includes(`alter table public.flowtel_guest_house_${table} enable row level security;`),`RLS missing for Guest House ${table}.`);
  assert(files.migration.includes(`revoke all on public.flowtel_guest_house_${table} from anon, authenticated;`),`Browser table privileges were not revoked for Guest House ${table}.`);
}
assert(files.migration.includes("'flowtel-guest-house-replays'"),'Private Guest House Storage bucket missing.');
assert(files.migration.includes("false,\n  2147483648"),'Guest House replay bucket must be private with the 2 GB MVP limit.');
assert(files.migration.includes('public.flowtel_current_user_is_concierge()'),'Owner-only Concierge policy is missing.');
assert(files.migration.includes("access_token_hash text unique"),'Hashed opaque room-key storage is missing.');
assert(files.migration.includes("access_token_hash is null or access_token_hash ~ '^[a-f0-9]{64}$'"),'Room-key hash format guard is missing.');
assert(files.migration.includes("event_type in ("),'Append-only Guest House event history is missing.');
assert(files.migration.includes('flowtel_guest_house_admin_deactivate_file'),'Owner-safe replay removal RPC is missing.');
assert(files.migration.includes("'request_created','status_changed','replay_uploaded','replay_removed','access_prepared'"),'Meaningful Guest House event types are missing.');
assert(!/grant\s+(select|insert|update|delete)\s+on\s+public\.flowtel_guest_house_/i.test(files.migration),'Direct Guest House table access was granted to a browser role.');

assert(!files.requestApi.includes('/auth/v1/admin/users'),'Public request must not create a Supabase Auth account.');
assert(!files.requestApi.includes('flowtel_product_access'),'Public request must not grant product access.');
assert(!files.requestApi.includes('membership_type'),'Public request must not create or alter membership.');
assert(!files.requestApi.includes('flowtel_stays'),'Public request must not create a Flowtel stay.');
assert(files.requestApi.includes('flowtel_guest_house_guests'),'Public request must create only the minimal Guest House identity.');
assert(files.requestApi.includes('requester_confirmed_ownership:true'),'Ownership confirmation is not preserved.');
assert(files.accessApi.includes('hashToken(token)'),'Replay Room token is not hashed before lookup.');
assert(files.accessApi.includes('/storage/v1/object/sign/flowtel-guest-house-replays/'),'Replay Room does not use short-lived signed private media URLs.');
assert(files.accessApi.includes('expiresIn:900'),'Signed media URLs should expire after 15 minutes.');
assert(files.notifyApi.includes('The recording is never attached'),'Invitation email attachment guard is missing.');
assert(files.notifyApi.includes('RESEND_API_KEY'),'Optional email configuration is not documented in code.');
assert(files.shared.includes('resumableUpload'),'Large call replay resumable upload is missing.');
assert(files.shared.includes('chunkSize:6*1024*1024'),'Supabase-compatible 6 MB resumable chunks are missing.');
assert(files.replayHtml.includes('noindex,nofollow,noarchive'),'Replay Room robots privacy metadata is missing.');
assert(files.replayJs.includes('sessionStorage.setItem(TOKEN_KEY'),'Replay key is not preserved privately for the browser session.');
assert(files.replayJs.includes('window.history.replaceState'),'Raw Replay Room key is not removed from the visible URL.');
assert(files.requestHtml.includes('does not create a Flowtel password'),'Guest House access separation copy is missing.');
assert(files.requestHtml.includes('JOIN THE QUEENDOM'),'Queendom invitation is missing from the public doorway.');
assert(files.replayJs.includes('JOIN THE QUEENDOM'),'Queendom invitation is missing from the Replay Room.');

console.log('Guest House HTML, CSS, routing, owner workflow, token privacy, Storage, RLS, and product-access separation validation passed.');
