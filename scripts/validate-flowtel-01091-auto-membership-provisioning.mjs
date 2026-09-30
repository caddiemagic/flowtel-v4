import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const bridge=read('api/squarespace-bridge.js');
const commerce=read('server/squarespace-commerce.js');
const client=read('client/app.js');
const clientHtml=read('client/index.html');
const managerHtml=read('manager/index.html');
const membershipHtml=read('manager/membership/index.html');
const membershipJs=read('manager/membership/app.js');
const migration=read('database/migration-078-automatic-queendom-provisioning.sql');
const vercel=read('vercel.json');
const failures=[];
const expect=(ok,msg)=>{if(!ok)failures.push(msg);};

expect(clientHtml.includes('Queendom Members | Activate My Flowtel'),'Member doorway must activate Flowtel rather than ask for a second account signup.');
expect(clientHtml.includes('id="newAccountPasswordFields" class="new-account-password-fields hidden"'),'Paid-member activation must not require password fields in the activation form.');
expect(/\.\/app\.js\?v=0\.10\.91(?:\.\d+)?/.test(clientHtml),'Client JS cache key must remain on the v0.10.91.x line.');
expect(/\.\/styles\.css\?v=0\.10\.91(?:\.\d+)?/.test(clientHtml),'Client CSS cache key must remain on the v0.10.91.x line.');
expect(client.includes('verifySquarespaceMember(email,"provision"'),'Paid member activation must call the server provisioning boundary.');
expect(client.includes('you do not need to create another account here'),'New member activation must explain that no second manual account is required.');
expect(client.includes('if(!trial){'),'Paid activation and complimentary-stay signup must remain separate paths.');

expect(bridge.includes('intent === "provision" || intent === "activate-membership"'),'Squarespace bridge must expose a verified provisioning intent.');
expect(bridge.includes('querySquarespaceContact(normalizedEmail, { trustedDoorway: false })'),'Provisioning must require exact Squarespace contact verification fail-closed.');
expect(bridge.includes('verifySquarespaceMembershipPurchase(contact)'),'Provisioning must require a PAID mapped membership order.');
expect(bridge.includes('/auth/v1/invite?redirect_to='),'Missing Flowtel identities must be created through a Supabase invite.');
expect(bridge.includes('flowtel_apply_verified_membership_server'),'Server provisioning must apply membership through the dedicated migration-078 RPC.');
expect(bridge.includes('Membership reconciliation is reserved for the Flowtel Owner/Admin.'),'Reconciliation must be Owner/Admin-gated.');
expect(bridge.includes('intent === "admin-provision-memberships"'),'Owner batch provisioning action must exist.');
expect(commerce.includes('async function listOrders('),'Squarespace helper must support paid-order reconciliation scans.');

expect(migration.includes('create or replace function public.flowtel_apply_verified_membership_server'),'Migration 078 must create the server-only membership application function.');
expect(migration.includes('grant execute on function public.flowtel_apply_verified_membership_server')&&migration.includes('to service_role'),'Verified membership application RPC must be service-role only.');
expect(migration.includes("flowtel_access_status,'active')='revoked'"),'Auto provisioning must refuse revoked Flowtel identities.');
expect(migration.includes('membership_rank=greatest'),'Provisioning must never lower an existing membership rank.');
expect(migration.includes('flowtel_trial_converted_at'),'Provisioning must preserve/convert Complimentary Stay identity history.');

expect(managerHtml.includes('/manager/membership/'),'Owner Concierge Desk must link to Membership Reconciliation.');
expect(vercel.includes('"source": "/manager/membership"'),'Vercel must route the new static reconciliation room.');
expect(membershipHtml.includes('Queendom Membership Reconciliation'),'Membership reconciliation room must exist.');
expect(membershipJs.includes('admin-membership-reconciliation'),'Reconciliation room must request the Owner-only report.');
expect(membershipJs.includes('admin-provision-memberships'),'Reconciliation room must provision selected verified members.');
expect(membershipHtml.includes('Email mismatches are never auto-merged'),'Reconciliation UI must state the no-auto-merge boundary.');

const apiCount=fs.readdirSync(path.join(root,'api')).filter(name=>name.endsWith('.js')).length;
expect(apiCount===12,`Vercel API function count is ${apiCount}; expected 12/12.`);

if(failures.length){
  console.error(`Flowtel v0.10.91 Automatic Membership Provisioning validation failed (${failures.length}):`);
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
console.log('Flowtel v0.10.91 Automatic Membership Provisioning validation OK.');
