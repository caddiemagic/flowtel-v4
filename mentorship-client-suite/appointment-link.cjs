// Owner-only links to existing Flowtel appointment records. Never books or edits Acuity.
const {fetchJson,serviceHeaders}=require('../server/guest-house-server.js');
const {extractZoomMeetingUrl}=require('../server/acuity-server.js');
const {session,validate,endpoint}=require('./session-controls.cjs');
const {failure}=require('./request.cjs');
const {expectedClass,matchesClass}=require('./booking-rules.cjs');
const terminal=['completed','cancelled','missed'];
const external=(ctx,query)=>ctx.supabaseUrl+'/rest/v1/flowtel_external_appointments?'+query;
async function records(ctx,url){const rows=await fetchJson(url,{headers:serviceHeaders(ctx.serviceKey)});if(!Array.isArray(rows))throw Error('Unexpected appointment response');return rows;}
async function subject(ctx,args){
 const row=await session(ctx,args);
 const enrollments=await records(ctx,endpoint(ctx,'enrollments','select=id,client_user_id,offering_snapshot&id=eq.'+args.enrollmentId+'&limit=1'));
 if(enrollments.length!==1)throw failure('Mentorship not found',404);
 return {row,clientId:enrollments[0].client_user_id,className:expectedClass(row,enrollments[0].offering_snapshot)};
}
function duration(appointment){const minutes=(Date.parse(appointment.ends_at)-Date.parse(appointment.starts_at))/60000;return Number.isInteger(minutes)&&minutes>0?minutes:null;}
function publicBooking(appointment){return {id:appointment.id,startsAt:appointment.starts_at,endsAt:appointment.ends_at,status:appointment.status,durationMinutes:duration(appointment),zoomReady:Boolean(extractZoomMeetingUrl(appointment.external_payload||{}))};}
async function listBookings(ctx,args){
 const {row,clientId,className}=await subject(ctx,args);
 if(!clientId)return {bookings:[],linked:null,note:'The client must activate this mentorship with their verified account before bookings can be matched.'};
 if(!className&&!row.appointment_id)return {bookings:[],linked:null,note:'This session does not have a configured Acuity class. You can still enter its date manually.'};
 const select='select=id,starts_at,ends_at,status,external_payload';
 let linked=null;
 if(row.appointment_id){const found=await records(ctx,external(ctx,select+'&id=eq.'+row.appointment_id+'&customer_user_id=eq.'+clientId+'&source_product=eq.flowtel&limit=1'));linked=found[0]?publicBooking(found[0]):{id:row.appointment_id,unavailable:true};}
 if(row.appointment_id||terminal.includes(row.status))return {bookings:[],linked,note:linked?'This link uses an existing booking. Make appointment changes in Acuity.':'This session is closed.'};
 const available=await records(ctx,external(ctx,select+'&customer_user_id=eq.'+clientId+'&source_product=eq.flowtel&status=in.(scheduled,rescheduled,completed)&order=starts_at.desc&limit=100'));
 const matching=available.filter(item=>duration(item)===row.duration_minutes&&matchesClass(item,className));
 let used=[];
 if(matching.length)used=await records(ctx,endpoint(ctx,'sessions','select=appointment_id&appointment_id=in.('+matching.map(item=>item.id).join(',')+')'));
 const ids=new Set(used.map(item=>item.appointment_id));
 return {bookings:matching.filter(item=>!ids.has(item.id)).map(publicBooking),linked:null,className,note:'Showing this client’s existing '+className+' bookings with the matching session length. Linking does not create a booking.'};
}
async function patch(ctx,args,row,payload){
 const filter='enrollment_id=eq.'+args.enrollmentId+'&id=eq.'+args.sessionId+'&status=eq.'+row.status+'&appointment_id='+(row.appointment_id?'eq.'+row.appointment_id:'is.null')+'&scheduled_at='+(row.scheduled_at?'eq.'+encodeURIComponent(row.scheduled_at):'is.null')+'&select=id,status,scheduled_at,appointment_id';
 let result;try{result=await fetchJson(endpoint(ctx,'sessions',filter),{method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify(payload)});}catch(error){if(error?.statusCode===409||error?.details?.code==='23505')throw failure('This booking is already linked to a session. Refresh and choose another booking.',409);throw error;}
 if(!Array.isArray(result)||result.length!==1)throw failure('This session changed. Refresh before trying again.',409);return result[0];
}
async function linkBooking(ctx,args){
 validate(args.appointmentId);const {row,clientId,className}=await subject(ctx,args);
 if(!clientId)throw failure('The client must activate their mentorship before linking a booking.',409);
 if(!className)throw failure('No Acuity class is configured for this session.',409);
 if(row.appointment_id||terminal.includes(row.status))throw failure('Unlink the existing booking or reopen this session before choosing a booking.',409);
 const appointments=await records(ctx,external(ctx,'select=id,starts_at,ends_at,status,external_payload&id=eq.'+args.appointmentId+'&customer_user_id=eq.'+clientId+'&source_product=eq.flowtel&status=in.(scheduled,rescheduled,completed)&limit=1'));
 if(appointments.length!==1)throw failure('A matching booking was not found for this client.',404);
 const appointment=appointments[0];if(!matchesClass(appointment,className))throw failure('Choose the '+className+' Acuity class for this session.',409);
 if(duration(appointment)!==row.duration_minutes)throw failure('The booking length does not match this mentorship session.',409);
 return patch(ctx,args,row,{appointment_id:appointment.id,scheduled_at:appointment.starts_at,timezone:'America/Los_Angeles',status:appointment.status==='completed'?'completed':'confirmed'});
}
async function unlinkBooking(ctx,args){const {row}=await subject(ctx,args);if(!row.appointment_id)throw failure('No booking is linked to this session.',409);return patch(ctx,args,row,{appointment_id:null,status:row.status==='confirmed'?'proposed':row.status});}
async function refreshBooking(ctx,args){
 const {row,clientId,className}=await subject(ctx,args);if(!row.appointment_id||!clientId)throw failure('No client booking is linked to this session.',409);
 const found=await records(ctx,external(ctx,'select=id,starts_at,ends_at,status,external_payload&id=eq.'+row.appointment_id+'&customer_user_id=eq.'+clientId+'&source_product=eq.flowtel&limit=1'));
 if(found.length!==1)throw failure('The linked booking is no longer available for this client. Unlink it to edit this session.',409);
 const appointment=found[0];if(!matchesClass(appointment,className))throw failure('The linked booking class changed. Review it before relinking this session.',409);
 if(duration(appointment)!==row.duration_minutes)throw failure('The booking duration changed. Review it in Acuity before relinking this session.',409);
 if(terminal.includes(row.status))return row;
 const status={scheduled:'confirmed',rescheduled:'confirmed',completed:'completed',cancelled:'cancelled'}[appointment.status];
 if(!status)throw failure('The linked booking is not confirmed. Review it in Acuity.',409);
 return patch(ctx,args,row,{scheduled_at:appointment.starts_at,status});
}
module.exports={listBookings,linkBooking,unlinkBooking,refreshBooking};
