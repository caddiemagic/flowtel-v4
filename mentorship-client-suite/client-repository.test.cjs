const test=require('node:test');
const assert=require('node:assert/strict');
const {ownedEnrollment,clientSuite,listMyMentorships}=require('./client-repository.cjs');
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

test('mentorship list is scoped to logged-in client and exposes no invitation email',async()=>{
 const {output,calls}=await simulate([[{id:enrollment,offering_id:enrollment,status:'active',starts_on:'2026-10-01'}]],()=>listMyMentorships(ctx));
 assert.equal(output.length,1);
 assert.equal(output[0].id,enrollment);
 assert.equal(output[0].invited_email,undefined);
 assert.match(calls[0].url,/client_user_id=eq.11111111-1111-4111-8111-111111111111/);
 assert.ok(!calls[0].url.includes('invited_email'));
});

test('private suite does not query sessions, focus or replays for a different client',async()=>{
 const {calls}=await simulate([[]],()=>assert.rejects(clientSuite(ctx,enrollment),e=>e.statusCode===404));
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/client_user_id=eq./);
 assert.ok(!calls.some(call=>/flowtel_mentorship_(sessions|monthly_focus|replays)/.test(call.url)));
});
test('enrollment list filters out draft and archived statuses at the database boundary',async()=>{
 const {calls}=await simulate([[]],()=>listMyMentorships(ctx));
 assert.match(calls[0].url,/status=in\.\(invited,active,paused,completed\)/);
});

test('claim rejects unverified email before querying enrollment',async()=>{
 const {claimPreparedMentorship}=require('./client-repository.cjs');
 const {calls}=await simulate([],()=>assert.rejects(claimPreparedMentorship({...ctx,user:{id:user,email:'test@example.com'}},enrollment),e=>e.statusCode===403));
 assert.equal(calls.length,0);
});
test('specific prepared enrollment is claimed only after exact verified email match',async()=>{
 const {claimPreparedMentorship}=require('./client-repository.cjs');
 const verified={...ctx,user:{id:user,email:'pilot@example.com',email_confirmed_at:'2026-10-15T00:00:00Z'}};
 const {calls}=await simulate([[{id:enrollment,invited_email:'pilot@example.com'}],[{id:enrollment,status:'active',client_user_id:user}]],()=>claimPreparedMentorship(verified,enrollment));
 assert.equal(calls.length,2);
 assert.match(calls[0].url,/id=eq.22222222/);
 assert.match(calls[0].url,/invited_email=eq.pilot%40example.com/);
 assert.match(calls[1].url,/client_user_id=is.null/);
 assert.equal(JSON.parse(calls[1].options.body).client_user_id,user);
});
test('mismatched account cannot claim a specific enrollment',async()=>{
 const {claimPreparedMentorship}=require('./client-repository.cjs');
 const verified={...ctx,user:{id:user,email:'pilot@example.com',email_confirmed_at:'2026-10-15T00:00:00Z'}};
 const {calls}=await simulate([[]],()=>assert.rejects(claimPreparedMentorship(verified,enrollment),e=>e.statusCode===404));
 assert.equal(calls.length,1);
});
test('prepared enrollment discovery is limited to verified owner of email',async()=>{
 const {listPreparedMentorships}=require('./client-repository.cjs');
 const verified={...ctx,user:{id:user,email:'pilot@example.com',email_confirmed_at:'2026-10-15T00:00:00Z'}};
 const {output,calls}=await simulate([[{id:enrollment,offering_id:session,invited_email:'pilot@example.com'}]],()=>listPreparedMentorships(verified));
 assert.equal(output.length,1);
 assert.equal(output[0].invited_email,undefined);
 assert.match(calls[0].url,/invited_email=eq.pilot%40example.com/);
});

test('program titles are projected without exposing the offering snapshot',async()=>{
 const {output}=await simulate([[{id:enrollment,status:'active',offering_snapshot:{title:'Sacred Self-Study',internal:'PRIVATE'}}]],()=>listMyMentorships(ctx));assert.equal(output[0].programTitle,'Sacred Self-Study');assert.equal(output[0].offering_snapshot,undefined);assert.ok(!JSON.stringify(output).includes('PRIVATE'));
});
test('cycle context reuses the existing consent RPC with the client token and filters private profile data',async()=>{
 const {myFlowContext}=require('./client-repository.cjs');
 const {output,calls}=await simulate([{subject:{email:'PRIVATE'},current:{cycle_day:22,inner_season:'Inner Autumn',latest_checkin_date:'2026-10-15'}}],()=>myFlowContext({...ctx,token:'fictional-client-jwt'}));
 assert.deepEqual(output,{cycle:{day:22,season:'Inner Autumn',asOf:'2026-10-15'}});assert.equal(calls[0].options.headers.Authorization,'Bearer fictional-client-jwt');assert.equal(JSON.parse(calls[0].options.body).p_subject_id,user);assert.ok(!JSON.stringify(output).includes('PRIVATE'));
});
test('cycle context never substitutes service-role authority for a missing user token',async()=>{const {myFlowContext}=require('./client-repository.cjs');const {calls}=await simulate([],()=>assert.rejects(myFlowContext(ctx),e=>e.statusCode===401));assert.equal(calls.length,0);});
test('Zoom links are read only from client-owned scheduled appointments, never arbitrary URL schemes',async()=>{
 for(const [meeting,expected] of [['https://us02web.zoom.us/j/123','https://us02web.zoom.us/j/123'],['javascript:alert(1)',null],['https://zoom.us.attacker.example/j/123',null]]){
 const {output,calls}=await simulate([[{id:enrollment,status:'active',client_user_id:user}],[{id:session,appointment_id:session,status:'confirmed'}],[],[],[{id:session,status:'scheduled',external_payload:{location:meeting,internal:'PRIVATE-PAYLOAD'}}]],()=>clientSuite(ctx,enrollment));
 assert.equal(output.sessions[0].meeting_url,expected);assert.equal(output.sessions[0].appointment_id,undefined);assert.ok(!JSON.stringify(output).includes('PRIVATE-PAYLOAD'));assert.match(calls[4].url,/customer_user_id=eq.11111111/);
 }
});
