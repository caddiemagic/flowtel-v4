// Private mentorship client reads. This module MUST be called only after requireUser(req).
// Never accept an enrollment owner or user id from request payload for authorization.
const {fetchJson,serviceHeaders}=require('../server/guest-house-server.js');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function context(ctx){if(!ctx?.user?.id||!ctx?.supabaseUrl||!ctx?.serviceKey)throw Error('Verified authenticated context required');}
function id(value){if(typeof value!=='string'||!UUID.test(value))throw Error('Invalid mentorship enrollment ID');return value;}
function endpoint(ctx,table,query){return ctx.supabaseUrl+'/rest/v1/flowtel_mentorship_'+table+'?'+query}
async function rows(ctx,table,query){const value=await fetchJson(endpoint(ctx,table,query),{headers:serviceHeaders(ctx.serviceKey)});if(!Array.isArray(value))throw Error('Unexpected mentorship response');return value;}
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
module.exports={ownedEnrollment,clientSuite};
