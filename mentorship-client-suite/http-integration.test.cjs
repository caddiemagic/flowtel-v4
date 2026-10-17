const test=require('node:test'),assert=require('node:assert/strict');const {start}=require('./test-harness.cjs');
test('monthly focus retrieval is owner-only and limited to the requested client and month',async()=>{
 const h=await start();
 try{
  h.tables.monthly_focus.push({enrollment_id:h.ids.enrollment,focus_month:'2026-10-01',client_visible_focus:'Saved October',private_mentor_notes:'PRIVATE-NOTES'},{enrollment_id:h.ids.enrollment,focus_month:'2026-11-01',client_visible_focus:'Other month'});
  const get=role=>fetch(h.origin+'/api/caddie-acuity?mentorship=owner&focusFor='+h.ids.enrollment+'&month=2026-10-01',{headers:{Authorization:'Bearer '+role}});
  assert.equal((await get('a')).status,403);assert.equal((await get('b')).status,403);
  const response=await get('owner');assert.equal(response.status,200);assert.deepEqual((await response.json()).focus,{month:'2026-10-01',focus:'Saved October'});
 }finally{await h.close();}
});
test('fictional owner and two clients: HTTP session lifecycle, private upload, focus, playback and isolation',async()=>{
 const h=await start();const {enrollment,session}=h.ids;
 async function request(role,kind,body,query=''){const res=await fetch(h.origin+'/api/caddie-acuity?mentorship='+kind+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+role,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}}
 const args={enrollmentId:enrollment,sessionId:session};
 try{
 const invalidTime=await request('owner','owner',{action:'set-session-time',...args,scheduledAt:'2020-01-01T11:00:00'});assert.equal(invalidTime.status,400);assert.match(invalidTime.data.error,/timestamp with time zone/);
 const invalidFocus=await request('owner','owner',{action:'save-focus',enrollmentId:enrollment,month:'invalid',focus:'Fictional focus'});assert.equal(invalidFocus.status,400);assert.match(invalidFocus.data.error,/YYYY-MM-01/);
 assert.equal((await request('b','owner',{action:'session-transition',...args,operation:'confirm'})).status,403);
 assert.equal((await request('owner','owner',{action:'set-session-time',...args,scheduledAt:'2027-01-20T11:00:00-08:00'})).status,200);
 assert.equal((await request('owner','owner',{action:'session-transition',...args,operation:'confirm'})).data.session.status,'confirmed');
 assert.equal((await request('a','client',null,'&enrollmentId='+enrollment)).data.suite.sessions[0].status,'confirmed');
 assert.equal((await request('owner','owner',{action:'set-session-time',...args,scheduledAt:'2027-01-21T11:00:00-08:00'})).data.session.status,'proposed');
 assert.equal((await request('owner','owner',{action:'session-transition',...args,operation:'confirm'})).status,200);
 assert.equal((await request('owner','owner',{action:'session-transition',...args,operation:'complete'})).data.session.status,'completed');
 assert.equal((await request('owner','owner',{action:'session-transition',...args,operation:'cancel'})).status,409);
 assert.equal((await request('owner','owner',{action:'save-focus',enrollmentId:enrollment,month:'2027-01-01',focus:'Fictional January focus'})).status,200);
 const upload=await request('owner','owner',{action:'begin-upload',...args,mimeType:'video/mp4',sizeBytes:20});assert.equal(upload.status,200);
 h.objects.set(upload.data.upload.path,{metadata:{size:20,mimetype:'video/mp4'}});
 const saved=await request('owner','owner',{action:'finish-upload',...args,path:upload.data.upload.path,title:'Fictional private replay'});assert.equal(saved.status,201);
 const playback='&enrollmentId='+enrollment+'&playbackReplayId='+saved.data.replay.id;
 assert.equal((await request('a','client',null,playback)).status,404);
 assert.equal((await request('owner','owner',{action:'replay-visibility',...args,replayId:saved.data.replay.id,visible:true})).status,200);
 const a=await request('a','client',null,'&enrollmentId='+enrollment);assert.equal(a.data.suite.monthlyFocus[0].client_visible_focus,'Fictional January focus');assert.equal(a.data.suite.replays.length,1);assert.ok(!JSON.stringify(a.data).includes('storage_path'));
 assert.equal((await request('a','client',null,playback)).status,200);
 assert.equal((await request('b','client',null,playback)).status,404);
 assert.deepEqual((await request('b','client')).data.enrollments,[]);
 await request('owner','owner',{action:'replay-visibility',...args,replayId:saved.data.replay.id,visible:false});assert.equal((await request('a','client',null,playback)).status,404);
 }finally{await h.close()}
});

test('owner can backfill, confirm and complete a historical session',async()=>{
 const h=await start();
 const args={enrollmentId:h.ids.enrollment,sessionId:h.ids.session};
 async function action(body){const res=await fetch(h.origin+'/api/caddie-acuity?mentorship=owner',{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({...args,...body})});assert.equal(res.status,200);return res.json()}
 try{
 const proposed=await action({action:'set-session-time',scheduledAt:'2020-01-01T11:00:00-08:00'});
 assert.equal(proposed.session.scheduled_at,'2020-01-01T19:00:00.000Z');assert.equal(proposed.session.status,'proposed');
 assert.equal((await action({action:'session-transition',operation:'confirm'})).session.status,'confirmed');
 assert.equal((await action({action:'session-transition',operation:'complete'})).session.status,'completed');
 }finally{await h.close()}
});
test('access email preview and sending require owner authorization and prepared access',async()=>{
 const h=await start();try{
 for(const role of ['a','b']){
 const headers={Authorization:'Bearer '+role,'Content-Type':'application/json'};
 assert.equal((await fetch(h.origin+'/api/caddie-acuity?mentorship=owner&accessEmailFor='+h.ids.enrollment,{headers})).status,403);
 assert.equal((await fetch(h.origin+'/api/caddie-acuity?mentorship=owner',{method:'POST',headers,body:JSON.stringify({action:'send-access-email',enrollmentId:h.ids.enrollment})})).status,403);
 }
 const get=()=>fetch(h.origin+'/api/caddie-acuity?mentorship=owner&accessEmailFor='+h.ids.enrollment,{headers:{Authorization:'Bearer owner'}});
 let r=await get();assert.equal(r.status,200);const m=(await r.json()).emailPreview;assert.equal(m.email,'fictional-a@example.com');assert.ok(!JSON.stringify(m).includes('fictional-service'));
 h.tables.enrollments[0].status='draft';r=await get();assert.equal(r.status,409);
 }finally{await h.close();}
});
test('owner archive removes mentorship access, preserves history and supports conservative restoration',async()=>{
 const h=await start();const id=h.ids.enrollment;
 const req=async(role,action)=>fetch(h.origin+'/api/caddie-acuity?mentorship=owner',{method:'POST',headers:{Authorization:'Bearer '+role,'Content-Type':'application/json'},body:JSON.stringify({action,enrollmentId:id})});
 const get=async(role,kind,query='')=>fetch(h.origin+'/api/caddie-acuity?mentorship='+kind+query,{headers:{Authorization:'Bearer '+role}});
 try{
 for(const action of ['archive-client','restore-client']){assert.equal((await req('a',action)).status,403);assert.equal((await req('b',action)).status,403);}
 const sessions=JSON.stringify(h.tables.sessions);assert.equal((await req('owner','archive-client')).status,200);
 assert.equal(h.tables.enrollments[0].status,'archived');assert.equal(JSON.stringify(h.tables.sessions),sessions);
 assert.equal((await (await get('owner','owner')).json()).enrollments.length,0);
 assert.equal((await (await get('owner','owner','&enrollmentView=archived')).json()).enrollments.length,1);
 assert.equal((await (await get('a','client')).json()).enrollments.length,0);
 assert.equal((await get('a','client','&enrollmentId='+id)).status,404);
 assert.equal((await get('a','client','&enrollmentId='+id+'&playbackReplayId=ffffffff-ffff-4fff-8fff-ffffffffffff')).status,404);
 assert.equal((await get('owner','owner','&accessEmailFor='+id)).status,409);
 assert.equal((await req('owner','archive-client')).status,200);
 assert.equal((await req('owner','restore-client')).status,200);assert.equal(h.tables.enrollments[0].status,'paused');
 assert.equal((await get('a','client','&enrollmentId='+id)).status,200);
 assert.equal((await req('owner','restore-client')).status,409);
 h.tables.enrollments[0].client_user_id=null;h.tables.enrollments[0].status='invited';
 assert.equal((await req('owner','archive-client')).status,200);assert.equal((await req('owner','restore-client')).status,200);assert.equal(h.tables.enrollments[0].status,'draft');
 assert.equal(h.tables.enrollments.length,1);assert.equal(JSON.stringify(h.tables.sessions),sessions);
 }finally{await h.close();}
});
test('owner client profile reuses the client projection and permission-checked cycle chart without impersonation',async()=>{
 const h=await start();const id=h.ids.enrollment;const get=(role,query)=>fetch(h.origin+'/api/caddie-acuity?mentorship=owner'+query,{headers:{Authorization:'Bearer '+role}});
 try{
 for(const role of ['a','b'])assert.equal((await get(role,'&profileFor='+id)).status,403);
 let r=await get('owner','&profileFor='+id);assert.equal(r.status,200);const profile=await r.json();assert.equal(profile.flow.name,'Fictional Aurora');assert.equal(profile.flow.cycle.day,22);assert.equal(profile.flow.totalCheckins,3);assert.equal(profile.flow.reflections[0].text,'Fictional shared reflection: making room to receive.');assert.ok(!JSON.stringify(profile).includes('PRIVATE-SHOULD-NOT-LEAK'));
 const client=await fetch(h.origin+'/api/caddie-acuity?mentorship=client&enrollmentId='+id,{headers:{Authorization:'Bearer a'}});assert.deepEqual(profile.suite,(await client.json()).suite);
 h.tables.enrollments[0].client_user_id=h.ids.b;r=await get('owner','&profileFor='+id);const denied=await r.json();assert.equal(denied.flow.available,false);assert.deepEqual(denied.flow.reflections,[]);assert.equal(denied.flow.subjectId,null);
 h.tables.enrollments[0].client_user_id=null;r=await get('owner','&profileFor='+id);assert.match((await r.json()).flow.reason,/has not connected/);
 assert.equal((await get('owner','&profileFor=invalid')).status,400);
 }finally{await h.close();}
});
test('owner replay playback is restricted to the requested enrollment and session',async()=>{
 const h=await start();try{const rid='ffffffff-ffff-4fff-8fff-ffffffffffff',path=h.ids.enrollment+'/'+h.ids.session+'/'+rid+'.mp3';h.tables.replays.push({id:rid,session_id:h.ids.session,title:'Fictional private replay',storage_path:path,visible_to_client:false});
 const query='&ownerReplay='+rid+'&sessionId='+h.ids.session+'&enrollmentId='+h.ids.enrollment;
 const get=(role,q=query)=>fetch(h.origin+'/api/caddie-acuity?mentorship=owner'+q,{headers:{Authorization:'Bearer '+role}});
 assert.equal((await get('a')).status,403);assert.equal((await get('b')).status,403);
 const r=await get('owner');assert.equal(r.status,200);assert.equal((await r.json()).playback.expiresInSeconds,300);
 assert.equal((await get('owner',query.replace(h.ids.session,h.ids.offering))).status,404);
 h.tables.replays[0].storage_path=h.ids.offering+'/'+h.ids.session+'/'+rid+'.mp3';assert.equal((await get('owner')).status,404);
 }finally{await h.close();}
});
