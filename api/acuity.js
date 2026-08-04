const {
  WOMB_MAGIC_CONSENT_LANGUAGE,
  acuityFetch,
  appointmentTimes,
  firstLastForBooking,
  normalizeId,
  periodKeyFor,
  profileDisplayName,
  readRequestBody,
  requireFlowtelMember,
  requireFlowtelOwner,
  requireFlowtelProvider,
  sendAcuityError,
  serviceHeaders,
  serviceRestUrl,
  setPublicCors,
  validTimezone,
}=require('../server/acuity-server.js');
const {fetchJson}=require('../server/guest-house-server.js');

function enc(value){return encodeURIComponent(String(value));}
function csv(values){return values.map(value=>`"${String(value).replaceAll('"','\\"')}"`).join(',');}
function row(data){return Array.isArray(data)?data[0]||null:null;}
function array(data){return Array.isArray(data)?data:[];}
function nowIso(){return new Date().toISOString();}
function statusFromAcuity(appointment,action=''){
  if(action==='canceled'||appointment?.canceled===true||appointment?.canceledAt) return 'cancelled';
  if(action==='rescheduled') return 'rescheduled';
  return 'scheduled';
}
function dateTimeFromAcuity(appointment){
  return appointment?.datetime || appointment?.datetimeCreated || appointment?.time || '';
}
function publicAppointment(appointment={}){
  return {
    id:appointment.id,
    acuity_appointment_id:appointment.acuity_appointment_id,
    provider_id:appointment.provider_id,
    practitioner_id:appointment.practitioner_id,
    practitioner_name:appointment.practitioner_name,
    service_name:appointment.service_name||'Womb Magic',
    starts_at:appointment.starts_at,
    ends_at:appointment.ends_at,
    status:appointment.status,
    client_timezone:appointment.client_timezone,
    service_period_key:appointment.service_period_key,
    access_until:appointment.access_until||null,
  };
}
async function getService(context){
  const rows=await fetchJson(serviceRestUrl(context,'flowtel_provider_service_types',`select=*&product_key=eq.flowtel&service_key=eq.womb_magic&limit=1`),{headers:serviceHeaders(context.serviceKey)});
  const service=row(rows);
  if(!service){const error=new Error('Run migration 064 before opening Womb Magic scheduling.');error.statusCode=503;throw error;}
  return service;
}
async function profilesByIds(context,ids){
  if(!ids.length)return new Map();
  const rows=await fetchJson(serviceRestUrl(context,'profiles',`select=*&id=in.(${ids.map(enc).join(',')})`),{headers:serviceHeaders(context.serviceKey)});
  return new Map(array(rows).map(item=>[item.id,item]));
}
async function priestessProfilesByIds(context,ids){
  if(!ids.length)return new Map();
  const rows=await fetchJson(serviceRestUrl(context,'flow_fm_priestess_profiles',`select=member_id,status,priestess_name,profile_photo_url,bio,modalities,who_she_serves,session_types,timezone,location&member_id=in.(${ids.map(enc).join(',')})`),{headers:serviceHeaders(context.serviceKey)});
  return new Map(array(rows).map(item=>[item.member_id,item]));
}
async function mappedProviders(context,service){
  const providers=array(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles',`select=*&product_key=eq.flowtel&provider_kind=eq.practitioner&is_active=eq.true&booking_enabled=eq.true&acuity_calendar_id=not.is.null&order=display_name.asc`),{headers:serviceHeaders(context.serviceKey)}));
  if(!providers.length)return [];
  const assignments=array(await fetchJson(serviceRestUrl(context,'flowtel_provider_service_assignments',`select=provider_id,is_enabled&service_type_id=eq.${enc(service.id)}&is_enabled=eq.true&provider_id=in.(${providers.map(item=>enc(item.id)).join(',')})`),{headers:serviceHeaders(context.serviceKey)}));
  const enabled=new Set(assignments.map(item=>item.provider_id));
  const allowed=providers.filter(item=>enabled.has(item.id));
  const profileMap=await profilesByIds(context,allowed.map(item=>item.user_id));
  const priestessMap=await priestessProfilesByIds(context,allowed.map(item=>item.user_id));
  return allowed.map(item=>{
    const profile=profileMap.get(item.user_id)||{};
    const priestess=priestessMap.get(item.user_id)||{};
    return {
      provider_id:item.id,
      practitioner_id:item.user_id,
      display_name:priestess.priestess_name||item.display_name||profileDisplayName(profile,'Flowtel Priestess'),
      calendar_id:item.acuity_calendar_id,
      calendar_name:item.acuity_calendar_name||item.display_name||'Acuity Calendar',
      timezone:validTimezone(item.timezone||priestess.timezone||profile.timezone),
      listed_timezone:String(priestess.timezone||profile.timezone||'').trim(),
      photo_url:priestess.profile_photo_url||profile.profile_photo_url||profile.photo_url||'',
      bio:priestess.bio||'',
      modalities:priestess.modalities||'',
      who_she_serves:priestess.who_she_serves||'',
      location:priestess.location||profile.location||'',
    };
  });
}
async function appointmentRowsForMember(context,service){
  const rows=array(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`select=*&customer_user_id=eq.${enc(context.user.id)}&source_product=eq.flowtel&service_type_id=eq.${enc(service.id)}&order=starts_at.desc&limit=100`),{headers:serviceHeaders(context.serviceKey)}));
  if(!rows.length)return [];
  const providerIds=[...new Set(rows.map(item=>item.provider_id))];
  const actualProviders=providerIds.length?array(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles',`select=id,user_id,display_name&id=in.(${providerIds.map(enc).join(',')})`), {headers:serviceHeaders(context.serviceKey)})):[];
  const profileMap=await profilesByIds(context,actualProviders.map(item=>item.user_id));
  const providerMap=new Map(actualProviders.map(item=>[item.id,item]));
  const grants=array(await fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants',`select=appointment_id,active_until,status&appointment_id=in.(${rows.map(item=>enc(item.id)).join(',')})`),{headers:serviceHeaders(context.serviceKey)}).catch(()=>[]));
  const grantMap=new Map(grants.map(item=>[item.appointment_id,item]));
  return rows.map(item=>{
    const provider=providerMap.get(item.provider_id)||{};
    const profile=profileMap.get(provider.user_id)||{};
    return publicAppointment({...item,practitioner_id:provider.user_id,practitioner_name:provider.display_name||profileDisplayName(profile,'Flowtel Priestess'),service_name:service.service_name,access_until:grantMap.get(item.id)?.active_until});
  });
}
async function requireProvider(context,service,providerId){
  const providers=await mappedProviders(context,service);
  const provider=providers.find(item=>item.provider_id===providerId);
  if(!provider){const error=new Error('That Priestess is not currently available for Womb Magic calls.');error.statusCode=404;throw error;}
  return provider;
}
async function bootstrap(req){
  const context=await requireFlowtelMember(req);
  const service=await getService(context);
  const [providers,appointments]=await Promise.all([mappedProviders(context,service),appointmentRowsForMember(context,service)]);
  const period=periodKeyFor();
  const consuming=appointments.find(item=>item.service_period_key===period&&['pending','scheduled','rescheduled','completed'].includes(item.status));
  return {ok:true,service:{id:service.id,name:service.service_name,duration_minutes:service.duration_minutes,consent_language:WOMB_MAGIC_CONSENT_LANGUAGE,period_key:period,eligibility_period:service.eligibility_period},providers,appointments,eligible:!consuming,consuming_appointment:consuming||null,member_timezone:validTimezone(context.profile.timezone)};
}
async function availability(req,body,mode){
  const context=await requireFlowtelMember(req);
  const service=await getService(context);
  if(!normalizeId(service.acuity_appointment_type_id)){const error=new Error('The Womb Magic Acuity appointment type has not been mapped yet.');error.statusCode=503;throw error;}
  const timezone=validTimezone(body.timezone||context.profile.timezone);
  const providerId=String(body.provider_id||'');
  const allProviders=await mappedProviders(context,service);
  const provider=providerId?allProviders.find(item=>item.provider_id===providerId):null;
  if(providerId&&!provider){const error=new Error('That Priestess is not currently available for Womb Magic calls.');error.statusCode=404;throw error;}
  const baseQuery={appointmentTypeID:service.acuity_appointment_type_id,timezone};
  if(mode==='dates')baseQuery.month=String(body.month||'').slice(0,7);
  else {baseQuery.date=String(body.date||'').slice(0,10);if(body.ignore_appointment_id)baseQuery['ignoreAppointmentIDs[]']=body.ignore_appointment_id;}
  if((mode==='dates'&&!/^\d{4}-\d{2}$/.test(baseQuery.month))||(mode==='times'&&!/^\d{4}-\d{2}-\d{2}$/.test(baseQuery.date))){const error=new Error(`Choose a valid ${mode==='dates'?'month':'date'}.`);error.statusCode=400;throw error;}
  if(provider){
    const data=array(await acuityFetch(`/availability/${mode}`,{query:{...baseQuery,calendarID:provider.calendar_id}})).map(item=>typeof item==='object'?{...item,provider_id:provider.provider_id,provider_name:provider.display_name,calendarID:item.calendarID||provider.calendar_id}:item);
    return {ok:true,[mode]:data,timezone,provider};
  }
  const collected=[];
  for(let index=0;index<allProviders.length;index+=5){
    const batch=allProviders.slice(index,index+5);
    const results=await Promise.all(batch.map(async item=>{
      const slots=array(await acuityFetch(`/availability/${mode}`,{query:{...baseQuery,calendarID:item.calendar_id}}));
      return slots.map(slot=>typeof slot==='object'?{...slot,provider_id:item.provider_id,provider_name:item.display_name,calendarID:slot.calendarID||item.calendar_id}:mode==='dates'?{date:String(slot),provider_id:item.provider_id,provider_name:item.display_name,calendarID:item.calendar_id}:{time:String(slot),provider_id:item.provider_id,provider_name:item.display_name,calendarID:item.calendar_id});
    }));
    collected.push(...results.flat());
  }
  if(mode==='dates'){
    const byDate=new Map();
    for(const item of collected){const key=String(item.date||item.day||'').slice(0,10);if(key&&!byDate.has(key))byDate.set(key,item);}
    return {ok:true,dates:[...byDate.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))),timezone,provider:null};
  }
  collected.sort((a,b)=>String(a.time||a.datetime||'').localeCompare(String(b.time||b.datetime||'')));
  return {ok:true,times:collected,timezone,provider:null};
}
async function book(req,body){
  const context=await requireFlowtelMember(req);
  const service=await getService(context);
  if(body.consent!==true){const error=new Error('Consent is required before a Priestess may access your Flowtel data for this call.');error.statusCode=400;throw error;}
  const provider=await requireProvider(context,service,String(body.provider_id||''));
  const timezone=validTimezone(body.timezone||context.profile.timezone);
  const datetime=String(body.datetime||'').trim();
  const {startsAt,endsAt}=appointmentTimes({datetime,durationMinutes:service.duration_minutes});
  const period=periodKeyFor(new Date(startsAt));
  const existing=array(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`select=id,status&customer_user_id=eq.${enc(context.user.id)}&source_product=eq.flowtel&service_type_id=eq.${enc(service.id)}&service_period_key=eq.${enc(period)}&status=in.(pending,scheduled,rescheduled,completed)&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  if(existing.length){const error=new Error('Your complimentary Womb Magic call has already been received for this month.');error.statusCode=409;throw error;}
  const pendingPayload={provider_id:provider.provider_id,service_type_id:service.id,customer_user_id:context.user.id,source_product:'flowtel',starts_at:startsAt,ends_at:endsAt,status:'pending',acuity_calendar_id:provider.calendar_id,acuity_appointment_type_id:service.acuity_appointment_type_id,client_timezone:timezone,service_period_key:period,consent_language:WOMB_MAGIC_CONSENT_LANGUAGE,consent_granted_at:nowIso(),booking_source:'flowtel_womb_magic',external_payload:{requested_datetime:datetime}};
  let pending;
  try{
    pending=row(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments'),{method:'POST',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify(pendingPayload)}));
  }catch(error){if(error.statusCode===409){error.message='Your complimentary Womb Magic call has already been received for this month.';}throw error;}
  try{
    const names=firstLastForBooking(context.profile,context.user);
    const acuity=await acuityFetch('/appointments',{method:'POST',body:{datetime,appointmentTypeID:Number(service.acuity_appointment_type_id),calendarID:Number(provider.calendar_id),firstName:names.firstName,lastName:names.lastName,email:context.user.email,phone:String(body.phone||context.profile.phone||'').trim()||undefined,timezone}});
    const actualStart=dateTimeFromAcuity(acuity)||datetime;
    const times=appointmentTimes({datetime:actualStart,durationMinutes:Number(acuity.duration||service.duration_minutes)});
    const updated=row(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(pending.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify({acuity_appointment_id:String(acuity.id),starts_at:times.startsAt,ends_at:times.endsAt,status:'scheduled',last_synced_at:nowIso(),external_payload:acuity,updated_at:nowIso()})}));
    const activeUntil=new Date(new Date(times.endsAt).getTime()+Number(service.access_days_after||7)*86400000).toISOString();
    const grant=row(await fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants'),{method:'POST',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify({appointment_id:pending.id,client_id:context.user.id,practitioner_id:provider.practitioner_id,service_key:service.service_key,consent_language:WOMB_MAGIC_CONSENT_LANGUAGE,consent_granted_at:nowIso(),active_from:nowIso(),active_until:activeUntil,status:'active'})}));
    await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(pending.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({access_grant_id:grant.id,updated_at:nowIso()})});
    return {ok:true,appointment:publicAppointment({...updated,practitioner_id:provider.practitioner_id,practitioner_name:provider.display_name,service_name:service.service_name,access_until:activeUntil})};
  }catch(error){
    await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(pending.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'failed',external_payload:{error:error.message},updated_at:nowIso()})}).catch(()=>{});
    throw error;
  }
}
async function ownedAppointment(context,id){
  const rows=await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`select=*&id=eq.${enc(id)}&customer_user_id=eq.${enc(context.user.id)}&source_product=eq.flowtel&limit=1`),{headers:serviceHeaders(context.serviceKey)});
  const appointment=row(rows);if(!appointment){const error=new Error('That call could not be found.');error.statusCode=404;throw error;}return appointment;
}
async function reschedule(req,body){
  const context=await requireFlowtelMember(req);const service=await getService(context);const appointment=await ownedAppointment(context,String(body.appointment_id||''));
  if(!appointment.acuity_appointment_id){const error=new Error('This call is not connected to Acuity.');error.statusCode=409;throw error;}
  const timezone=validTimezone(body.timezone||context.profile.timezone);const datetime=String(body.datetime||'').trim();
  const acuity=await acuityFetch(`/appointments/${enc(appointment.acuity_appointment_id)}/reschedule`,{method:'PUT',body:{datetime,calendarID:Number(appointment.acuity_calendar_id),timezone}});
  const times=appointmentTimes({datetime:dateTimeFromAcuity(acuity)||datetime,durationMinutes:Number(acuity.duration||service.duration_minutes)});
  await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({starts_at:times.startsAt,ends_at:times.endsAt,status:'rescheduled',client_timezone:timezone,last_synced_at:nowIso(),external_payload:acuity,updated_at:nowIso()})});
  const activeUntil=new Date(new Date(times.endsAt).getTime()+Number(service.access_days_after||7)*86400000).toISOString();
  await fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants',`appointment_id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({active_until:activeUntil,status:'active',revoked_at:null,revoked_reason:null,updated_at:nowIso()})});
  return {ok:true,appointment:publicAppointment({...appointment,starts_at:times.startsAt,ends_at:times.endsAt,status:'rescheduled',client_timezone:timezone,access_until:activeUntil})};
}
async function cancel(req,body){
  const context=await requireFlowtelMember(req);const appointment=await ownedAppointment(context,String(body.appointment_id||''));
  if(appointment.acuity_appointment_id)await acuityFetch(`/appointments/${enc(appointment.acuity_appointment_id)}/cancel`,{method:'PUT'});
  const now=nowIso();
  await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'cancelled',canceled_at:now,last_synced_at:now,updated_at:now})});
  await fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants',`appointment_id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'revoked',revoked_at:now,revoked_reason:'appointment cancelled',updated_at:now})});
  return {ok:true};
}
async function providerCalls(req){
  const context=await requireFlowtelProvider(req);
  const rows=await fetchJson(`${context.supabaseUrl}/rest/v1/rpc/flowtel_list_my_upcoming_service_calls`,{method:'POST',headers:{...serviceHeaders(context.serviceKey),'Authorization':`Bearer ${context.token}`},body:'{}'});
  return {ok:true,calls:array(rows)};
}
async function ownerSetup(req){
  const context=await requireFlowtelOwner(req);const [me,calendars,types,profiles,service]=await Promise.all([acuityFetch('/me'),acuityFetch('/calendars'),acuityFetch('/appointment-types'),fetchJson(serviceRestUrl(context,'profiles','select=*'),{headers:serviceHeaders(context.serviceKey)}),getService(context)]);
  const members=array(profiles).filter(profile=>{
    const membership=String(profile.membership_type||'').toLowerCase().replace(/[^a-z]/g,'');const role=String(profile.role||'').toLowerCase();return ['flowfm','council'].includes(membership)||['practitioner','mentor','admin','owner'].includes(role)||Number(profile.membership_rank||0)>=2;
  });
  const mappings=array(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles','select=*&product_key=eq.flowtel&provider_kind=eq.practitioner'),{headers:serviceHeaders(context.serviceKey)}));
  const assignmentRows=array(await fetchJson(serviceRestUrl(context,'flowtel_provider_service_assignments',`select=*&service_type_id=eq.${enc(service.id)}`),{headers:serviceHeaders(context.serviceKey)}));
  return {ok:true,connection:{name:me?.name||me?.firstName||'Acuity connected',user_id:me?.id||null},calendars:array(calendars),appointment_types:array(types),service,members:members.map(profile=>({id:profile.id,name:profileDisplayName(profile),email:profile.email,role:profile.role,membership_type:profile.membership_type})),mappings,assignments:assignmentRows,webhook_url:`${require('../server/acuity-server.js').flowtelPublicOrigin()}/api/acuity-webhook`};
}
async function ownerSave(req,body){
  const context=await requireFlowtelOwner(req);const service=await getService(context);const appointmentTypeId=normalizeId(body.appointment_type_id);if(!appointmentTypeId){const error=new Error('Choose the Womb Magic appointment type.');error.statusCode=400;throw error;}
  await fetchJson(serviceRestUrl(context,'flowtel_provider_service_types',`id=eq.${enc(service.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({acuity_appointment_type_id:appointmentTypeId,updated_at:nowIso()})});
  const mappings=Array.isArray(body.mappings)?body.mappings:[];const results=[];
  for(const item of mappings){
    const userId=String(item.user_id||'');if(!userId)continue;const calendarId=normalizeId(item.calendar_id);const enabled=Boolean(item.enabled&&calendarId);
    const profileRows=await fetchJson(serviceRestUrl(context,'profiles',`select=*&id=eq.${enc(userId)}&limit=1`),{headers:serviceHeaders(context.serviceKey)});const profile=row(profileRows);if(!profile)continue;
    const payload={user_id:userId,product_key:'flowtel',provider_kind:'practitioner',source_profile_id:userId,display_name:profileDisplayName(profile),timezone:validTimezone(profile.timezone),acuity_calendar_id:calendarId||null,acuity_calendar_name:String(item.calendar_name||''),integration_status:enabled?'connected':'paused',is_active:true,booking_enabled:enabled,acuity_last_verified_at:nowIso(),updated_at:nowIso()};
    const provider=row(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles','on_conflict=product_key,provider_kind,source_profile_id'),{method:'POST',headers:serviceHeaders(context.serviceKey,'resolution=merge-duplicates,return=representation'),body:JSON.stringify(payload)}));
    await fetchJson(serviceRestUrl(context,'flowtel_provider_service_assignments','on_conflict=provider_id,service_type_id'),{method:'POST',headers:serviceHeaders(context.serviceKey,'resolution=merge-duplicates'),body:JSON.stringify({provider_id:provider.id,service_type_id:service.id,is_enabled:enabled,updated_at:nowIso()})});
    results.push(provider);
  }
  return {ok:true,mappings:results};
}

module.exports=async function handler(req,res){
  setPublicCors(res,'POST, OPTIONS');if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed.'});
  try{
    const body=await readRequestBody(req);let result;
    switch(String(body.action||'')){
      case 'bootstrap':result=await bootstrap(req);break;
      case 'dates':result=await availability(req,body,'dates');break;
      case 'times':result=await availability(req,body,'times');break;
      case 'book':result=await book(req,body);break;
      case 'reschedule':result=await reschedule(req,body);break;
      case 'cancel':result=await cancel(req,body);break;
      case 'provider-calls':result=await providerCalls(req);break;
      case 'owner-setup':result=await ownerSetup(req);break;
      case 'owner-save':result=await ownerSave(req,body);break;
      default:return res.status(400).json({ok:false,error:'Unknown Acuity action.'});
    }
    return res.status(200).json(result);
  }catch(error){return sendAcuityError(res,error);}
};
