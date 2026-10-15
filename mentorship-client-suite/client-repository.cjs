// Private mentorship client reads. This module MUST be called only after requireUser(req).
// Never accept an enrollment owner or user id from request payload for authorization.
const {fetchJson,serviceHeaders}=require('../server/guest-house-server.js');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function context(ctx){if(!ctx?.user?.id||!ctx?.supabaseUrl||!ctx?.serviceKey)throw Error('Verified authenticated context required');}
function id(value){if(typeof value!=='string'||!UUID.test(value))throw Error('Invalid mentorship enrollment ID');return value;}
function endpoint(ctx,table,query){return ctx.supabaseUrl+'/rest/v1/flowtel_mentorship_'+table+'?'+query}
async function rows(ctx,table,query){const value=await fetchJson(endpoint(ctx,table,query),{headers:serviceHeaders(ctx.serviceKey)});if(!Array.isArray(value))throw Error('Unexpected mentorship response');return value;}
async function listMyMentorships(ctx){
 context(ctx);
 const records=await rows(ctx,'enrollments','select=id,offering_id,status,starts_on,ends_on&client_user_id=eq.'+encodeURIComponent(ctx.user.id)+'&status=in.(invited,active,paused,completed)&order=created_at.desc&limit=30');
 return records.map(record=>({id:record.id,offeringId:record.offering_id,status:record.status,startsOn:record.starts_on,endsOn:record.ends_on}));
}
async function ownedEnrollment(ctx,enrollmentId){
 context(ctx);id(enrollmentId);
 const records=await rows(ctx,'enrollments','select=id,offering_id,status,starts_on,ends_on,client_user_id&id=eq.'+encodeURIComponent(enrollmentId)+'&client_user_id=eq.'+encodeURIComponent(ctx.user.id)+'&status=in.(invited,active,paused,completed)&limit=1');
 if(records.length!==1) {const err=new Error('Mentorship not found');err.statusCode=404;throw err;}
 return records[0];
}
async function clientSuite(ctx,enrollmentId){
 const enrollment=await ownedEnrollment(ctx,enrollmentId);
 const selection='enrollment_id=eq.'+encodeURIComponent(enrollment.id);
 const sessions=await rows(ctx,'sessions','select=id,session_number,session_kind,duration_minutes,scheduled_at,timezone,status&'+selection+'&order=session_number.asc');
 const focus=await rows(ctx,'monthly_focus','select=focus_month,client_visible_focus&'+selection+'&order=focus_month.desc&limit=12');
 const ids=sessions.filter(s=>typeof s.id==='string'&&UUID.test(s.id)).map(s=>s.id);
 let replays=[];
 if(ids.length){
  const replayRows=await rows(ctx,'replays','select=id,session_id,title,created_at&visible_to_client=eq.true&session_id=in.('+ids.map(encodeURIComponent).join(',')+')&order=created_at.desc');
  const allowed=new Set(ids);
  replays=replayRows.filter(r=>allowed.has(r.session_id)).map(r=>({id:r.id,sessionId:r.session_id,title:r.title,createdAt:r.created_at}));
 }
 return {enrollment:{id:enrollment.id,offeringId:enrollment.offering_id,status:enrollment.status,startsOn:enrollment.starts_on,endsOn:enrollment.ends_on},sessions,monthlyFocus:focus,replays};
}
async function claimPreparedMentorship(ctx){
 context(ctx);
 const email=String(ctx.user.email||'').trim().toLowerCase();
 if(!email||!ctx.user.email_confirmed_at){
  const err=new Error('A verified Flowtel email is required to claim a mentorship.');err.statusCode=403;throw err;
 }
 const candidates=await rows(ctx,'enrollments','select=id,status,client_user_id,invited_email&status=eq.invited&client_user_id=is.null&invited_email=eq.'+encodeURIComponent(email)+'&limit=10');
 const exact=candidates.filter(r=>String(r.invited_email||'').trim().toLowerCase()===email);
 if(exact.length===0){const err=new Error('No prepared mentorship matches this verified account.');err.statusCode=404;throw err;}
 if(exact.length>1){const err=new Error('More than one mentorship is prepared for this email. Contact your Concierge to activate them individually.');err.statusCode=409;throw err;}
 const claimed=await fetchJson(endpoint(ctx,'enrollments','id=eq.'+encodeURIComponent(exact[0].id)+'&status=eq.invited&client_user_id=is.null&select=id,status,client_user_id'),{
  method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),
  body:JSON.stringify({client_user_id:ctx.user.id,status:'active',updated_at:new Date().toISOString()})
 });
 if(!Array.isArray(claimed)||claimed.length!==1)throw Error('Claim could not be confirmed');
 return {id:claimed[0].id,status:claimed[0].status};
}
module.exports={ownedEnrollment,clientSuite,listMyMentorships,claimPreparedMentorship};
