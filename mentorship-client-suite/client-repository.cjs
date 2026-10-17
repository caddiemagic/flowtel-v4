// Private mentorship client reads. This module MUST be called only after requireUser(req).
// Never accept an enrollment owner or user id from request payload for authorization.
const {fetchJson,serviceHeaders,userHeaders}=require('../server/guest-house-server.js');
const {extractZoomMeetingUrl}=require('../server/acuity-server.js');
const {expectedClass,matchesClass}=require('./booking-rules.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function programTitle(snapshot){return typeof snapshot?.title==='string'?snapshot.title.slice(0,160):'Private mentorship';}
function context(ctx){if(!ctx?.user?.id||!ctx?.supabaseUrl||!ctx?.serviceKey)throw Error('Verified authenticated context required');}
function id(value){if(typeof value!=='string'||!UUID.test(value))throw Error('Invalid mentorship enrollment ID');return value;}
function endpoint(ctx,table,query){return ctx.supabaseUrl+'/rest/v1/flowtel_mentorship_'+table+'?'+query}
async function rows(ctx,table,query){const value=await fetchJson(endpoint(ctx,table,query),{headers:serviceHeaders(ctx.serviceKey)});if(!Array.isArray(value))throw Error('Unexpected mentorship response');return value;}
async function listMyMentorships(ctx){
 context(ctx);
 const records=await rows(ctx,'enrollments','select=id,offering_id,offering_snapshot,status,starts_on,ends_on&client_user_id=eq.'+encodeURIComponent(ctx.user.id)+'&status=in.(invited,active,paused,completed)&order=created_at.desc&limit=30');
 return records.map(record=>({id:record.id,offeringId:record.offering_id,status:record.status,startsOn:record.starts_on,endsOn:record.ends_on,programTitle:programTitle(record.offering_snapshot)}));
}
async function ownedEnrollment(ctx,enrollmentId){
 context(ctx);id(enrollmentId);
 const records=await rows(ctx,'enrollments','select=id,offering_id,offering_snapshot,status,starts_on,ends_on,support_ends_on,client_user_id&id=eq.'+encodeURIComponent(enrollmentId)+'&client_user_id=eq.'+encodeURIComponent(ctx.user.id)+'&status=in.(invited,active,paused,completed)&limit=1');
 if(records.length!==1) {const err=new Error('Mentorship not found');err.statusCode=404;throw err;}
 return records[0];
}
async function clientSuite(ctx,enrollmentId){
 const enrollment=await ownedEnrollment(ctx,enrollmentId);
 const selection='enrollment_id=eq.'+encodeURIComponent(enrollment.id);
 const sessions=await rows(ctx,'sessions','select=id,session_number,session_kind,duration_minutes,scheduled_at,timezone,status,appointment_id&'+selection+'&order=session_number.asc');
 const focus=await rows(ctx,'monthly_focus','select=focus_month,client_visible_focus&'+selection+'&order=focus_month.desc&limit=12');
 const ids=sessions.filter(s=>typeof s.id==='string'&&UUID.test(s.id)).map(s=>s.id);
 let replays=[];
 if(ids.length){
  const replayRows=await rows(ctx,'replays','select=id,session_id,title,created_at&visible_to_client=eq.true&session_id=in.('+ids.map(encodeURIComponent).join(',')+')&order=created_at.desc');
  const allowed=new Set(ids);
  replays=replayRows.filter(r=>allowed.has(r.session_id)).map(r=>({id:r.id,sessionId:r.session_id,title:r.title,createdAt:r.created_at}));
 }
 const appointmentIds=sessions.map(session=>session.appointment_id).filter(value=>typeof value==='string'&&UUID.test(value));
 let appointments=[];
 if(appointmentIds.length){
  appointments=await fetchJson(ctx.supabaseUrl+'/rest/v1/flowtel_external_appointments?select=id,starts_at,ends_at,external_payload,status&source_product=eq.flowtel&customer_user_id=eq.'+encodeURIComponent(ctx.user.id)+'&id=in.('+appointmentIds.join(',')+')',{headers:serviceHeaders(ctx.serviceKey)});
  if(!Array.isArray(appointments))throw Error('Unexpected appointment response');
 }
 const safeSessions=sessions.map(({appointment_id,...session})=>{
  const appointment=appointments.find(item=>item.id===appointment_id);let meetingUrl=null;
  const terminal=['completed','cancelled','missed'].includes(session.status);
  if(appointment_id&&!terminal){
   const expected=expectedClass(session,enrollment.offering_snapshot);
   const length=appointment?(Date.parse(appointment.ends_at)-Date.parse(appointment.starts_at))/60000:null;
   if(!appointment||!matchesClass(appointment,expected)||length!==session.duration_minutes){return {...session,status:'proposed',scheduled_at:null,meeting_url:null,booking_state:'needs_review'};}
   session.scheduled_at=appointment.starts_at;
   session.status={scheduled:'confirmed',rescheduled:'confirmed',completed:'completed',cancelled:'cancelled'}[appointment.status]||'proposed';
  }
  if(session.status==='confirmed'&&['scheduled','rescheduled'].includes(appointment?.status)){
   try{const parsed=new URL(extractZoomMeetingUrl(appointment.external_payload||{}));if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&(parsed.hostname==='zoom.com'||parsed.hostname.endsWith('.zoom.com')||parsed.hostname==='zoom.us'||parsed.hostname.endsWith('.zoom.us')||parsed.hostname==='zoomgov.com'||parsed.hostname.endsWith('.zoomgov.com')))meetingUrl=parsed.href;}catch{}
  }
  return {...session,meeting_url:meetingUrl,booking_state:appointment_id?'linked':null};
 });
 return {enrollment:{id:enrollment.id,offeringId:enrollment.offering_id,status:enrollment.status,startsOn:enrollment.starts_on,endsOn:enrollment.ends_on,supportEndsOn:enrollment.support_ends_on,programTitle:programTitle(enrollment.offering_snapshot),bookingMode:enrollment.offering_snapshot?.booking_mode||null},sessions:safeSessions,monthlyFocus:focus,replays};
}
async function listPreparedMentorships(ctx){
 context(ctx);
 const email=String(ctx.user.email||'').trim().toLowerCase();
 if(!email||!ctx.user.email_confirmed_at){const e=new Error('Verified email required.');e.statusCode=403;throw e;}
 const matches=await rows(ctx,'enrollments','select=id,offering_id,offering_snapshot,starts_on,ends_on,invited_email&status=eq.invited&client_user_id=is.null&invited_email=eq.'+encodeURIComponent(email)+'&limit=30');
 return matches.filter(x=>String(x.invited_email||'').trim().toLowerCase()===email).map(x=>({id:x.id,offeringId:x.offering_id,startsOn:x.starts_on,endsOn:x.ends_on,programTitle:programTitle(x.offering_snapshot)}));
}
async function claimPreparedMentorship(ctx,enrollmentId){
 context(ctx);id(enrollmentId);
 const email=String(ctx.user.email||'').trim().toLowerCase();
 if(!email||!ctx.user.email_confirmed_at){const e=new Error('Verified email required.');e.statusCode=403;throw e;}
 const matching=await rows(ctx,'enrollments','select=id,invited_email&id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.invited&client_user_id=is.null&invited_email=eq.'+encodeURIComponent(email)+'&limit=1');
 if(matching.length!==1||String(matching[0].invited_email||'').trim().toLowerCase()!==email){const e=new Error('Prepared mentorship not found for this account.');e.statusCode=404;throw e;}
 const claimed=await fetchJson(endpoint(ctx,'enrollments','id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.invited&client_user_id=is.null&invited_email=eq.'+encodeURIComponent(email)+'&select=id,status,client_user_id'),{
  method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),
  body:JSON.stringify({client_user_id:ctx.user.id,status:'active',updated_at:new Date().toISOString()})
 });
 if(!Array.isArray(claimed)||claimed.length!==1){const e=new Error('Mentorship was already claimed or is no longer available.');e.statusCode=409;throw e;}
 return {id:claimed[0].id,status:claimed[0].status};
}
async function getReplayPlaybackUrl(ctx,{enrollmentId,replayId}){
 const enrollment=await ownedEnrollment(ctx,enrollmentId);
 id(replayId);
 const matches=await rows(ctx,'replays','select=id,session_id,storage_path,visible_to_client&id=eq.'+encodeURIComponent(replayId)+'&visible_to_client=eq.true&limit=1');
 const replay=matches[0];if(!replay){const e=new Error('Replay not available');e.statusCode=404;throw e;}
 const sessionRows=await rows(ctx,'sessions','select=id&enrollment_id=eq.'+encodeURIComponent(enrollment.id)+'&id=eq.'+encodeURIComponent(replay.session_id)+'&limit=1');
 if(sessionRows.length!==1){const e=new Error('Replay not available');e.statusCode=404;throw e;}
 if(typeof replay.storage_path!=='string'||!replay.storage_path.startsWith(enrollment.id+'/'+replay.session_id+'/')||replay.storage_path.includes('..'))throw Error('Invalid replay storage location');
 const filePath=replay.storage_path.split('/').map(encodeURIComponent).join('/');
 const signed=await fetchJson(ctx.supabaseUrl+'/storage/v1/object/sign/flowtel-mentorship-replays/'+filePath,{
  method:'POST',headers:serviceHeaders(ctx.serviceKey),body:JSON.stringify({expiresIn:300})
 });
 // Storage REST returns a path relative to /storage/v1; tolerate the gateway-prefixed form too.
 const raw=signed?.signedURL;
 if(typeof raw!=='string'||!['/object/sign/','/storage/v1/object/sign/'].some(prefix=>raw.startsWith(prefix))||raw.includes('\\')||raw.includes('..'))throw Error('Playback link unavailable');
 const resolved=new URL(raw.startsWith('/object/')?'/storage/v1'+raw:raw,ctx.supabaseUrl);
 if(resolved.origin!==new URL(ctx.supabaseUrl).origin)throw Error('Playback link unavailable');
 return {url:resolved.href,expiresInSeconds:300};
}
module.exports={ownedEnrollment,clientSuite,listMyMentorships,listPreparedMentorships,claimPreparedMentorship,getReplayPlaybackUrl};

// Reuse the existing consent-aware RPC with the client's JWT, never service-role authorization.
async function myFlowContext(ctx,now=new Date()){
 context(ctx);if(!ctx.token){const e=new Error('Verified session required');e.statusCode=401;throw e;}
 const headers=userHeaders(ctx.serviceKey,ctx.token);
 // Reuse the same consent-aware cycle-data RPC as Flowtel, with a narrow projection.
 const history=await fetchJson(ctx.supabaseUrl+'/rest/v1/rpc/flowtel_get_cycle_data_entries?select=cycle_start_date,checkin_date,cycle_day_actual,inner_season&order=checkin_date.desc,checked_in_at.desc&limit=1',{method:'POST',headers,body:JSON.stringify({p_subject_id:ctx.user.id,p_scope:'self'})});
 if(!Array.isArray(history))throw Error('Cycle data unavailable');
 const latest=history[0];if(!latest?.checkin_date)return {cycle:null};
 const [{flowtelTodayISO,dateOnlyParts},{getInnerSeason}]=await Promise.all([import('../shared/flowtel-date.js'),import('../shared/seasons.js')]);
 const today=flowtelTodayISO(now),start=dateOnlyParts(latest.cycle_start_date),todayParts=dateOnlyParts(today);
 let day=Number(latest.cycle_day_actual),calculated=false;
 if(start&&start.iso<=today){day=Math.max(1,Math.round((Date.UTC(todayParts.year,todayParts.month-1,todayParts.day)-Date.UTC(start.year,start.month-1,start.day))/86400000)+1);calculated=true;}
 if(!Number.isInteger(day)||day<1)day=null;
 const season=day?getInnerSeason(day):null;
 let reflections=null;
 if(day){
  const q=new URLSearchParams({select:'id,flowtel_stays!inner(id)',client_id:'eq.'+ctx.user.id,'flowtel_stays.client_id':'eq.'+ctx.user.id,'flowtel_stays.or':'(cycle_day_actual.eq.'+day+',and(cycle_day_actual.is.null,cycle_day_calculated.eq.'+day+'),and(cycle_day_actual.is.null,cycle_day_calculated.is.null,cycle_day_claimed.eq.'+day+'))'});
  try{
   // HEAD counts rows without retrieving reflection text. Both tables remain under user RLS.
   const response=await fetch(ctx.supabaseUrl+'/rest/v1/flowtel_reflections?'+q,{method:'HEAD',headers:{...headers,Prefer:'count=exact'}});
   if(response.ok){const match=response.headers.get('content-range')?.match(/\/(\d+)$/);if(match)reflections=Number(match[1]);}
  }catch{} // An unavailable count must not turn into a false zero or hide the cycle.
 }
 return {cycle:{day,season,asOf:String(latest.checkin_date).slice(0,10),calculated,reflections}};
}

module.exports.myFlowContext=myFlowContext;
