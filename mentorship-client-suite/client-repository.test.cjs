const test=require('node:test');
const assert=require('node:assert/strict');
const {ownedEnrollment,clientSuite}=require('./client-repository.cjs');
const user='11111111-1111-4111-8111-111111111111';
const enrollment='22222222-2222-4222-8222-222222222222';
const session='33333333-3333-4333-8333-333333333333';
const ctx={user:{id:user},supabaseUrl:'https://example.supabase.co',serviceKey:'test-service-key'};
async function simulate(responses,action){
 const before=global.fetch;const calls=[];global.fetch=async (url,options)=>{calls.push({url:String(url),options});const reply=responses.shift();assert.notEqual(reply,undefined,'Unexpected fetch');return {ok:true,status:200,text:async()=>JSON.stringify(reply)}};
 try{return {output:await action(),calls}}finally{global.fetch=before}
}
test('rejects missing authenticated context before database request',async()=>{
 await assert.rejects(ownedEnrollment({},enrollment),/Verified authenticated context/);
});
test('denies cross-client enrollment without exposing other records',async()=>{
 const {calls}=await simulate([[]],()=>assert.rejects(ownedEnrollment(ctx,enrollment),e=>e.statusCode===404));
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/client_user_id=eq.11111111-1111-4111-8111-111111111111/);
});
test('client suite selects only approved fields and visible replay metadata',async()=>{
 const responses=[
 [{id:enrollment,offering_id:enrollment,status:'active',starts_on:'2026-10-01',ends_on:'2026-11-01',client_user_id:user}],
 [{id:session,session_number:1,session_kind:'activation',status:'confirmed'}],
 [{focus_month:'2026-10-01',client_visible_focus:'Practice receiving'}],
 [{id:enrollment,session_id:session,title:'Private replay',created_at:'2026-10-05T00:00:00Z',storage_path:'SHOULD_NOT_LEAK'}]
 ];
 const {output,calls}=await simulate(responses,()=>clientSuite(ctx,enrollment));
 assert.equal(output.replays.length,1);
 assert.equal(output.replays[0].storage_path,undefined);
 assert.equal(output.monthlyFocus[0].private_mentor_notes,undefined);
 assert.match(calls[3].url,/visible_to_client=eq.true/);
 assert.ok(!calls.some(c=>c.url.includes('select=*')));
 assert.ok(!calls.some(c=>c.url.includes('storage_path')||c.url.includes('private_mentor_notes')));
});
test('no session records means no replay query',async()=>{
 const {output,calls}=await simulate([[{id:enrollment,offering_id:enrollment,status:'active',client_user_id:user}],[],[]],()=>clientSuite(ctx,enrollment));
 assert.deepEqual(output.replays,[]);assert.equal(calls.length,3);
});
