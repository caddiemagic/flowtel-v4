import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const files={
  portalHtml:await readFile('guest-house/index.html','utf8'),
  portalJs:await readFile('guest-house/app.js','utf8'),
  portalCss:await readFile('guest-house/styles.css','utf8'),
  replayHtml:await readFile('guest-house/replay/index.html','utf8'),
  replayJs:await readFile('guest-house/replay/page.js','utf8'),
  replayCss:await readFile('guest-house/replay/styles.css','utf8'),
  managerHtml:await readFile('manager/index.html','utf8'),
  managerJs:await readFile('manager/app.js','utf8'),
  managerCss:await readFile('manager/styles.css','utf8'),
  accountApi:await readFile('api/guest-house-account.js','utf8'),
  requestApi:await readFile('api/guest-house-request.js','utf8'),
  portalApi:await readFile('api/guest-house-portal.js','utf8'),
  accessApi:await readFile('api/guest-house-access.js','utf8'),
  shared:await readFile('shared/guest-house.js','utf8'),
  core:await readFile('shared/guest-house-core.js','utf8'),
  server:await readFile('server/guest-house-server.js','utf8'),
  migration048:await readFile('database/migration-048-guest-house-call-replay-room.sql','utf8'),
  migration049:await readFile('database/migration-049-guest-house-accounts-replay-status-portal.sql','utf8'),
  migration050:await readFile('database/migration-050-five-experience-updates.sql','utf8'),
  migration059:await readFile('database/migration-059-guest-house-flow-fm-training-consent.sql','utf8'),
  migration060:await readFile('database/migration-060-guest-house-recording-choice-updates.sql','utf8'),
  supabase:await readFile('shared/supabase.js','utf8'),
};
const vercel=JSON.parse(await readFile('vercel.json','utf8'));

function ids(html){return [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);}
function validateUniqueIds(name,html){
  const found=ids(html);
  const duplicates=found.filter((id,index)=>found.indexOf(id)!==index);
  assert.deepEqual(duplicates,[],`${name} duplicate HTML ids: ${duplicates.join(', ')}`);
}
function validateCss(name,css){
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,`${name} CSS braces are unbalanced.`);
}
function assertIdsReferencedExist(name,html,js){
  const found=new Set(ids(html));
  const references=[...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match=>match[1]);
  const dynamic=new Set([
    'guestHouseReplayRequestForm','replayRequestStatus','refreshGuestHouseStatus','retryGuestHousePortal',
    'guestHouseTrainingConsentForm','trainingConsentStatus','trainingConsentTitle',
  ]);
  const missing=[...new Set(references)].filter(id=>!found.has(id)&&!dynamic.has(id));
  assert.deepEqual(missing,[],`${name} JavaScript references missing HTML ids: ${missing.join(', ')}`);
}

validateUniqueIds('Guest House account portal',files.portalHtml);
validateUniqueIds('Guest House legacy replay',files.replayHtml);
validateUniqueIds('Concierge Desk',files.managerHtml);
validateCss('Guest House account portal',files.portalCss);
validateCss('Guest House legacy replay',files.replayCss);
validateCss('Concierge Desk',files.managerCss);
assertIdsReferencedExist('Guest House account portal',files.portalHtml,files.portalJs);

for(const id of [
  'guestHouseTitle','accountCard','createAccountTab','signInTab','createGuestHouseAccountForm',
  'guestHouseSignInForm','guestHousePortal','portalContent','guestHouseSignOut',
]) assert(ids(files.portalHtml).includes(id),`Missing Guest House portal element: ${id}`);
for(const id of ['replayRoom','replayStatus']) assert(ids(files.replayHtml).includes(id),`Missing legacy replay element: ${id}`);
assert(ids(files.managerHtml).includes('guestHouseRequestCount'),'Guest House Concierge stat count is missing.');

assert(files.portalHtml.includes('CREATE MY GUEST HOUSE ACCOUNT'),'Guest House account creation doorway is missing.');
assert(files.portalHtml.includes('RETURN TO THE GUEST HOUSE'),'Guest House returning sign-in doorway is missing.');
assert(files.portalJs.includes('What do you remember about the call?'),'Approved call-memory field is missing.');
assert(!files.portalHtml.includes('Approximate call date'),'Approximate call date must be removed.');
assert(!files.portalHtml.includes('Private note for Megan'),'Requester private-note field must be removed.');
assert(files.portalJs.includes('flowtel_guest_house_submit_my_request'),'Replay request must be submitted only after authentication.');
assert(files.portalJs.includes('supabase.auth.getSession()'),'Remembered Guest House sessions are not restored.');
assert(files.portalJs.includes('supabase.auth.signInWithPassword'),'Guest House password sign-in is missing.');
assert(files.portalJs.includes('Concierge is locating your recording'),'Locating hospitality state is missing.');
assert(files.portalJs.includes('Your Replay Room is ready'),'Ready hospitality state is missing.');
assert(files.portalJs.includes("Concierge couldn't find your replay"),'Unable-to-locate hospitality state is missing.');
assert(files.core.includes("Concierge is locating the recording"),'Neutral owner-facing locating copy is missing.');
assert(files.core.includes("Replay Room is ready"),'Neutral owner-facing ready copy is missing.');
assert(files.core.includes("Concierge couldn't find the replay"),'Neutral owner-facing unable-to-locate copy is missing.');
assert(!/email invitation|email notification|notify me/i.test(files.portalHtml+files.portalJs),'Guest-facing email notification workflow must remain out of this release.');
assert(files.portalHtml.includes('JOIN THE QUEENDOM'),'Queendom invitation is missing from the Guest House portal.');

assert(files.portalJs.includes('A GENTLE INVITATION'),'Guest House training offering invitation is missing.');
assert(files.portalJs.includes('Moon Priestesses in training'),'Training audience is not explained to the guest.');
assert(files.portalJs.includes('flowtel_guest_house_submit_training_consent'),'Authenticated training-offering submission is missing.');
assert(files.core.includes("GUEST_HOUSE_TRAINING_COUPON_CODE = 'WITNESSED'"),'Complimentary-session coupon is missing.');
assert(files.core.includes("GUEST_HOUSE_TRAINING_SCHEDULE_URL = 'https://meganmichele.as.me/energyreading'"),'Complimentary-session schedule link is missing.');
assert(!files.portalJs.includes(' · PART '),'Independent replay files must not be mislabeled as recording parts.');
assert(files.portalCss.includes('.training-consent-card'),'Gentle Guest House training-offering styling is missing.');
assert(files.portalCss.includes('font-size:clamp(1.35rem,2.4vw,1.85rem)'),'Training offering headings must remain restrained rather than oversized.');

assert(files.accountApi.includes('/auth/v1/admin/users'),'Guest House account endpoint does not create the Auth identity.');
assert(files.accountApi.includes('email_confirm:true'),'Guest House account creation would require an email confirmation integration.');
assert(files.accountApi.includes("source:'flowtel_guest_house'"),'Guest House Auth source metadata is missing.');
assert(!files.accountApi.includes('/rest/v1/profiles'),'Guest House account endpoint must not create a Flowtel profile.');
assert(!files.accountApi.includes('flowtel_stays'),'Guest House account endpoint must not create a stay.');
assert(files.requestApi.includes('status(410)'),'Legacy anonymous request endpoint must be retired.');
assert(files.requestApi.includes('accountRequired:true'),'Retired request endpoint must direct visitors into an account.');
assert(files.server.includes('async function requireUser'),'Authenticated Guest House API verification helper is missing.');
assert(files.portalApi.includes('requireUser(req)'),'Guest House portal API is not verifying the signed-in user.');
assert(files.portalApi.includes('auth_user_id=eq.'),'Guest House portal ownership is not tied to the Auth user.');
assert(!files.portalApi.includes('&email=eq.'),'Guest House portal must never claim a legacy request by login email.');
assert(files.portalApi.includes('/storage/v1/object/sign/flowtel-guest-house-replays/'),'Account portal does not use signed private media URLs.');
assert(files.portalApi.includes('expiresIn:900'),'Account media links should expire after 15 minutes.');
assert(files.portalApi.includes('flowtel_guest_house_training_consents'),'Portal API does not return the latest append-only training permission.');
assert(!files.portalApi.includes('storage_path:file.storage_path'),'Private Storage paths must not be returned to visitors.');
assert(files.accessApi.includes('hashToken(token)'),'Existing legacy private room keys must remain hashed and supported.');

for(const table of ['guests','requests','files','events']){
  assert(files.migration048.includes(`alter table public.flowtel_guest_house_${table} enable row level security;`),`RLS missing for Guest House ${table}.`);
  assert(files.migration048.includes(`revoke all on public.flowtel_guest_house_${table} from anon, authenticated;`),`Browser table privileges were not revoked for Guest House ${table}.`);
}
assert(files.migration049.includes('auth_user_id uuid references auth.users(id)'),'Guest House account ownership column is missing.');
assert(files.migration049.includes('drop constraint if exists flowtel_guest_house_guests_email_key'),'Legacy and account identities must be allowed to remain separate even when an email matches.');
assert(files.migration049.includes('where g.auth_user_id = v_user_id'),'Account RPC ownership must use Auth identity rather than email matching.');
assert(!files.migration049.includes('where g.auth_user_id = v_user_id or g.email = v_email'),'Migration must not claim legacy requests by an unverified login email.');
assert(files.migration049.includes("'guest_house','player','flowtel_member'"),'Guest House product-access role is missing.');
assert(files.migration049.includes("v_access.access_role = 'guest_house'"),'Guest House accounts can still self-upgrade through the generic Flowtel doorway.');
assert(files.migration049.includes('flowtel_guest_house_claim_my_account'),'Guest House account claim RPC is missing.');
assert(files.migration049.includes('flowtel_guest_house_submit_my_request'),'Authenticated replay request RPC is missing.');
assert(files.migration049.includes("'locating','guest_house_account'"),'New account requests must begin in locating status.');
assert(files.migration049.includes('p_call_memory text'),'Approved call-memory-only request input is missing.');
assert(!/grant\s+(select|insert|update|delete)\s+on\s+public\.flowtel_guest_house_/i.test(files.migration049),'Direct Guest House table access was granted to a browser role.');

assert(files.migration059.includes('create table if not exists public.flowtel_guest_house_training_consents'),'Training consent receipt table is missing.');
assert(files.migration059.includes('alter table public.flowtel_guest_house_training_consents enable row level security;'),'Training consent RLS is missing.');
assert(files.migration059.includes('revoke all on public.flowtel_guest_house_training_consents from anon, authenticated;'),'Direct browser access to training consent receipts was not revoked.');
assert(files.migration059.includes("check (consent_action = 'granted')"),'Migration 059 grant-only foundation is missing.');
assert(files.migration059.includes('flowtel_guest_house_training_consents_request_unique_idx'),'Migration 059 duplicate-offering protection is missing.');
assert(files.migration059.includes('flowtel_guest_house_submit_training_consent'),'Guest consent RPC foundation is missing.');
assert(files.migration059.includes("v_coupon constant text := 'WITNESSED'"),'Shared gift coupon snapshot is missing from migration 059.');
assert(files.migration059.includes("v_schedule_url constant text := 'https://meganmichele.as.me/energyreading'"),'Gift scheduling URL snapshot is missing from migration 059.');
assert(files.migration059.includes("'training_consent_granted'"),'Guest House initial offering event type is missing.');
assert(files.migration059.includes('training_consent jsonb'),'Owner queue training permission snapshot is missing.');
assert(!files.portalJs.includes('withdrawTrainingConsent'),'Replay Room must not offer a standalone withdrawal button.');
assert(!files.portalJs.includes('flowtel_guest_house_withdraw_training_consent'),'Replay Room must not call a standalone withdrawal RPC.');
assert(files.portalJs.includes('Change which recordings I am sharing'),'Granted offerings must preserve the recording-choice editor.');
assert(files.portalJs.includes('SAVE MY RECORDING CHOICES'),'Recording-choice save action is missing.');
assert(files.portalJs.includes("data-training-mode=\"${isUpdate?'update':'initial'}\""),'Initial versus update recording-choice behavior is missing.');
assert(files.portalJs.includes('Your session has been received as an offering.'),'Offering confirmation copy is missing.');
assert(files.portalJs.includes('No recordings are currently selected for Flow FM.'),'Full deselection state is missing.');
assert(!files.portalJs.includes('Your gift remains yours even if'),'Gift copy must not promise preservation after a later choice change.');
assert(files.migration060.includes('drop index if exists public.flowtel_guest_house_training_consents_request_unique_idx'),'Migration 060 does not restore append-only recording-choice history.');
assert(files.migration060.includes("'granted','updated','withdrawn'"),'Migration 060 recording-choice actions are incomplete.');
assert(files.migration060.includes("'training_consent_updated'") && files.migration060.includes("'training_consent_withdrawn'"),'Migration 060 choice-change events are missing.');
assert(files.migration060.includes('previous_file_ids'),'Migration 060 does not preserve the prior selection in its event history.');
assert(files.migration060.includes('Review any Flow FM upload manually') || files.managerJs.includes('Review any Flow FM upload manually'),'Owner review notification is missing.');
assert(!/create\s+(or\s+replace\s+)?function\s+public\.flowtel_guest_house_withdraw_training_consent/i.test(files.migration060),'Migration 060 must not recreate a standalone withdrawal RPC.');
assert(files.migration060.includes('drop function if exists public.flowtel_guest_house_withdraw_training_consent(boolean);'),'Migration 060 must retire the older standalone withdrawal RPC.');
assert(!/grant\s+(select|insert|update|delete)\s+on\s+public\.flowtel_guest_house_training_consents/i.test(files.migration059+files.migration060),'Training consent table access was granted directly to a browser role.');
assert(files.supabase.includes('role === "guest_house"'),'Guest House route-boundary redirect is missing.');
assert(files.supabase.includes('/guest-house/?access=guest-house-only'),'Guest House-only accounts are not redirected safely.');
assert(files.supabase.includes('flowtel_claim_default_access'),'Same-account membership upgrade path is missing.');

assert(files.managerJs.includes('renderGuestHouseQueue'),'Guest House owner request queue is not wired.');
assert(files.managerJs.includes('uploadGuestHouseReplay'),'Owner replay upload is not wired.');
assert(files.managerJs.includes('guestHouseUploadsInFlight'),'Large replay upload state is not preserved.');
assert(files.managerJs.includes('guestHouseUploadDrafts'),'Selected replay file is not preserved.');
assert(files.managerJs.includes('multiple accept='),'Owner uploader does not accept multiple replay files.');
assert(files.managerJs.includes('UPLOADING ${position} OF ${files.length}'),'Sequential multi-replay progress is missing.');
assert(files.managerJs.includes("if(fileInput) fileInput.value=''"),'Completed batch files could be selected again accidentally after a retry.');
assert(files.managerJs.includes('showGuestHouseSelectedFiles(card,remaining)'),'Remaining replay selections are not refreshed after each batch upload.');
assert(files.managerJs.includes('guestHouseTrainingConsentMarkup'),'Owner training-permission status is missing.');
assert(files.managerJs.includes('Approved for Flow FM'),'Concierge does not clearly surface an approved recording offering.');
assert(files.managerJs.includes('Recording permission removed'),'Concierge does not surface a full recording deselection for review.');
assert(files.managerJs.includes('GUEST HOUSE ACCOUNT'),'Owner account recognition is missing.');
assert(files.managerJs.includes('LEGACY PRIVATE ROOM KEY'),'Existing anonymous requests and token links are not preserved.');
assert(!files.managerJs.includes('data-guest-house-email'),'Email invitation control must be removed for this release.');
assert(!files.managerJs.includes('sendGuestHouseInvitation'),'Concierge must not load an email integration for this release.');
assert(!files.managerJs.includes('CALL DATE / MONTH'),'Removed call-date field still appears in Concierge.');
assert(files.managerJs.includes('WHAT THE CLIENT REMEMBERS ABOUT THE CALL'),'Concierge call-memory field is missing.');
assert(!files.managerJs.includes('from "../shared/guest-house.js'),'Guest House must remain a lazy dependency of the Concierge access gate.');
assert(files.managerJs.includes('import("../shared/guest-house.js?v=0.10.74.2")'),'Guest House lazy module cache-bust is missing.');
assert(files.managerHtml.includes('import("./app.js?v=0.10.76")'),'Concierge dynamic loader cache-bust is missing.');


assert(files.migration050.includes("interval '28 days'"),'Migration 050 does not establish the 28-day replay stay.');
assert(files.migration050.includes('flowtel_guest_house_admin_get_expired_files'),'Expired replay cleanup RPC is missing.');
assert(files.migration050.includes('first_viewed_at'),'Replay view receipt fields are missing.');
assert(files.migration050.includes('first_downloaded_at'),'Replay download receipt fields are missing.');
assert(files.portalApi.includes('replayExpired'),'Authenticated portal does not explain an expired replay.');
assert(files.portalApi.includes('deletion_status'),'Authenticated portal does not enforce deletion state.');
assert(files.accessApi.includes('28-day stay'),'Legacy portal does not enforce the 28-day replay stay.');
assert(files.shared.includes('purgeExpiredGuestHouseReplays'),'Owner-triggered private Storage cleanup is missing.');
assert(files.managerJs.includes('guestHouseExpandedRequestId'),'Collapsed one-at-a-time Guest House request state is missing.');
assert(files.managerJs.includes('data-guest-house-toggle'),'Collapsed Guest House request controls are missing.');
assert(!files.managerJs.includes('Her Replay Room is ready'),'Gendered owner status copy should be removed.');
assert(!files.managerJs.includes("couldn't find her replay"),'Gendered unable-to-locate status copy should be removed.');

assert((vercel.rewrites||[]).some(item=>item.source==='/guest-house'&&item.destination==='/guest-house/index.html'),'Guest House rewrite missing.');
assert((vercel.rewrites||[]).some(item=>item.source==='/guest-house/replay'&&item.destination==='/guest-house/replay/index.html'),'Legacy Replay Room rewrite missing.');
assert((vercel.headers||[]).some(item=>item.source==='/guest-house/replay'&&item.headers?.some(header=>header.key==='X-Robots-Tag')),'Legacy Replay Room no-index header missing.');
assert(!files.supabase.includes('"/guest-house/"'),'Guest House must remain outside the Flowtel protected-prefix list.');

assert(files.shared.includes('resumableUpload'),'Large replay resumable upload is missing.');
assert(files.shared.includes('chunkSize:6*1024*1024'),'Supabase-compatible 6 MB chunks are missing.');
assert(files.shared.includes('GUEST_HOUSE_FINALIZE_PENDING'),'Completed Storage transfers are not protected from finalization failures.');
assert(files.core.includes('Global file size limit'),'Supabase global file-size guidance is missing.');
assert(files.replayJs.includes('sessionStorage.setItem(TOKEN_KEY'),'Legacy replay key preservation is missing.');
assert(files.replayJs.includes('window.history.replaceState'),'Legacy raw room key is not removed from the visible URL.');

for(const [name,source] of [
  ['Guest House portal',files.portalJs],
  ['Concierge browser module',files.managerJs],
]){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  assert.equal(result.status,0,`${name} syntax failed:\n${result.stderr||result.stdout}`);
}

console.log('Guest House accounts, multi-replay uploads, optional Flow FM training permission, shared gift session, signed media, owner workflow, legacy-link preservation, RLS, product boundaries, and browser-module validation passed.');
