// Server-only mentorship repository helpers. Not routed to Vercel until security review.
// Caller MUST use requireOwner(req) from ../server/guest-house-server.js before writes.
// Never accept a client identity from the browser for client-read access.
const {fetchJson,serviceHeaders,normalizeEmail}=require('../server/guest-house-server.js');
const BASE='flowtel_mentorship_';
function url(ctx,table,params=''){return ctx.supabaseUrl+'/rest/v1/'+BASE+table+(params?'?'+params:'');}
function ownerContext(ctx){if(!ctx?.user?.id||!ctx?.serviceKey||!ctx?.supabaseUrl)throw Error('Verified owner context required');}
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function validUUID(id){if(!UUID.test(String(id||'')))throw Error('Valid enrollment ID required');return id;}
function jsonBody(data){return JSON.stringify(data);}
async function listOfferings(ctx){
 ownerContext(ctx);
 return fetchJson(url(ctx,'offerings','select=*&is_active=eq.true&order=price_cents.asc'),{headers:serviceHeaders(ctx.serviceKey)});
}
async function createDraftEnrollment(ctx,{email,offeringId,startsOn}){
 ownerContext(ctx);
 const normalized=normalizeEmail(email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>254)throw Error('Valid client email required');
 validUUID(offeringId);
 const rows=await fetchJson(url(ctx,'offerings','select=*&id=eq.'+encodeURIComponent(offeringId)+'&is_active=eq.true&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 const offering=Array.isArray(rows)?rows[0]:null;
 if(!offering)throw Error('Offering not found or inactive');
 // No auth account, invite, access, or appointments created here.
 const endsOn=calendarEndDate(startsOn??null,offering);
 const payload={invited_email:normalized,offering_id:offering.id,offering_snapshot:offering,status:'draft',created_by:ctx.user.id,starts_on:startsOn??null,ends_on:endsOn};
 const result=await fetchJson(url(ctx,'enrollments','select=id,status,invited_email,offering_id,created_at'),{
  method:'POST',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:jsonBody(payload)
 });
 if(!Array.isArray(result)||result.length!==1)throw Error('Enrollment was not confirmed');
 return result[0];
}
async function saveClientFocus(ctx,{enrollmentId,month,focus}){
 ownerContext(ctx);validUUID(enrollmentId);
 if(!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(String(month||'')))throw Error('Month must use YYYY-MM-01');
 if(typeof focus!=='string'||focus.length>5000)throw Error('Focus must be text, max 5000 characters');
 // Confirm the enrollment exists before upsert. Unique (enrollment_id,focus_month)
 const rows=await fetchJson(url(ctx,'enrollments','select=id&id=eq.'+encodeURIComponent(enrollmentId)+'&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Enrollment not found');
 const result=await fetchJson(url(ctx,'monthly_focus','on_conflict=enrollment_id,focus_month&select=enrollment_id,focus_month,client_visible_focus'),{
  method:'POST',headers:serviceHeaders(ctx.serviceKey,'resolution=merge-duplicates,return=representation'),
  body:jsonBody({enrollment_id:enrollmentId,focus_month:month,client_visible_focus:focus,updated_at:new Date().toISOString()})
 });
 if(!Array.isArray(result)||result.length!==1)throw Error('Monthly focus save was not confirmed');
 return result[0];
}

async function listEnrollments(ctx){
 ownerContext(ctx);
 const rows=await fetchJson(url(ctx,'enrollments','select=id,invited_email,offering_id,status,starts_on,ends_on,created_at,updated_at&order=created_at.desc&limit=100'),{
  headers:serviceHeaders(ctx.serviceKey)
 });
 if(!Array.isArray(rows))throw Error('Enrollment list was not confirmed');
 return rows;
}
function dateParts(day){
 if(typeof day!=='string'||day.length!==10)throw Error('Invalid enrollment start date');
 const parsed=Date.parse(day+'T12:00:00Z');
 if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==day)throw Error('Invalid enrollment start date');
 return new Date(parsed);
}
function calendarEndDate(start,offering){
 if(!start)return null;
 const day=dateParts(start);
 const months=offering.duration_months,days=offering.duration_days;
 if(Number.isInteger(months)&&months>0){
  const target=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+months,1,12));
  const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate();
  target.setUTCDate(Math.min(day.getUTCDate(),lastDay));
  return target.toISOString().slice(0,10);
 }
 if(Number.isInteger(days)&&days>0){
  day.setUTCDate(day.getUTCDate()+days);return day.toISOString().slice(0,10);
 }
 return null; // No invented expiry for flexible sessions.
}
async function updateDraftEnrollment(ctx,{enrollmentId,startsOn}){
 ownerContext(ctx);validUUID(enrollmentId);
 if(startsOn!==null&&startsOn!==undefined)dateParts(startsOn);
 const found=await fetchJson(url(ctx,'enrollments','select=id,offering_snapshot,status&id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.draft&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(found)||found.length!==1)throw Error('Draft enrollment not found or no longer editable');
 const offering=found[0].offering_snapshot;
 if(!offering||typeof offering!=='object')throw Error('Offering snapshot is missing');
 const endsOn=calendarEndDate(startsOn??null,offering);
 const result=await fetchJson(url(ctx,'enrollments','id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.draft&select=id,status,starts_on,ends_on'),{
  method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),
  body:JSON.stringify({starts_on:startsOn??null,ends_on:endsOn,updated_at:new Date().toISOString()})
 });
 if(!Array.isArray(result)||result.length!==1)throw Error('Draft enrollment not found or no longer editable');
 return result[0];
}
async function prepareInvitation(ctx,{enrollmentId}){
 ownerContext(ctx);validUUID(enrollmentId);
 const existing=await fetchJson(url(ctx,'enrollments','select=id,starts_on,invited_email,status&id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.draft&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(existing)||existing.length!==1)throw Error('Only draft enrollments can be prepared');
 if(!existing[0].starts_on)throw Error('Set a mentorship start date before preparing access');
 const updated=await fetchJson(url(ctx,'enrollments','id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.draft&select=id,status,invited_email'),{
  method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify({status:'invited',updated_at:new Date().toISOString()})
 });
 if(!Array.isArray(updated)||updated.length!==1)throw Error('Could not prepare enrollment');
 return updated[0]; // Does not send mail or grant access.
}
async function prepareSessions(ctx,{enrollmentId}){
 ownerContext(ctx);validUUID(enrollmentId);
 const found=await fetchJson(url(ctx,'enrollments','select=id,offering_snapshot,status&id=eq.'+encodeURIComponent(enrollmentId)+'&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(found)||found.length!==1)throw Error('Enrollment not found');
 if(!['draft','invited'].includes(found[0].status))throw Error('Session plan cannot be changed after activation');
 const offering=found[0].offering_snapshot||{};
 const plan=[];
 if(offering.activation_minutes>0)plan.push({session_kind:'activation',duration_minutes:offering.activation_minutes});
 for(let i=0;i<(offering.empowerment_count||0);i++)plan.push({session_kind:'empowerment',duration_minutes:offering.empowerment_minutes});
 for(let i=0;i<(offering.flexible_count||0);i++)plan.push({session_kind:'flexible',duration_minutes:offering.flexible_minutes});
 if(!plan.length||plan.length>40||plan.some(x=>!Number.isInteger(x.duration_minutes)||x.duration_minutes<=0))throw Error('Offering session configuration is invalid');
 const existing=await fetchJson(url(ctx,'sessions','select=id,session_number,session_kind,duration_minutes,status,scheduled_at&enrollment_id=eq.'+encodeURIComponent(enrollmentId)+'&order=session_number.asc'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(existing))throw Error('Cannot verify existing sessions');
 if(existing.length)return {sessions:existing,created:false};
 const data=plan.map((session,i)=>({...session,enrollment_id:enrollmentId,session_number:i+1,status:'unscheduled'}));
 const inserted=await fetchJson(url(ctx,'sessions','select=id,session_number,session_kind,duration_minutes,status,scheduled_at'),{method:'POST',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify(data)});
 if(!Array.isArray(inserted)||inserted.length!==data.length)throw Error('Session plan could not be confirmed');
 return {sessions:inserted,created:true};
}
async function listSessions(ctx,{enrollmentId}){
 ownerContext(ctx);validUUID(enrollmentId);
 return fetchJson(url(ctx,'sessions','select=id,session_number,session_kind,duration_minutes,status,scheduled_at&enrollment_id=eq.'+encodeURIComponent(enrollmentId)+'&order=session_number.asc'),{headers:serviceHeaders(ctx.serviceKey)});
}
async function setSessionTime(ctx,{enrollmentId,sessionId,scheduledAt}){
 ownerContext(ctx);validUUID(enrollmentId);validUUID(sessionId);
 const day=typeof scheduledAt==='string'?new Date(scheduledAt):new Date(NaN);
 if(!Number.isFinite(day.getTime())||!/(Z|[+-]\d{2}:\d{2})$/.test(String(scheduledAt)))throw Error('A timestamp with time zone is required');
 if(day.getTime()<Date.now()-86400000)throw Error('Choose a future session time');
 const matches=await fetchJson(url(ctx,'sessions','select=id,status,scheduled_at&enrollment_id=eq.'+encodeURIComponent(enrollmentId)+'&id=eq.'+encodeURIComponent(sessionId)+'&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(matches)||matches.length!==1)throw Error('Session not found');
 if(!['unscheduled','proposed','confirmed'].includes(matches[0].status))throw Error('This session cannot be rescheduled');
 const records=await fetchJson(url(ctx,'sessions','enrollment_id=eq.'+encodeURIComponent(enrollmentId)+'&id=eq.'+encodeURIComponent(sessionId)+'&status=eq.'+matches[0].status+'&scheduled_at='+ (matches[0].scheduled_at?'eq.'+encodeURIComponent(matches[0].scheduled_at):'is.null')+'&select=id,status,scheduled_at,timezone'),{
 method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify({scheduled_at:day.toISOString(),timezone:'America/Los_Angeles',status:'proposed'})});
 if(!Array.isArray(records)||records.length!==1)throw Error('Session could not be saved');
 return records[0];
}
module.exports={listOfferings,createDraftEnrollment,saveClientFocus,listEnrollments,updateDraftEnrollment,prepareInvitation,prepareSessions,listSessions,setSessionTime};
