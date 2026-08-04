const {
  acuityFetch,
  appointmentTimes,
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
    const matches=array(await fetchJson(serviceUrl(context,'flowtel_external_appointments',`select=*&acuity_appointment_id=eq.${enc(acuityId)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
    if(!matches.length){
      await logEvent(context,{acuity_appointment_id:acuityId,action,calendar_id:calendarId||null,appointment_type_id:appointmentTypeId||null,processing_status:'ignored',detail:{reason:'No Flowtel appointment matched.'},processed_at:nowIso()});
      return res.status(200).json({ok:true,ignored:true});
    }
    const local=matches[0];
    let appointment={};
    try{appointment=await acuityFetch(`/appointments/${enc(acuityId)}`);}catch(error){if(action!=='canceled')throw error;}
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
      await fetchJson(serviceUrl(context,'flowtel_appointment_access_grants',`appointment_id=eq.${enc(local.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'revoked',revoked_at:nowIso(),revoked_reason:'Acuity appointment cancelled',updated_at:nowIso()})});
    }else if(patch.ends_at){
      const activeUntil=new Date(new Date(patch.ends_at).getTime()+7*86400000).toISOString();
      await fetchJson(serviceUrl(context,'flowtel_appointment_access_grants',`appointment_id=eq.${enc(local.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({active_until:activeUntil,status:'active',revoked_at:null,revoked_reason:null,updated_at:nowIso()})});
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
