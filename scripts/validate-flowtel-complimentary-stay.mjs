import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};

const api=read('api/squarespace-bridge.js');
const client=read('client/app.js');
const html=read('client/index.html');
const access=read('shared/product-access.js');
const migration=read('database/migration-074-flowtel-complimentary-stay.sql');
const portal=read('server/acuity-server.js');

expect(api.includes('trial-signup') && api.includes('flowtel_trial_admissions'), 'Existing Squarespace bridge must prepare the trial admission.');
expect(api.includes('This email has already used its 14-day complimentary stay'), 'Trial admission must refuse a second claimed stay.');
expect(api.includes('existingAccount: Boolean(existingAuthUser)'), 'Existing Auth identities must be reused instead of duplicated.');
expect(api.includes('findSupabaseProductAccessByUserId') && api.includes('already has a Flowtel room key'), 'Existing legacy Flowtel access must not be reclassified as a complimentary stay.');
expect(!fs.existsSync(path.join(root,'api','trial-signup.js')), 'Complimentary Stay must not add a thirteenth Vercel API function.');

for(const column of ['flowtel_trial_started_at','flowtel_trial_ends_at','flowtel_trial_converted_at']){
  expect(migration.includes(column), `Migration 074 is missing ${column}.`);
}
expect(migration.includes('create table if not exists public.flowtel_trial_admissions'), 'Migration 074 must create the server-only trial admission table.');
expect(migration.includes('revoke all on public.flowtel_trial_admissions from anon, authenticated'), 'Trial admissions must be hidden from browsers.');
expect(migration.includes("v_trial_end:=v_trial_start + interval '14 days'"), 'Claim boundary must grant exactly one 14-day window.');
expect(migration.includes('claimed_at=coalesce(claimed_at,v_trial_start)'), 'Claimed trial start must be immutable once claimed.');
expect(migration.includes("access_source='complimentary-stay-expired'"), 'Expired stays must be durably marked without deleting history.');
expect(migration.includes('flowtel_trial_converted_at') && migration.includes('verified-flowtel-membership'), 'Verified membership must convert an existing trial rather than recreate the account.');
expect(migration.includes("A Queendom membership is required to choose a Mentor to the Moon."), 'Mentor relationship creation must remain a Queendom membership benefit.');
expect(migration.includes('flowtel_current_user_has_product_access') && migration.includes('flowtel_trial_ends_at <= now()'), 'Server-side product checks must reject an expired trial even before /client/ is opened.');
expect(migration.includes('Preserve pre-v0.10.88 canonical Flowtel access') && migration.includes('v_access.flowtel_trial_started_at is null') && migration.includes('coalesce(v_access.flowtel_access,false)'), 'Migration 074 must preserve preexisting legacy Flowtel access rows rather than reclassifying them as trials.');

expect(html.includes('Stay with us complimentary for 14 days'), 'Public Flowtel doorway is missing the complimentary-stay invitation.');
expect(html.includes('COMPLIMENTARY STAY · DAY 1 OF 14'), 'Suite is missing the complimentary-stay status banner.');
expect(html.includes('YOUR COMPLIMENTARY STAY IS COMPLETE'), 'Expired stay scene is missing.');
expect(html.includes('I Joined — Reopen My Room'), 'Expired stay scene must support same-account membership conversion.');

expect(client.includes('accountCreationMode="member"'), 'Client must keep paid-member signup separate from trial signup.');
expect(client.includes('trial?"trial-signup":"signup"'), 'Client must use the existing bridge with a distinct trial intent.');
expect(client.includes('if(!trial) metadata.membership_type=bridge.membershipType||"queendom"'), 'Trial Auth metadata must never claim Queendom membership.');
expect(client.includes('membershipType:bridge.membershipType') && client.includes('handleTrialMembershipRefresh'), 'Client must reopen the same account after verified membership purchase.');
expect(client.includes('wombMagicCard.classList.toggle("hidden",trial)') && client.includes('wombMagicPortalCard.classList.toggle("hidden",trial)'), 'Trial must hide both Womb Magic booking benefits.');
expect(client.includes('practitionerCard.classList.toggle("hidden",trial)'), 'Trial must hide Mentor to the Moon membership benefit.');
expect(client.includes('if(!isActiveComplimentaryStay()) await registerPendingEventDoorway()'), 'Trial must not enter the member event registration doorway.');
expect(client.includes('if(!isActiveComplimentaryStay())void prepareLoungeEvents'), 'Trial Lounge must not call the member event calendar RPC.');
expect(client.includes('scheduleComplimentaryStayExpiry') && client.includes('flowtel_trial_ends_at'), 'An already-open Suite must close when the 14-day timestamp is reached.');

expect(access.includes('isComplimentaryStayExpired') && access.includes('activeFlowtelAccess'), 'Shared product-access boundary must be expiry-aware.');
expect(access.includes('Your 14-day complimentary stay is complete.'), 'Direct Flowtel access denial must explain trial expiry without deleting history.');

expect(/membershipRank\(profile=\{\}\)[\s\S]*membershipRank\(profile\)<1/.test(portal) || portal.includes('membershipRank(profile)<1'), 'Womb Magic server boundary must still require Queendom membership rank.');

if(failures.length){
  console.error(`Complimentary Stay validation failed (${failures.length}):`);
  for(const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Flowtel v0.10.88 Complimentary Stay validation OK.');
