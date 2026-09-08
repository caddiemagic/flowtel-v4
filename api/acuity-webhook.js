const {
  acuityFetch,
  appointmentTimes,
  extractZoomMeetingUrl,
  readRequestBody,
  serviceHeaders,
  verifyAcuitySignature,
}=require('../server/acuity-server.js');
const {fetchJson,serverConfig}=require('../server/guest-house-server.js');

function enc(value){return encodeURIComponent(String(value));}
function nowIso(){return new Date().toISOString();}
function array(value){return Array.isArray(value)?value:[];}
async function rawBody(req){
  if(Buffer.isBuffer(req.body))return req.body.toString('utf8');
  if(typeof req.body==='string')return req.body;
  if(req.body&&typeof req.body==='object'){
    const form=new URLSearchParams();
    for(const [key,value] of Object.entries(req.body))form.append(key,String(value??''));
    return form.toString();
  }
  const chunks=[];
  for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
function serviceUrl(context,table,query=''){return `${context.supabaseUrl}/rest/v1/${table}${query?`?${query}`:''}`;}
function actionStatus(action,appointment){
  if(action==='canceled'||appointment?.canceled===true)return 'cancelled';
  if(action==='rescheduled')return 'rescheduled';
  return 'scheduled';
}
function acuityDate(appointment){return appointment?.datetime||appointment?.time||'';}

function normalizeEmail(value){return String(value||'').trim().toLowerCase();}
function appointmentDateTime(appointment={}){return String(appointment.datetime||appointment.time||'').trim();}
function occurrenceStatus(action,appointment={}){
  if(action==='canceled'||appointment?.canceled===true)return 'cancelled';
  if(action==='rescheduled')return 'rescheduled';
  return 'scheduled';
}
async function syncSeriesParentStatus(context,eventId,memberId,seriesCount,anchorId=''){
  const rows=array(await fetchJson(serviceUrl(context,'flowtel_queendom_event_occurrence_enrollments',`select=acuity_appointment_id,status&event_id=eq.${enc(eventId)}&member_id=eq.${enc(memberId)}`),{headers:serviceHeaders(context.serviceKey)}));
  const complete=rows.length>=Number(seriesCount||0);
  const allCancelled=complete&&rows.every(row=>row.status==='cancelled');
  const status=allCancelled?'cancelled':complete?'active':'pending';
  const existing=array(await fetchJson(serviceUrl(context,'flowtel_queendom_event_series_enrollments',`select=enrolled_at&event_id=eq.${enc(eventId)}&member_id=eq.${enc(memberId)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  const payload={event_id:eventId,member_id:memberId,status,acuity_series_anchor_id:anchorId||rows.find(row=>row.acuity_appointment_id)?.acuity_appointment_id||null,last_synced_at:nowIso(),updated_at:nowIso()};
  if(status==='active'&&!existing[0]?.enrolled_at)payload.enrolled_at=nowIso();
  await fetchJson(serviceUrl(context,'flowtel_queendom_event_series_enrollments','on_conflict=event_id,member_id'),{method:'POST',headers:serviceHeaders(context.serviceKey,'resolution=merge-duplicates'),body:JSON.stringify(payload)});
  return status;
}
async function updateMappedSeriesOccurrence(context,local,action,appointment={}){
  const status=occurrenceStatus(action,appointment);
  await fetchJson(serviceUrl(context,'flowtel_queendom_event_occurrence_enrollments',`id=eq.${enc(local.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({
    status,meeting_url:extractZoomMeetingUrl(appointment)||local.meeting_url||null,external_payload:Object.keys(appointment||{}).length?appointment:local.external_payload,last_synced_at:nowIso(),updated_at:nowIso(),
  })});
  const events=array(await fetchJson(serviceUrl(context,'flowtel_queendom_events',`select=id,series_count&id=eq.${enc(local.event_id)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  const parentStatus=await syncSeriesParentStatus(context,local.event_id,local.member_id,events[0]?.series_count||1,local.acuity_appointment_id);
  return {status,parentStatus,eventId:local.event_id,memberId:local.member_id};
}
async function associateSeriesOccurrence(context,{acuityId,action,calendarId,appointmentTypeId,appointment}){
  const email=normalizeEmail(appointment?.email);
  const datetime=appointmentDateTime(appointment);
  const typeId=String(appointment?.appointmentTypeID||appointmentTypeId||'');
  const calId=String(appointment?.calendarID||calendarId||'');
  if(!email||!datetime||!typeId||!calId)return null;
  const events=array(await fetchJson(serviceUrl(context,'flowtel_queendom_events',`select=id,series_count&event_format=eq.series&acuity_appointment_type_id=eq.${enc(typeId)}&acuity_calendar_id=eq.${enc(calId)}`),{headers:serviceHeaders(context.serviceKey)}));
  for(const event of events){
    const occurrences=array(await fetchJson(serviceUrl(context,'flowtel_queendom_event_occurrences',`select=id,event_id,occurrence_number,starts_at&event_id=eq.${enc(event.id)}&order=occurrence_number.asc`),{headers:serviceHeaders(context.serviceKey)}));
    let occurrence=null,best=Infinity;
    for(const candidate of occurrences){
      const delta=Math.abs(new Date(candidate.starts_at).getTime()-new Date(datetime).getTime());
      if(Number.isFinite(delta)&&delta<best){best=delta;occurrence=candidate;}
    }
    if(!occurrence||best>10*60000)continue;
    const registrations=array(await fetchJson(serviceUrl(context,'flowtel_queendom_event_registrations',`select=member_id&event_id=eq.${enc(event.id)}&cancelled_at=is.null`),{headers:serviceHeaders(context.serviceKey)}));
    if(!registrations.length)continue;
    const ids=registrations.map(row=>row.member_id).filter(Boolean);
    const profiles=array(await fetchJson(serviceUrl(context,'profiles',`select=id,email&id=in.(${ids.map(enc).join(',')})`),{headers:serviceHeaders(context.serviceKey)}));
    const profile=profiles.find(row=>normalizeEmail(row.email)===email);
    if(!profile)continue;
    const status=occurrenceStatus(action,appointment);
    await fetchJson(serviceUrl(context,'flowtel_queendom_event_occurrence_enrollments','on_conflict=event_id,occurrence_id,member_id'),{method:'POST',headers:serviceHeaders(context.serviceKey,'resolution=merge-duplicates'),body:JSON.stringify({
      event_id:event.id,occurrence_id:occurrence.id,member_id:profile.id,acuity_appointment_id:acuityId,status,meeting_url:extractZoomMeetingUrl(appointment)||null,external_payload:appointment,last_synced_at:nowIso(),updated_at:nowIso(),
    })});
    const parentStatus=await syncSeriesParentStatus(context,event.id,profile.id,event.series_count,acuityId);
    return {status,parentStatus,eventId:event.id,memberId:profile.id};
  }
  return null;
}

async function logEvent(context,payload){
  await fetchJson(serviceUrl(context,'flowtel_acuity_sync_events'),{method:'POST',headers:serviceHeaders(context.serviceKey),body:JSON.stringify(payload)}).catch(error=>console.error('Acuity event log failed',error));
}

async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({ok:false});
  const context=serverConfig();
  let raw='';
  try{
    raw=await rawBody(req);
    if(!verifyAcuitySignature(raw,req.headers['x-acuity-signature']))return res.status(401).json({ok:false,error:'Invalid webhook signature.'});
    const form=new URLSearchParams(raw);
    const action=String(form.get('action')||'changed');
    const acuityId=String(form.get('id')||'');
    const calendarId=String(form.get('calendarID')||'');
    const appointmentTypeId=String(form.get('appointmentTypeID')||'');
    if(!acuityId)return res.status(400).json({ok:false,error:'Missing appointment id.'});
    let appointment={};
    try{appointment=await acuityFetch(`/appointments/${enc(acuityId)}`);}catch(error){if(action!=='canceled')throw error;}

    const seriesMatches=array(await fetchJson(serviceUrl(context,'flowtel_queendom_event_occurrence_enrollments',`select=*&acuity_appointment_id=eq.${enc(acuityId)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
    if(seriesMatches.length){
      const result=await updateMappedSeriesOccurrence(context,seriesMatches[0],action,appointment);
      await logEvent(context,{acuity_appointment_id:acuityId,action,calendar_id:calendarId||appointment.calendarID||null,appointment_type_id:appointmentTypeId||appointment.appointmentTypeID||null,processing_status:'processed',detail:{surface:'queendom_event_series',event_id:result.eventId,status:result.status,parent_status:result.parentStatus},processed_at:nowIso()});
      return res.status(200).json({ok:true,event_series:true});
    }

    const associated=await associateSeriesOccurrence(context,{acuityId,action,calendarId,appointmentTypeId,appointment});
    if(associated){
      await logEvent(context,{acuity_appointment_id:acuityId,action,calendar_id:calendarId||appointment.calendarID||null,appointment_type_id:appointmentTypeId||appointment.appointmentTypeID||null,processing_status:'processed',detail:{surface:'queendom_event_series',event_id:associated.eventId,status:associated.status,parent_status:associated.parentStatus},processed_at:nowIso()});
      return res.status(200).json({ok:true,event_series:true});
    }

    const matches=array(await fetchJson(serviceUrl(context,'flowtel_external_appointments',`select=*&acuity_appointment_id=eq.${enc(acuityId)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
    if(!matches.length){
      await logEvent(context,{acuity_appointment_id:acuityId,action,calendar_id:calendarId||null,appointment_type_id:appointmentTypeId||null,processing_status:'ignored',detail:{reason:'No Flowtel appointment or event-series session matched.'},processed_at:nowIso()});
      return res.status(200).json({ok:true,ignored:true});
    }
    const local=matches[0];
    const status=actionStatus(action,appointment);
    const patch={status,last_synced_at:nowIso(),updated_at:nowIso(),external_payload:appointment&&Object.keys(appointment).length?appointment:local.external_payload};
    if(status==='cancelled')patch.canceled_at=nowIso();
    if(acuityDate(appointment)){
      const times=appointmentTimes({datetime:acuityDate(appointment),durationMinutes:Number(appointment.duration||45)});
      patch.starts_at=times.startsAt;patch.ends_at=times.endsAt;
    }
    if(appointment.calendarID)patch.acuity_calendar_id=String(appointment.calendarID);
    await fetchJson(serviceUrl(context,'flowtel_external_appointments',`id=eq.${enc(local.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify(patch)});
    if(status==='cancelled'){
      const table=local.source_product==='caddie_magic'?'caddie_magic_appointment_access_grants':'flowtel_appointment_access_grants';
      await fetchJson(serviceUrl(context,table,`appointment_id=eq.${enc(local.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'revoked',revoked_at:nowIso(),revoked_reason:'Acuity appointment cancelled',updated_at:nowIso()})});
    }else if(patch.ends_at){
      const activeUntil=new Date(new Date(patch.ends_at).getTime()+7*86400000).toISOString();
      const table=local.source_product==='caddie_magic'?'caddie_magic_appointment_access_grants':'flowtel_appointment_access_grants';
      await fetchJson(serviceUrl(context,table,`appointment_id=eq.${enc(local.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({active_until:activeUntil,status:'active',revoked_at:null,revoked_reason:null,updated_at:nowIso()})});
    }
    await logEvent(context,{acuity_appointment_id:acuityId,action,appointment_id:local.id,calendar_id:calendarId||local.acuity_calendar_id,appointment_type_id:appointmentTypeId||local.acuity_appointment_type_id,processing_status:'processed',detail:{status},processed_at:nowIso()});
    return res.status(200).json({ok:true});
  }catch(error){
    console.error(error);
    try{await logEvent(context,{action:'failed',processing_status:'failed',detail:{error:error.message,raw_body:raw.slice(0,500)},processed_at:nowIso()});}catch(ignore){}
    return res.status(500).json({ok:false,error:'Webhook processing failed.'});
  }
}
module.exports=handler;
module.exports.config={api:{bodyParser:false}};
