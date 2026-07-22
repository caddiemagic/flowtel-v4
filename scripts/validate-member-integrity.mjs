import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const read=file=>readFile(path.join(root,file),'utf8');
const sql=await read('database/migration-054-flowtel-member-integrity-guest-profiles.sql');
const managerHtml=await read('manager/index.html');
const managerJs=await read('manager/app.js');
const managerCss=await read('manager/styles.css');
const clientHtml=await read('client/index.html');
const clientJs=await read('client/app.js');
const profileHtml=await read('profile/index.html');
const profileJs=await read('profile/app.js');
const betaHtml=await read('beta-request/index.html');
const betaJs=await read('beta-request/app.js');
const betaApi=await read('api/beta-request.js');
const profiles=await read('shared/profiles.js');
const productAccess=await read('shared/product-access.js');
const memberDirectory=await read('shared/member-directory.js');
const vercel=JSON.parse(await read('vercel.json'));

for(const token of [
  'profile_confirmation_required','profile_confirmed_at','flowtel_update_my_guest_profile',
  'flowtel_member_verifications','flowtel_access_audit_log','flowtel_admin_get_member_directory',
  'flowtel_admin_revoke_member_access','flowtel_admin_restore_member_access',
  "flowtel_access_status = 'revoked'","if v_access.flowtel_access_status = 'revoked' then return false"
]) assert(sql.toLowerCase().includes(token.toLowerCase()),`Migration 054 is missing ${token}.`);

assert(sql.includes("lower(coalesce(p.email, '')) = 'mm.johnson@icloud.com'"),'Owner-only directory boundary is missing.');
assert(sql.includes('coalesce(p.concierge_access_enabled, false) = true'),'Owner directory must require the live Concierge capability flag.');
assert(sql.includes(`when p.squarespace_contact_id is not null and p.squarespace_verified_at is not null
          then 'contact_found'`),'Squarespace contacts must remain evidence rather than automatic Member Site verification.');
assert(sql.includes("coalesce(a.flowtel_access, false) as flowtel_access"),'Missing product-access rows must not be treated as active Flowtel access.');
assert(sql.includes("access_role = case") && sql.includes("when access_role = 'player' then 'flowtel_member'"),'Restore must reconcile a Player-only access role before granting Flowtel.');
assert(!/delete\s+from\s+public\.flowtel_(stays|notes|product_access)/i.test(sql),'Migration 054 destructively deletes Flowtel history.');
assert(!/update\s+auth\.users[\s\S]{0,240}encrypted_password/i.test(sql),'Migration 054 touches personal passwords.');
assert.equal((sql.match(/\$\$/g)||[]).length%2,0,'Migration 054 has an unmatched dollar quote.');

assert(managerHtml.includes('data-filter="member-directory"'));
assert(managerHtml.includes('id="flowtelMemberCount"'));
assert(managerJs.includes('renderMemberDirectoryQueue'));
assert(managerJs.includes('Last Sign-In') && managerJs.includes('Last Flowtel Check-In'));
assert(managerJs.includes('revokeFlowtelMemberAccess') && managerJs.includes('restoreFlowtelMemberAccess'));
assert(!managerJs.includes('from "../shared/member-directory.js'), 'Member Directory must not be a top-level Concierge dependency.');
assert(managerJs.includes('flowtel_admin_get_member_directory') && managerJs.includes('flowtel_admin_set_member_verification'), 'Concierge must contain its owner Member Directory RPC boundary.');
assert(!managerJs.includes('import("../shared/member-directory.js'), 'Concierge must not depend on a separately deployed Member Directory module.');
assert(managerJs.includes('the rest of the Concierge Desk remains available'), 'Member Directory failure must degrade locally instead of blocking the entire Desk.');
assert(managerJs.includes('Flowtel Not Granted'),'All view must distinguish non-granted records from active members.');
assert(managerCss.includes('.member-directory-row'));
assert(memberDirectory.includes('flowtel_admin_get_member_directory'));
assert(memberDirectory.includes('flowtel_admin_set_member_verification'));

assert(clientHtml.includes('id="suiteProfileLink"'));
assert(clientJs.includes('profileNeedsConfirmation'));
assert(clientJs.includes('maybeRouteToProfileConfirmation'));
assert(profileHtml.includes('Name Shown in the Queendom'));
for(const field of ['firstName','lastName','displayName','email','location','timezone']) assert(profileHtml.includes(`id="${field}"`),`Profile field missing: ${field}`);
assert(profileJs.includes('updateMyGuestProfile'));
assert(profiles.includes('profileNeedsConfirmation'));
assert(profiles.includes('flowtel_update_my_guest_profile'));

for(const field of ['firstName','lastName','displayName','location','timezone']) assert(betaHtml.includes(`id="${field}"`),`Beta request field missing: ${field}`);
assert(betaJs.includes('payload.displayName') && betaJs.includes('payload.timezone'));
assert(betaApi.includes('profile_confirmation_required: false'));
assert(betaApi.includes('profile_confirmed_at: new Date().toISOString()'));
assert(betaApi.includes('function isValidTimeZone'));
assert(betaApi.includes('first_name: profileInput.firstName'));
assert(!betaApi.includes('Compatibility fallback if migration 054'),'Beta requests must fail visibly rather than silently dropping required profile fields.');

assert(productAccess.includes('flowtel_access_status === "revoked"'));
assert((vercel.rewrites||[]).some(row=>row.source==='/profile'&&row.destination==='/profile/index.html'));

function duplicateIds(html){const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);return ids.filter((id,index)=>ids.indexOf(id)!==index);}
for(const [name,html] of Object.entries({manager:managerHtml,client:clientHtml,profile:profileHtml,beta:betaHtml})) assert.deepEqual(duplicateIds(html),[],`${name} contains duplicate IDs.`);

console.log('Flowtel v0.10.69.2 member integrity and Member Directory deployment validation passed.');
