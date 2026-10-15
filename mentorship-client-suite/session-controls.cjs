const {fetchJson,serviceHeaders}=require('../server/guest-house-server.js');
const {failure}=require('./request.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validate(value){if(typeof value!=='string'||!UUID.test(value))throw failure('Valid identifier required');return value;}
function context(ctx){if(!ctx?.user?.id||!ctx.serviceKey||!ctx.supabaseUrl)throw failure('Verified owner context required',403);}
function endpoint(ctx,table,query){return ctx.supabaseUrl+'/rest/v1/flowtel_mentorship_'+table+'?'+query;}
async function session(ctx,{enrollmentId,sessionId}){
 context(ctx);validate(enrollmentId);validate(sessionId);
 const rows=await fetchJson(endpoint(ctx,'sessions','select=id,enrollment_id,status,scheduled_at&enrollment_id=eq.'+enrollmentId+'&id=eq.'+sessionId+'&limit=1'),{headers:serviceHeaders(ctx.serviceKey)});
 if(!Array.isArray(rows)||rows.length!==1)throw failure('Session not found',404);return rows[0];
}
async function transition(ctx,args){
 const row=await session(ctx,args);
 const next={confirm:'confirmed',complete:'completed',cancel:'cancelled'}[args.operation];
 const allowed={confirm:['proposed'],complete:['confirmed'],cancel:['unscheduled','proposed','confirmed']};
 if(!next||!allowed[args.operation].includes(row.status))throw failure('This session cannot make that transition',409);
 if(next==='confirmed'&&(!row.scheduled_at||!Number.isFinite(Date.parse(row.scheduled_at))))throw failure('Propose a valid time before confirming');
 const result=await fetchJson(endpoint(ctx,'sessions','enrollment_id=eq.'+args.enrollmentId+'&id=eq.'+args.sessionId+'&status=eq.'+row.status+'&scheduled_at='+(row.scheduled_at?'eq.'+encodeURIComponent(row.scheduled_at):'is.null')+'&select=id,status,scheduled_at'),{method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify({status:next})});
 if(!Array.isArray(result)||result.length!==1)throw failure('Session changed. Refresh before trying again.',409);return result[0];
}
module.exports={validate,context,endpoint,session,transition};
