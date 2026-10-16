// Owner-only preview diagnostic. Never called on page load or in production.
const crypto=require('node:crypto');
const {requireUser,requireOwner,serviceHeaders}=require('../server/guest-house-server.js');
const owner=require('./owner-repository.cjs'),client=require('./client-repository.cjs'),replay=require('./replay-owner.cjs');
const audio=require('./silent-audio.cjs');
const {failure}=require('./request.cjs');
const bucket='flowtel-mentorship-replays',running=new Set();
const available=()=>process.env.VERCEL_ENV==='preview';
async function run(ctx){
 if(!available())throw failure('Live verification is available only on development previews.',403);
 if(running.has(ctx.user.id))throw failure('A verification is already running. Wait for its result.',409);
 running.add(ctx.user.id);
 const runId=crypto.randomUUID(),steps=[],users=[],tokens=[];
 let enrollmentId,path,stage='Private bucket configuration',passed=false;
 const cleanup=[];
 const api=async(route,method='GET',body,headers=serviceHeaders(ctx.serviceKey))=>{
  const response=await fetch(ctx.supabaseUrl+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Verification service request failed');
  const text=await response.text();return text?JSON.parse(text):null;
 };
 const check=(condition)=>{if(!condition)throw Error('Verification assertion failed');};
 const step=async(label,fn)=>{stage=label;await fn();steps.push({label,status:'passed'});};
 const denied=async(fn)=>{try{await fn();}catch(error){if([401,403,404].includes(error.statusCode))return;throw error;}throw Error('Access unexpectedly allowed');};
 try{
  await step(stage,async()=>{const b=await api('/storage/v1/bucket/'+bucket);check(b.public===false);});
  const offerings=await owner.listOfferings(ctx);check(offerings.length>0);
  await step('Two disposable accounts · no invitation emails',async()=>{
   for(const suffix of ['a','b']){
    const email='flowtel-check-'+runId+'-'+suffix+'@example.com',password=crypto.randomBytes(32).toString('base64url');
    // Auth supports a caller-generated UUID. Track before the write, including uncertain responses.
    const id=crypto.randomUUID();users.push(id);
    const created=await api('/auth/v1/admin/users','POST',{id,email,password,email_confirm:true,user_metadata:{first_name:'Fictional verification'}});
    check(created.id===id);
    const login=await api('/auth/v1/token?grant_type=password','POST',{email,password});check(typeof login.access_token==='string');tokens.push(login.access_token);
   }
  });
  const contexts=await Promise.all(tokens.map(token=>requireUser({headers:{authorization:'Bearer '+token}})));
  const [a,b]=contexts;
  await step('Client accounts cannot use owner controls',async()=>{for(const token of tokens)await denied(()=>requireOwner({headers:{authorization:'Bearer '+token}}));});
  await step('Prepared access and client dashboard',async()=>{
   // Preallocate ID so cleanup still knows the resource if a write response is lost.
   enrollmentId=crypto.randomUUID();
   await api('/rest/v1/flowtel_mentorship_enrollments','POST',{id:enrollmentId,invited_email:a.user.email,offering_id:offerings[0].id,offering_snapshot:offerings[0],status:'draft',created_by:ctx.user.id,starts_on:'2020-01-01'});
   await owner.prepareSessions(ctx,{enrollmentId});await owner.prepareInvitation(ctx,{enrollmentId});
   await denied(()=>client.claimPreparedMentorship(b,enrollmentId));
   await client.claimPreparedMentorship(a,enrollmentId);
   check((await client.clientSuite(a,enrollmentId)).sessions.length>0);
   await denied(()=>client.clientSuite(b,enrollmentId));
  });
  const session=(await owner.listSessions(ctx,{enrollmentId}))[0],args={enrollmentId,sessionId:session.id};
  let recording;
  await step('Signed owner upload and hidden recording',async()=>{
   const target=await replay.beginUpload(ctx,{...args,mimeType:'audio/mpeg',sizeBytes:audio.length});path=target.path;
   const response=await fetch(ctx.supabaseUrl+'/storage/v1/object/upload/sign/'+bucket+'/'+path+'?token='+encodeURIComponent(target.token),{method:'PUT',headers:{'Content-Type':'audio/mpeg'},body:audio,signal:AbortSignal.timeout(8000)});check(response.ok);
   recording=await replay.finishUpload(ctx,{...args,path,title:'Fictional verification '+runId});
   await denied(()=>client.getReplayPlaybackUrl(a,{enrollmentId,replayId:recording.id}));
  });
  await step('Published private media and client isolation',async()=>{
   await replay.visibility(ctx,{...args,replayId:recording.id,visible:true});
   const playback=await client.getReplayPlaybackUrl(a,{enrollmentId,replayId:recording.id});
   const response=await fetch(playback.url,{signal:AbortSignal.timeout(8000)});check(response.ok);check(Buffer.from(await response.arrayBuffer()).equals(audio));
   await denied(()=>client.getReplayPlaybackUrl(b,{enrollmentId,replayId:recording.id}));
   const anonymous=await fetch(ctx.supabaseUrl+'/storage/v1/object/authenticated/'+bucket+'/'+path,{signal:AbortSignal.timeout(8000)});check([400,401,403,404].includes(anonymous.status));
  });
  await step('Hiding blocks new playback links',async()=>{await replay.visibility(ctx,{...args,replayId:recording.id,visible:false});await denied(()=>client.getReplayPlaybackUrl(a,{enrollmentId,replayId:recording.id}));});
  passed=true;
 }catch{steps.push({label:stage,status:'failed'});}
 finally{
  // Each cleanup is independent. Only IDs generated by this run are ever deleted.
  const clean=async(label,fn)=>{try{await fn();cleanup.push({label,status:'passed'});}catch{cleanup.push({label,status:'failed'});}};
  if(path)await clean('Remove test media',()=>api('/storage/v1/object/'+bucket,'DELETE',{prefixes:[path]}));
  if(enrollmentId)await clean('Remove test mentorship and sessions',()=>api('/rest/v1/flowtel_mentorship_enrollments?id=eq.'+enrollmentId,'DELETE'));
  for(let i=0;i<users.length;i++)await clean('Remove disposable account '+(i+1),async()=>{
   // Hard deletion revokes refresh sessions even if explicit logout was unavailable.
   if(tokens[i])try{await api('/auth/v1/logout?scope=global','POST',{}, {...serviceHeaders(ctx.serviceKey),Authorization:'Bearer '+tokens[i]});}catch{}
   await api('/auth/v1/admin/users/'+users[i],'DELETE');
  });
  running.delete(ctx.user.id);
 }
 const cleanupComplete=cleanup.every(s=>s.status==='passed');
 return {runId,passed:passed&&cleanupComplete,cleanupComplete,steps,cleanup,
  // Resource references are returned only when manual cleanup is required; never credentials.
  ...(!cleanupComplete?{remainingResourceReferences:{enrollmentId,path,userIds:users}}:{})};
}
module.exports={available,run};
