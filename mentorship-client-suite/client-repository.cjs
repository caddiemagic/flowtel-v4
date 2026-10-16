// Private mentorship client reads. This module MUST be called only after requireUser(req).
// Never accept an enrollment owner or user id from request payload for authorization.
const {fetchJson,serviceHeaders,userHeaders}=require('../server/guest-house-server.js');
const {extractZoomMeetingUrl}=require('../server/acuity-server.js');
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
  appointments=await fetchJson(ctx.supabaseUrl+'/rest/v1/flowtel_external_appointments?select=id,external_payload,status&customer_user_id=eq.'+encodeURIComponent(ctx.user.id)+'&id=in.('+appointmentIds.join(',')+')&status=eq.scheduled',{headers:serviceHeaders(ctx.serviceKey)});
  if(!Array.isArray(appointments))throw Error('Unexpected appointment response');
 }
 const safeSessions=sessions.map(({appointment_id,...session})=>{
  const appointment=appointments.find(item=>item.id===appointment_id);let meetingUrl=null;
  if(session.status==='confirmed'&&appointment?.status==='scheduled'){
   try{const parsed=new URL(extractZoomMeetingUrl(appointment.external_payload||{}));if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&(parsed.hostname==='zoom.com'||parsed.hostname.endsWith('.zoom.com')||parsed.hostname==='zoom.us'||parsed.hostname.endsWith('.zoom.us')||parsed.hostname==='zoomgov.com'||parsed.hostname.endsWith('.zoomgov.com')))meetingUrl=parsed.href;}catch{}
  }
  return {...session,meeting_url:meetingUrl};
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
 if(typeof signed?.signedURL!=='string'||!signed.signedURL.startsWith('/storage/v1/object/sign/'))throw Error('Playback link unavailable');
 return {url:ctx.supabaseUrl+signed.signedURL,expiresInSeconds:300};
}
module.exports={ownedEnrollment,clientSuite,listMyMentorships,listPreparedMentorships,claimPreparedMentorship,getReplayPlaybackUrl};

// Reuse the existing consent-aware RPC with the client's JWT, never service-role authorization.
async function myFlowContext(ctx){
 context(ctx);if(!ctx.token){const e=new Error('Verified session required');e.statusCode=401;throw e;}
 const snapshot=await fetchJson(ctx.supabaseUrl+'/rest/v1/rpc/flowtel_get_cycle_subject_snapshot',{method:'POST',headers:userHeaders(ctx.serviceKey,ctx.token),body:JSON.stringify({p_subject_id:ctx.user.id})});
 const current=snapshot?.current;
 const day=Number(current?.cycle_day);
 const seasons=['Inner Winter','Inner Spring','Inner Summer','Inner Autumn'];
 const cycle=current?.latest_checkin_date?{day:Number.isInteger(day)&&day>0?day:null,season:seasons.includes(current.inner_season)?current.inner_season:null,asOf:String(current.latest_checkin_date).slice(0,10)}:null;
 return {cycle};
}
module.exports.myFlowContext=myFlowContext;
