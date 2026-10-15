const test = require('node:test');
const assert = require('node:assert/strict');
const {createDraftEnrollment,saveClientFocus,listOfferings,listEnrollments,updateDraftEnrollment}=require('./owner-repository.cjs');
const user='11111111-1111-4111-8111-111111111111';
const offering='22222222-2222-4222-8222-222222222222';
const enrollment='33333333-3333-4333-8333-333333333333';
const ctx={user:{id:user},supabaseUrl:'https://example.supabase.co',serviceKey:'fake-test-key'};
async function mockFetch(responses,run){
 const original=global.fetch; const requests=[];
 global.fetch=async (url,opts={})=>{
  requests.push({url:String(url),...opts});
  const next=responses.shift();
  assert.ok(next,'Unexpected HTTP request');
  return {ok:true,status:200,text:async()=>JSON.stringify(next)};
 };
 try {const result=await run();return {result,requests};}
 finally {global.fetch=original;}
}
test('draft enrollment snapshots offering, starts as draft, and does not issue invitations',async()=>{
 const {result,requests}=await mockFetch([[{id:offering,offering_key:'kundalini_creatrix',price_cents:577700,is_active:true}],[{id:enrollment,status:'draft',invited_email:'pilot@example.com',offering_id:offering}]],
 ()=>createDraftEnrollment(ctx,{email:'  PILOT@EXAMPLE.COM ',offeringId:offering}));
 assert.equal(result.status,'draft');
 assert.equal(requests.length,2);
 const posted=JSON.parse(requests[1].body);
 assert.equal(posted.invited_email,'pilot@example.com');
 assert.equal(posted.offering_snapshot.price_cents,577700);
 assert.equal(posted.created_by,user);
 assert.equal(requests[1].method,'POST');
});
test('reject invalid client email before any database access',async()=>{
 const {requests}=await mockFetch([],async()=>assert.rejects(createDraftEnrollment(ctx,{email:'not-email',offeringId:offering})));
 assert.equal(requests.length,0);
});
test('owner context is required before reading offerings',async()=>{
 await assert.rejects(listOfferings({}),/Verified owner context required/);
});
test('focus save updates only client-visible field, never private notes',async()=>{
 const {result,requests}=await mockFetch([[{id:enrollment}],[{enrollment_id:enrollment,focus_month:'2026-10-01',client_visible_focus:'Practice receiving'}]],()=>saveClientFocus(ctx,{enrollmentId:enrollment,month:'2026-10-01',focus:'Practice receiving'}));
 assert.equal(result.client_visible_focus,'Practice receiving');
 assert.equal(requests.length,2);
 const payload=JSON.parse(requests[1].body);
 assert.deepEqual(Object.keys(payload).sort(),['client_visible_focus','enrollment_id','focus_month','updated_at'].sort());
 assert.ok(requests[1].url.includes('on_conflict=enrollment_id,focus_month'));
});
test('invalid focus month and oversized focus rejected before network',async()=>{
 const {requests}=await mockFetch([],async()=>{
  await assert.rejects(saveClientFocus(ctx,{enrollmentId:enrollment,month:'2026-10-15',focus:'x'}));
  await assert.rejects(saveClientFocus(ctx,{enrollmentId:enrollment,month:'2026-10-01',focus:'x'.repeat(5001)}));
 });
 assert.equal(requests.length,0);
});

test('owner can list only limited non-sensitive enrollment fields',async()=>{
 const {result,requests}=await mockFetch([[{id:enrollment,status:'draft'}]],()=>listEnrollments(ctx));
 assert.equal(result.length,1);
 assert.match(requests[0].url,/limit=100/);
 assert.ok(!requests[0].url.includes('offering_snapshot'));
});
test('three-month offering calculates the end date automatically',async()=>{
 const replies=[[{id:enrollment,status:'draft',offering_snapshot:{duration_months:3,duration_days:null}}],[{id:enrollment,status:'draft',starts_on:'2026-10-20',ends_on:'2027-01-20'}]];
 const {requests}=await mockFetch(replies,()=>updateDraftEnrollment(ctx,{enrollmentId:enrollment,startsOn:'2026-10-20'}));
 assert.equal(requests.length,2);assert.match(requests[1].url,/status=eq.draft/);
 const payload=JSON.parse(requests[1].body);assert.equal(payload.ends_on,'2027-01-20');
});
test('month-end start date clamps to end-of-month',async()=>{
 const replies=[[{id:enrollment,status:'draft',offering_snapshot:{duration_months:3,duration_days:null}}],[{id:enrollment,status:'draft'}]];
 const {requests}=await mockFetch(replies,()=>updateDraftEnrollment(ctx,{enrollmentId:enrollment,startsOn:'2026-11-30'}));
 assert.equal(JSON.parse(requests[1].body).ends_on,'2027-02-28');
});
test('two-week offering calculates the end date',async()=>{
 const replies=[[{id:enrollment,status:'draft',offering_snapshot:{duration_days:14,duration_months:null}}],[{id:enrollment,status:'draft'}]];
 const {requests}=await mockFetch(replies,()=>updateDraftEnrollment(ctx,{enrollmentId:enrollment,startsOn:'2026-10-20'}));
 assert.equal(JSON.parse(requests[1].body).ends_on,'2026-11-03');
});
test('flexible calls have no invented expiry',async()=>{
 const replies=[[{id:enrollment,status:'draft',offering_snapshot:{duration_days:null,duration_months:null}}],[{id:enrollment,status:'draft'}]];
 const {requests}=await mockFetch(replies,()=>updateDraftEnrollment(ctx,{enrollmentId:enrollment,startsOn:'2026-10-20'}));
 assert.equal(JSON.parse(requests[1].body).ends_on,null);
});
test('invalid dates rejected without database requests',async()=>{
 const {requests}=await mockFetch([],async()=>{
  await assert.rejects(updateDraftEnrollment(ctx,{enrollmentId:enrollment,startsOn:'2026-02-30'}));
 });
 assert.equal(requests.length,0);
});

test('creating a draft saves start and calculated end date in one insert',async()=>{
 const responses=[[{id:offering,offering_key:'womb_activation',duration_days:14,duration_months:null,is_active:true}],[{id:enrollment,status:'draft'}]];
 const {requests}=await mockFetch(responses,()=>createDraftEnrollment(ctx,{email:'fictional@example.com',offeringId:offering,startsOn:'2026-10-20'}));
 assert.equal(requests.length,2);
 const payload=JSON.parse(requests[1].body);
 assert.equal(payload.starts_on,'2026-10-20');
 assert.equal(payload.ends_on,'2026-11-03');
});
test('invalid initial start date never inserts an enrollment',async()=>{
 const responses=[[{id:offering,offering_key:'womb_activation',duration_days:14,is_active:true}]];
 const {requests}=await mockFetch(responses,()=>assert.rejects(createDraftEnrollment(ctx,{email:'fictional@example.com',offeringId:offering,startsOn:'2026-02-30'})));
 assert.equal(requests.length,1);
});
