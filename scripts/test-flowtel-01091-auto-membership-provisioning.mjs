import assert from 'node:assert/strict';
import fs from 'node:fs';
const bridge=fs.readFileSync('api/squarespace-bridge.js','utf8');
const client=fs.readFileSync('client/app.js','utf8');
const migration=fs.readFileSync('database/migration-078-automatic-queendom-provisioning.sql','utf8');

const provision=(bridge.match(/async function provisionVerifiedMembership\([\s\S]*?\n\}/)||[''])[0];
assert.match(provision,/querySquarespaceContact\(normalizedEmail, \{ trustedDoorway: false \}\)/,'Provisioning must fail closed on exact contact verification.');
assert.match(provision,/verifySquarespaceMembershipPurchase\(contact\)/,'Provisioning must verify a paid mapped membership before Auth work.');
assert.match(provision,/findSupabaseAuthUserByEmail/,'Provisioning must look for the existing Auth identity before creating anything.');
assert.match(provision,/if \(!authUser\?\.id\)/,'Only a missing Auth identity may be invited.');
assert.match(provision,/inviteSupabaseFlowtelUser/,'Missing identities must receive a Flowtel invite.');
assert.match(provision,/applyVerifiedMembershipToAuthUser/,'Verified membership must be applied to the same resolved Auth user.');

const handlerProvision=(bridge.match(/if \(intent === "provision"[\s\S]*?\n    \}/)||[''])[0];
assert.match(handlerProvision,/provisionVerifiedMembership/,'Public member activation must use the strict provisioning function.');
assert.doesNotMatch(handlerProvision,/trustedDoorway:true/,'Public provisioning must never use trusted/unverified doorway mode.');

const paidPath=(client.match(/if\(!trial\)\{[\s\S]*?\n    return;\n  \}/)||[''])[0];
assert.match(paidPath,/verifySquarespaceMember\(email,"provision"/,'Paid member UI must provision instead of browser signUp.');
assert.doesNotMatch(paidPath,/createAccountWithEmail/,'Paid member activation must not create a second browser signup account.');
assert.match(paidPath,/bridge\.inviteSent/,'Paid member UI must distinguish newly invited and already-existing identities.');

assert.match(migration,/if v_auth_email<>lower\(trim\(coalesce\(p_email,''\)\)\) then/,'Server membership RPC must require exact Auth email equality.');
assert.match(migration,/raise exception 'This Flowtel identity is revoked/,'Revoked identities must require Owner review.');
assert.match(migration,/membership_rank=greatest/,'Existing higher membership rank must be preserved.');
assert.match(migration,/caddie_magic_access=coalesce\(public\.flowtel_product_access\.caddie_magic_access,false\)/,'Provisioning must preserve independent Caddie Magic access.');

console.log('Flowtel v0.10.91 Automatic Membership Provisioning behavior checks passed.');
