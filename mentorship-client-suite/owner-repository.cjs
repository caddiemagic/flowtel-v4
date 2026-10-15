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
async function createDraftEnrollment(ctx,{email,offeringId}){
 ownerContext(ctx);
 const normalized=normalizeEmail(email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>254)throw Error('Valid client email required');
 validUUID(offeringId);
 const rows=await fetchJson(url(ctx,'offerings','select=*&id=eq.'+encodeURIComponent(offeringId)+'&is_active=eq.true&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 const offering=Array.isArray(rows)?rows[0]:null;
 if(!offering)throw Error('Offering not found or inactive');
 // No auth account, invite, access, or appointments created here.
 const payload={invited_email:normalized,offering_id:offering.id,offering_snapshot:offering,status:'draft',created_by:ctx.user.id};
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
async function updateDraftEnrollment(ctx,{enrollmentId,startsOn,endsOn}){
 ownerContext(ctx);validUUID(enrollmentId);
 for(const day of [startsOn,endsOn]){
  if(day!=null && (typeof day!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(day)||!Number.isFinite(new Date(day+'T12:00:00Z').getTime())||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day))
   throw Error('Invalid enrollment date');
 }
 if(startsOn && endsOn && startsOn>=endsOn)throw Error('End date must follow start date');
 const result=await fetchJson(url(ctx,'enrollments','id=eq.'+encodeURIComponent(enrollmentId)+'&status=eq.draft&select=id,status,starts_on,ends_on'),{
  method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),
  body:JSON.stringify({starts_on:startsOn??null,ends_on:endsOn??null,updated_at:new Date().toISOString()})
 });
 if(!Array.isArray(result)||result.length!==1)throw Error('Draft enrollment not found or no longer editable');
 return result[0];
}
module.exports={listOfferings,createDraftEnrollment,saveClientFocus,listEnrollments,updateDraftEnrollment};
