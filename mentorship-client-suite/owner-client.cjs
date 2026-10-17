const {fetchJson,serviceHeaders,userHeaders}=require('../server/guest-house-server.js');
const {failure}=require('./request.cjs');const {validate,endpoint,session}=require('./session-controls.cjs');
const {suiteForEnrollment}=require('./client-repository.cjs');
async function enrollment(ctx,id){
 if(!ctx?.user?.id||!ctx.token||!ctx.serviceKey||!ctx.supabaseUrl)throw failure('Verified owner context required',403);validate(id);
 const rows=await fetchJson(endpoint(ctx,'enrollments','select=id,client_user_id,invited_email,offering_id,offering_snapshot,status,starts_on,ends_on,support_ends_on&id=eq.'+id+'&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(rows)||rows.length!==1)throw failure('Mentorship not found',404);return rows[0];
}
async function flow(ctx,row){
 if(!row.client_user_id)return {available:false,reason:'This client has not connected her Flowtel account yet.',cycle:null,checkins:[],reflections:[],totalCheckins:null,name:null,subjectId:null};
 const headers=userHeaders(ctx.serviceKey,ctx.token),body=JSON.stringify({p_subject_id:row.client_user_id});
 try{
  // Both calls execute with the owner's JWT and the existing consent/owner checks.
  const [snapshot,entries]=await Promise.all([
   fetchJson(ctx.supabaseUrl+'/rest/v1/rpc/flowtel_get_cycle_subject_snapshot',{method:'POST',headers,body}),
   fetchJson(ctx.supabaseUrl+'/rest/v1/rpc/flowtel_get_cycle_data_entries?select=stay_id,client_id,checkin_date,cycle_start_date,cycle_day_actual,inner_season,reflection_text,reflection_created_at&order=checkin_date.desc,checked_in_at.desc&limit=60',{method:'POST',headers,body:JSON.stringify({p_subject_id:row.client_user_id,p_scope:'client'})})
  ]);
  if(!Array.isArray(entries))throw Error('Cycle entries unavailable');
  const safe=entries.filter(e=>e.client_id===row.client_user_id);
  const [{flowtelTodayISO,dateOnlyParts},{getInnerSeason}]=await Promise.all([import('../shared/flowtel-date.js'),import('../shared/seasons.js')]);
  let totalCheckins=null;try{const count=await fetch(ctx.supabaseUrl+'/rest/v1/flowtel_stays?select=id&client_id=eq.'+encodeURIComponent(row.client_user_id),{method:'HEAD',headers:{...headers,Prefer:'count=exact'}});if(count.ok){const match=count.headers.get('content-range')?.match(/\/(\d+)$/);if(match)totalCheckins=Number(match[1]);}}catch{}
  const latest=safe[0],today=flowtelTodayISO();let cycle=null;
  if(latest){let day=Number(latest.cycle_day_actual),calculated=false;const start=dateOnlyParts(latest.cycle_start_date),now=dateOnlyParts(today);if(start&&start.iso<=today){day=Math.max(1,Math.round((Date.UTC(now.year,now.month-1,now.day)-Date.UTC(start.year,start.month-1,start.day))/86400000)+1);calculated=true;}if(!Number.isInteger(day)||day<1)day=null;cycle={day,season:day?getInnerSeason(day):latest.inner_season||null,asOf:latest.checkin_date,calculated,reflections:null};}
  return {available:true,reason:null,subjectId:row.client_user_id,name:String(snapshot?.subject?.display_name||'').slice(0,160)||null,cycle,totalCheckins,checkins:safe.map(e=>({id:e.stay_id,date:e.checkin_date,day:e.cycle_day_actual,season:e.inner_season})),reflections:safe.filter(e=>typeof e.reflection_text==='string'&&e.reflection_text.trim()).map(e=>({id:e.stay_id,date:e.reflection_created_at||e.checkin_date,day:e.cycle_day_actual,season:e.inner_season,text:e.reflection_text}))};
 }catch(error){return {available:false,reason:error.statusCode===403?'Cycle sharing is not available under your current Flowtel permissions.':'Cycle details could not load. Try refreshing this client profile.',cycle:null,checkins:[],reflections:[],totalCheckins:null,name:null,subjectId:null};}
}
async function profile(ctx,id){const row=await enrollment(ctx,id);const [suite,context]=await Promise.all([suiteForEnrollment(ctx,row),flow(ctx,row)]);return {suite,flow:context,email:row.invited_email||null};}
async function playback(ctx,args){
 await enrollment(ctx,args.enrollmentId);await session(ctx,args);validate(args.replayId);
 const rows=await fetchJson(endpoint(ctx,'replays','select=id,storage_path&session_id=eq.'+args.sessionId+'&id=eq.'+args.replayId+'&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(rows)||rows.length!==1)throw failure('Recording not found',404);
 if(typeof rows[0].storage_path!=='string'||(!rows[0].storage_path.startsWith(args.enrollmentId+'/'+args.sessionId+'/')||rows[0].storage_path.includes('..')||rows[0].storage_path.includes('\\')))throw failure('Recording not found',404);
 const signed=await fetchJson(ctx.supabaseUrl+'/storage/v1/object/sign/flowtel-mentorship-replays/'+rows[0].storage_path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:serviceHeaders(ctx.serviceKey),body:JSON.stringify({expiresIn:300})});
 const raw=signed?.signedURL;if(typeof raw!=='string'||!['/object/sign/','/storage/v1/object/sign/'].some(p=>raw.startsWith(p))||raw.includes('\\')||raw.includes('..'))throw Error('Playback unavailable');const url=new URL(raw.startsWith('/object/')?'/storage/v1'+raw:raw,ctx.supabaseUrl);if(url.origin!==new URL(ctx.supabaseUrl).origin)throw Error('Playback unavailable');return {url:url.href,expiresInSeconds:300};
}
module.exports={profile,playback};
