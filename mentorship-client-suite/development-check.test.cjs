const test=require('node:test'),assert=require('node:assert/strict');
const {start}=require('./test-harness.cjs');
test('live diagnostic is preview-only, owner-only, exercises real HTTP contracts and removes its resources',async()=>{
 const h=await start(),env=process.env.VERCEL_ENV;
 const request=async(role)=>{const r=await fetch(h.origin+'/api/caddie-acuity?mentorship=owner',{method:'POST',headers:{Authorization:'Bearer '+role,'Content-Type':'application/json'},body:JSON.stringify({action:'verify-development'})});return {status:r.status,data:await r.json()};};
 try{
  process.env.VERCEL_ENV='production';assert.equal((await request('owner')).status,403);assert.equal(h.users.size,0);
  process.env.VERCEL_ENV='preview';assert.equal((await request('a')).status,403);assert.equal(h.users.size,0);
  const result=await request('owner');assert.equal(result.status,200);assert.equal(result.data.verification.passed,true,JSON.stringify(result.data));
  assert.equal(result.data.verification.steps.length,7);assert.equal(result.data.verification.cleanupComplete,true);
  assert.equal(h.users.size,0);assert.equal(h.objects.size,0);assert.equal(h.tables.enrollments.length,1);assert.equal(h.tables.sessions.length,1);assert.equal(h.tables.replays.length,0);
  assert.doesNotMatch(JSON.stringify(result.data),/access_token|password|serviceKey|signedURL|@example/);
 }finally{if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;await h.close();}
});
test('failed media check still removes accounts and enrollment; cleanup failure cannot report success',async()=>{
 const h=await start(),env=process.env.VERCEL_ENV,original=global.fetch;
 process.env.VERCEL_ENV='preview';
 let breakCleanup=false;
 try{
  global.fetch=async(url,options)=>{
   if(String(url).includes('/object/upload/sign/')&&options?.method==='PUT')return new Response('{}',{status:500});
   if(breakCleanup&&String(url).includes('/admin/users/')&&options?.method==='DELETE')return new Response('{}',{status:500});
   return original(url,options);
  };
  const {run}=require('./development-check.cjs'),ctx={user:{id:h.ids.offering},supabaseUrl:h.origin,serviceKey:'fictional-service'};
  let result=await run(ctx);assert.equal(result.passed,false);assert.equal(result.cleanupComplete,true);assert.equal(h.users.size,0);assert.equal(h.tables.enrollments.length,1);
  breakCleanup=true;result=await run(ctx);assert.equal(result.passed,false);assert.equal(result.cleanupComplete,false);assert.equal(result.remainingResourceReferences.userIds.length,2);assert.equal(h.tables.enrollments.length,1);
 }finally{global.fetch=original;if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;await h.close();}
});
test('lost account-creation response still cleans the preallocated identity',async()=>{
 const h=await start(),env=process.env.VERCEL_ENV,original=global.fetch;process.env.VERCEL_ENV='preview';
 try{
  global.fetch=async(url,options)=>{const response=await original(url,options);if(String(url).endsWith('/auth/v1/admin/users')&&options?.method==='POST')throw Error('Lost response');return response;};
  const result=await require('./development-check.cjs').run({user:{id:h.ids.offering},supabaseUrl:h.origin,serviceKey:'fictional-service'});
  assert.equal(result.passed,false);assert.equal(result.cleanupComplete,true);assert.equal(h.users.size,0);assert.equal(h.tables.enrollments.length,1);
 }finally{global.fetch=original;if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;await h.close();}
});
