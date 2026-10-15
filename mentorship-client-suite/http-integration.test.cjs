const test=require('node:test'),assert=require('node:assert/strict');const {start}=require('./test-harness.cjs');
test('fictional owner and two clients: HTTP session lifecycle, private upload, focus, playback and isolation',async()=>{
 const h=await start();const {enrollment,session}=h.ids;
 async function request(role,kind,body,query=''){const res=await fetch(h.origin+'/api/caddie-acuity?mentorship='+kind+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+role,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}}
 const args={enrollmentId:enrollment,sessionId:session};
 try{
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
