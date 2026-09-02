const {
  WOMB_MAGIC_CONSENT_LANGUAGE,
  acuityFetch,
  appointmentTimes,
  dateOnlyInZone,
  extractZoomMeetingUrl,
  firstLastForBooking,
  normalizeId,
  profileDisplayName,
  readRequestBody,
  requireFlowtelMember,
  sendAcuityError,
  serviceHeaders,
  serviceRestUrl,
  setPublicCors,
  validTimezone,
}=require('../server/acuity-server.js');
const {fetchJson}=require('../server/guest-house-server.js');

const PORTAL_DAYS=28;
const MAX_SESSIONS=4;
const PORTAL_CONSENT_LANGUAGE=`${WOMB_MAGIC_CONSENT_LANGUAGE} For the 4-Week Womb Magic Portal, the same Priestess may keep this preparation access continuously for the 28-day Portal so she can hold the full four-week container. Your first appointment establishes a standing weekly Portal time and Flowtel schedules all four sessions when that same time is available for all four weeks. Individual weeks may be rescheduled without moving the other Portal sessions.`;

function enc(value){return encodeURIComponent(String(value));}
function row(data){return Array.isArray(data)?data[0]||null:null;}
function array(data){return Array.isArray(data)?data:[];}
function nowIso(){return new Date().toISOString();}
function slotValue(item){return String(item?.time||item?.datetime||item?.value||item||'');}
function meetingUrlFor(appointment={}){
  if(!['pending','scheduled','rescheduled'].includes(String(appointment?.status||'')))return '';
  return extractZoomMeetingUrl(appointment?.external_payload||{});
}
function dateTimeFromAcuity(appointment){return appointment?.datetime||appointment?.datetimeCreated||appointment?.time||'';}
function addDaysDateString(value,days){
  const date=new Date(`${String(value||'').slice(0,10)}T12:00:00Z`);
  if(Number.isNaN(date.getTime()))return '';
  date.setUTCDate(date.getUTCDate()+Number(days||0));
  return date.toISOString().slice(0,10);
}
function clockKey(value,timezone){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:validTimezone(timezone),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.hour||'00'}:${values.minute||'00'}`;
}
function weekdayIndex(value,timezone){
  const dateString=dateOnlyInZone(new Date(value),timezone);
  const date=new Date(`${dateString}T12:00:00Z`);
  return Number.isNaN(date.getTime())?null:date.getUTCDay();
}
async function expirePortals(context){
  const stamp=nowIso();
  await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`status=eq.active&active_until=lte.${enc(stamp)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'completed',completed_at:stamp,updated_at:stamp})}).catch(()=>{});
}
function publicSession(appointment={},provider={}){
  return {
    id:appointment.id,
    acuity_appointment_id:appointment.acuity_appointment_id,
    provider_id:appointment.provider_id,
    practitioner_id:provider.user_id||appointment.practitioner_id||null,
    practitioner_name:provider.display_name||appointment.practitioner_name||'Flowtel Priestess',
    starts_at:appointment.starts_at,
    ends_at:appointment.ends_at,
    status:appointment.status,
    client_timezone:appointment.client_timezone,
    portal_id:appointment.womb_magic_portal_id,
    session_number:appointment.womb_magic_portal_session_number,
    meeting_url:meetingUrlFor(appointment)||null,
  };
}
async function getService(context){
  const service=row(await fetchJson(serviceRestUrl(context,'flowtel_provider_service_types','select=*&product_key=eq.flowtel&service_key=eq.womb_magic&limit=1'),{headers:serviceHeaders(context.serviceKey)}));
  if(!service){const error=new Error('Womb Magic scheduling is not configured yet.');error.statusCode=503;throw error;}
  if(!normalizeId(service.acuity_appointment_type_id)){const error=new Error('The Womb Magic Acuity appointment type has not been mapped yet.');error.statusCode=503;throw error;}
  return service;
}
async function providerRows(context,service){
  await expirePortals(context);
  const providers=array(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles','select=*&product_key=eq.flowtel&provider_kind=eq.practitioner&is_active=eq.true&booking_enabled=eq.true&acuity_calendar_id=not.is.null&order=display_name.asc'),{headers:serviceHeaders(context.serviceKey)}));
  if(!providers.length)return [];
  const assignments=array(await fetchJson(serviceRestUrl(context,'flowtel_provider_service_assignments',`select=provider_id,is_enabled&service_type_id=eq.${enc(service.id)}&is_enabled=eq.true&provider_id=in.(${providers.map(item=>enc(item.id)).join(',')})`),{headers:serviceHeaders(context.serviceKey)}));
  const enabled=new Set(assignments.map(item=>item.provider_id));
  const allowed=providers.filter(item=>enabled.has(item.id));
  if(!allowed.length)return [];
  const ids=allowed.map(item=>item.user_id);
  const [profiles,priestesses,portals]=await Promise.all([
    fetchJson(serviceRestUrl(context,'profiles',`select=*&id=in.(${ids.map(enc).join(',')})`),{headers:serviceHeaders(context.serviceKey)}),
    fetchJson(serviceRestUrl(context,'flow_fm_priestess_profiles',`select=member_id,status,priestess_name,profile_photo_url,bio,modalities,who_she_serves,timezone,location&member_id=in.(${ids.map(enc).join(',')})`),{headers:serviceHeaders(context.serviceKey)}),
    fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`select=id,client_id,practitioner_id,status,active_until&status=in.(pending,active)&active_until=gt.${enc(nowIso())}`),{headers:serviceHeaders(context.serviceKey)}).catch(()=>[]),
  ]);
  const profileMap=new Map(array(profiles).map(item=>[item.id,item]));
  const priestessMap=new Map(array(priestesses).map(item=>[item.member_id,item]));
  const occupied=new Map(array(portals).map(item=>[item.practitioner_id,item]));
  return allowed.map(item=>{
    const profile=profileMap.get(item.user_id)||{};
    const priestess=priestessMap.get(item.user_id)||{};
    const portal=occupied.get(item.user_id)||null;
    return {
      provider_id:item.id,
      practitioner_id:item.user_id,
      user_id:item.user_id,
      display_name:priestess.priestess_name||item.display_name||profileDisplayName(profile,'Flowtel Priestess'),
      calendar_id:item.acuity_calendar_id,
      timezone:validTimezone(item.timezone||priestess.timezone||profile.timezone),
      listed_timezone:String(priestess.timezone||profile.timezone||'').trim(),
      photo_url:priestess.profile_photo_url||profile.profile_photo_url||profile.photo_url||'',
      bio:priestess.bio||'',modalities:priestess.modalities||'',who_she_serves:priestess.who_she_serves||'',location:priestess.location||profile.location||'',
      portal_available:!portal,active_portal_client_id:portal?.client_id||null,
    };
  });
}
async function currentPortal(context){
  await expirePortals(context);
  let portal=row(await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`select=*&client_id=eq.${enc(context.user.id)}&status=in.(pending,active)&order=created_at.desc&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  if(portal&&portal.status==='active'&&new Date(portal.active_until).getTime()<=Date.now()){
    await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`id=eq.${enc(portal.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'completed',completed_at:nowIso(),updated_at:nowIso()})});
    portal=null;
  }
  return portal;
}
async function portalSessions(context,portal){
  if(!portal)return [];
  const sessions=array(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`select=*&womb_magic_portal_id=eq.${enc(portal.id)}&source_product=eq.flowtel&order=womb_magic_portal_session_number.asc,starts_at.asc`),{headers:serviceHeaders(context.serviceKey)}));
  if(!sessions.length)return [];
  const provider=row(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles',`select=id,user_id,display_name&id=eq.${enc(portal.provider_id)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}))||{};
  return sessions.map(item=>publicSession(item,provider));
}
async function bootstrap(req){
  const context=await requireFlowtelMember(req);const service=await getService(context);
  const [providers,portal]=await Promise.all([providerRows(context,service),currentPortal(context)]);const sessions=await portalSessions(context,portal);
  const provider=portal?providers.find(item=>item.provider_id===portal.provider_id)||null:null;
  return {ok:true,service:{duration_minutes:Number(service.duration_minutes||45),consent_language:PORTAL_CONSENT_LANGUAGE},member_timezone:validTimezone(context.profile.timezone),portal:portal?{...portal,practitioner_name:provider?.display_name||'your Flow FM Priestess',sessions}:null,providers:providers.filter(item=>item.portal_available||item.practitioner_id===portal?.practitioner_id),max_sessions:MAX_SESSIONS,portal_days:PORTAL_DAYS};
}
async function requireProvider(context,service,providerId,{portal=null}={}){
  const providers=await providerRows(context,service);const provider=providers.find(item=>item.provider_id===providerId);
  if(!provider){const error=new Error('That Priestess is not currently available for Womb Magic.');error.statusCode=404;throw error;}
  if(!portal&&!provider.portal_available){const error=new Error('That Priestess is currently holding another 4-Week Womb Magic Portal. Choose another available Priestess.');error.statusCode=409;throw error;}
  if(portal&&provider.practitioner_id!==portal.practitioner_id){const error=new Error('Your four-week Portal stays with the same Priestess.');error.statusCode=409;throw error;}
  return provider;
}
async function acuityTimesForDate({service,provider,date,timezone,ignoreAppointmentId=''}){
  const query={appointmentTypeID:service.acuity_appointment_type_id,calendarID:provider.calendar_id,timezone,date};
  if(ignoreAppointmentId)query['ignoreAppointmentIDs[]']=ignoreAppointmentId;
  return array(await acuityFetch('/availability/times',{query}));
}
async function recurringSeriesSlots({service,provider,date,timezone}){
  const dates=[0,7,14,21].map(days=>addDaysDateString(date,days));
  if(dates.some(value=>!value))return [];
  const weekly=await Promise.all(dates.map(day=>acuityTimesForDate({service,provider,date:day,timezone})));
  const maps=weekly.map(items=>{
    const map=new Map();
    for(const item of items){const key=clockKey(slotValue(item),timezone);if(key&&!map.has(key))map.set(key,item);}
    return map;
  });
  return weekly[0].map(first=>{
    const key=clockKey(slotValue(first),timezone);if(!key||!maps.every(map=>map.has(key)))return null;
    const matches=maps.map(map=>map.get(key));
    return {...first,recurring:true,series_datetimes:matches.map(slotValue),series_dates:dates,weekly_time:key};
  }).filter(Boolean);
}
async function availability(req,body,mode){
  const context=await requireFlowtelMember(req);const service=await getService(context);const portal=await currentPortal(context);
  const providerId=String(body.provider_id||portal?.provider_id||'');if(!providerId){const error=new Error('Choose a Priestess first.');error.statusCode=400;throw error;}
  const provider=await requireProvider(context,service,providerId,{portal});const timezone=validTimezone(body.timezone||context.profile.timezone);
  if(mode==='times'&&!portal){
    const date=String(body.date||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){const error=new Error('Choose a valid date.');error.statusCode=400;throw error;}
    const slots=await recurringSeriesSlots({service,provider,date,timezone});return {ok:true,times:slots,timezone,provider,recurring_series:true};
  }
  const query={appointmentTypeID:service.acuity_appointment_type_id,calendarID:provider.calendar_id,timezone};
  if(mode==='dates')query.month=String(body.month||'').slice(0,7);else {query.date=String(body.date||'').slice(0,10);if(body.ignore_appointment_id)query['ignoreAppointmentIDs[]']=body.ignore_appointment_id;}
  if((mode==='dates'&&!/^\d{4}-\d{2}$/.test(query.month))||(mode==='times'&&!/^\d{4}-\d{2}-\d{2}$/.test(query.date))){const error=new Error(`Choose a valid ${mode==='dates'?'month':'date'}.`);error.statusCode=400;throw error;}
  let data=array(await acuityFetch(`/availability/${mode}`,{query}));
  if(portal){const start=new Date(portal.starts_at).getTime(),end=new Date(portal.active_until).getTime();data=data.filter(item=>{const value=mode==='dates'?String(item?.date||item?.day||item).slice(0,10):slotValue(item);const candidate=mode==='dates'?new Date(`${value}T12:00:00Z`).getTime():new Date(value).getTime();const minimum=mode==='dates'?start-86400000:start-60000;return Number.isFinite(candidate)&&candidate>=minimum&&candidate<=end;});}
  const normalized=data.map(item=>typeof item==='object'?{...item,provider_id:provider.provider_id,provider_name:provider.display_name,calendarID:item.calendarID||provider.calendar_id}:mode==='dates'?{date:String(item),provider_id:provider.provider_id,provider_name:provider.display_name,calendarID:provider.calendar_id}:{time:String(item),provider_id:provider.provider_id,provider_name:provider.display_name,calendarID:provider.calendar_id});
  return {ok:true,[mode]:normalized,timezone,provider,recurring_series:false};
}
function nextSessionNumber(sessions=[]){
  const occupied=new Set(sessions.filter(item=>['pending','scheduled','rescheduled','completed'].includes(String(item.status||''))).map(item=>Number(item.womb_magic_portal_session_number||item.session_number)));
  for(let number=1;number<=MAX_SESSIONS;number+=1)if(!occupied.has(number))return number;return null;
}
async function createPortalAppointment({context,service,provider,portal,datetime,sessionNumber,timezone,phone}){
  const requested=appointmentTimes({datetime,durationMinutes:service.duration_minutes});
  const pendingPayload={provider_id:provider.provider_id,service_type_id:service.id,customer_user_id:context.user.id,source_product:'flowtel',starts_at:requested.startsAt,ends_at:requested.endsAt,status:'pending',acuity_calendar_id:provider.calendar_id,acuity_appointment_type_id:service.acuity_appointment_type_id,client_timezone:timezone,service_period_key:null,consent_language:PORTAL_CONSENT_LANGUAGE,consent_granted_at:nowIso(),booking_source:'flowtel_womb_magic_portal',womb_magic_portal_id:portal.id,womb_magic_portal_session_number:sessionNumber,external_payload:{requested_datetime:datetime,womb_magic_portal_id:portal.id,portal_session_number:sessionNumber}};
  const pending=row(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments'),{method:'POST',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify(pendingPayload)}));
  let acuity=null;
  try{
    const names=firstLastForBooking(context.profile,context.user);
    acuity=await acuityFetch('/appointments',{method:'POST',body:{datetime,appointmentTypeID:Number(service.acuity_appointment_type_id),calendarID:Number(provider.calendar_id),firstName:names.firstName,lastName:names.lastName,email:context.user.email,phone:String(phone||context.profile.phone||'').trim()||undefined,timezone}});
    const actualStart=dateTimeFromAcuity(acuity)||datetime;const times=appointmentTimes({datetime:actualStart,durationMinutes:Number(acuity.duration||service.duration_minutes)});
    const updated=row(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(pending.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify({acuity_appointment_id:String(acuity.id),starts_at:times.startsAt,ends_at:times.endsAt,status:'scheduled',last_synced_at:nowIso(),external_payload:{...acuity,womb_magic_portal_id:portal.id,portal_session_number:sessionNumber},updated_at:nowIso()})}));
    const grant=row(await fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants'),{method:'POST',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify({appointment_id:pending.id,client_id:context.user.id,practitioner_id:provider.practitioner_id,service_key:'womb_magic_portal',consent_language:PORTAL_CONSENT_LANGUAGE,consent_granted_at:nowIso(),active_from:portal.starts_at,active_until:portal.active_until,status:'active'})}));
    await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(pending.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({access_grant_id:grant.id,updated_at:nowIso()})});
    return {appointment:updated,acuityId:String(acuity.id),grantId:grant.id};
  }catch(error){
    if(acuity?.id)await acuityFetch(`/appointments/${enc(acuity.id)}/cancel`,{method:'PUT'}).catch(()=>{});
    await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(pending.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'failed',external_payload:{error:error.message,womb_magic_portal_id:portal.id,portal_session_number:sessionNumber},updated_at:nowIso()})}).catch(()=>{});throw error;
  }
}
async function rollbackPortalSeries(context,portal,created=[]){
  const stamp=nowIso();
  for(const item of [...created].reverse()){
    if(item.acuityId)await acuityFetch(`/appointments/${enc(item.acuityId)}/cancel`,{method:'PUT'}).catch(()=>{});
    if(item.appointment?.id)await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(item.appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'cancelled',canceled_at:stamp,last_synced_at:stamp,updated_at:stamp})}).catch(()=>{});
    if(item.grantId)await fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants',`id=eq.${enc(item.grantId)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'revoked',revoked_at:stamp,revoked_reason:'portal series booking rolled back',updated_at:stamp})}).catch(()=>{});
  }
  await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`id=eq.${enc(portal.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'cancelled',cancelled_at:stamp,updated_at:stamp})}).catch(()=>{});
}
async function book(req,body){
  const context=await requireFlowtelMember(req);const service=await getService(context);
  if(body.consent!==true){const error=new Error('Consent is required before beginning or continuing a Womb Magic Portal.');error.statusCode=400;throw error;}
  let portal=await currentPortal(context);const providerId=String(body.provider_id||portal?.provider_id||'');const provider=await requireProvider(context,service,providerId,{portal});const timezone=validTimezone(body.timezone||context.profile.timezone);const datetime=String(body.datetime||'').trim();
  if(!portal){
    const [already,occupied]=await Promise.all([
      fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`select=id&client_id=eq.${enc(context.user.id)}&status=in.(pending,active)&limit=1`),{headers:serviceHeaders(context.serviceKey)}).then(row),
      fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`select=id&practitioner_id=eq.${enc(provider.practitioner_id)}&status=in.(pending,active)&active_until=gt.${enc(nowIso())}&limit=1`),{headers:serviceHeaders(context.serviceKey)}).then(row),
    ]);
    if(already){const error=new Error('You already have an active Womb Magic Portal.');error.statusCode=409;throw error;}
    if(occupied){const error=new Error('That Priestess is already holding another four-week Portal.');error.statusCode=409;throw error;}
    const firstDate=dateOnlyInZone(new Date(datetime),timezone);const candidates=await recurringSeriesSlots({service,provider,date:firstDate,timezone});
    const requestedMs=new Date(datetime).getTime();const selected=candidates.find(slot=>new Date(slotValue(slot)).getTime()===requestedMs);
    if(!selected){const error=new Error('That weekly time is no longer open for all four weeks. Choose another Portal time.');error.statusCode=409;throw error;}
    const series=selected.series_datetimes||[];if(series.length!==MAX_SESSIONS){const error=new Error('Flowtel could not confirm all four weekly Portal sessions. Choose another time.');error.statusCode=409;throw error;}
    const firstTimes=appointmentTimes({datetime:series[0],durationMinutes:service.duration_minutes});const activeUntil=new Date(new Date(firstTimes.startsAt).getTime()+PORTAL_DAYS*86400000).toISOString();
    portal=row(await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals'),{method:'POST',headers:serviceHeaders(context.serviceKey,'return=representation'),body:JSON.stringify({client_id:context.user.id,practitioner_id:provider.practitioner_id,provider_id:provider.provider_id,status:'pending',starts_at:firstTimes.startsAt,active_until:activeUntil,recurrence_timezone:timezone,recurrence_weekday:weekdayIndex(firstTimes.startsAt,timezone),recurrence_time:clockKey(firstTimes.startsAt,timezone),consent_language:PORTAL_CONSENT_LANGUAGE,consent_granted_at:nowIso()})}));
    const created=[];
    try{
      for(let index=0;index<series.length;index+=1)created.push(await createPortalAppointment({context,service,provider,portal,datetime:series[index],sessionNumber:index+1,timezone,phone:body.phone}));
      await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`id=eq.${enc(portal.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'active',updated_at:nowIso()})});
      portal={...portal,status:'active'};
      return {ok:true,portal:{...portal,practitioner_name:provider.display_name},sessions:created.map(item=>publicSession(item.appointment,provider)),scheduled_series:true};
    }catch(error){await rollbackPortalSeries(context,portal,created);const wrapped=new Error('One of the four weekly times changed while your Portal was being scheduled. Nothing was kept. Please choose another weekly time.');wrapped.statusCode=409;throw wrapped;}
  }
  const requested=appointmentTimes({datetime,durationMinutes:service.duration_minutes});const startsMs=new Date(requested.startsAt).getTime();if(startsMs<new Date(portal.starts_at).getTime()-60000||startsMs>new Date(portal.active_until).getTime()){const error=new Error('Choose a session time inside your active four-week Portal.');error.statusCode=409;throw error;}
  const rawSessions=array(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`select=id,status,womb_magic_portal_session_number&womb_magic_portal_id=eq.${enc(portal.id)}`),{headers:serviceHeaders(context.serviceKey)}));const sessionNumber=nextSessionNumber(rawSessions);if(!sessionNumber){const error=new Error('All four Womb Magic sessions in this Portal are already scheduled or completed.');error.statusCode=409;throw error;}
  const created=await createPortalAppointment({context,service,provider,portal,datetime,sessionNumber,timezone,phone:body.phone});
  return {ok:true,portal:{...portal,practitioner_name:provider.display_name},session:publicSession(created.appointment,provider),scheduled_series:false};
}
async function portalSessionForParticipant(context,id,{clientOnly=false}={}){
  const appointment=row(await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`select=*&id=eq.${enc(id)}&source_product=eq.flowtel&womb_magic_portal_id=not.is.null&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  if(!appointment){const error=new Error('That Portal session could not be found.');error.statusCode=404;throw error;}
  const portal=row(await fetchJson(serviceRestUrl(context,'flowtel_womb_magic_portals',`select=*&id=eq.${enc(appointment.womb_magic_portal_id)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  if(!portal){const error=new Error('That Womb Magic Portal could not be found.');error.statusCode=404;throw error;}
  if(!['pending','active'].includes(String(portal.status||''))){const error=new Error('This four-week Portal is no longer active.');error.statusCode=409;throw error;}
  const role=String(context.profile?.role||'').toLowerCase();const isClient=portal.client_id===context.user.id;const isPractitioner=portal.practitioner_id===context.user.id;const isOwner=['owner','admin'].includes(role);
  if(clientOnly&&!isClient){const error=new Error('Only the Portal client can cancel this session from Flowtel.');error.statusCode=403;throw error;}
  if(!clientOnly&&!isClient&&!isPractitioner&&!isOwner){const error=new Error('Only this Portal client or her assigned Priestess can change this session.');error.statusCode=403;throw error;}
  const provider=row(await fetchJson(serviceRestUrl(context,'flowtel_provider_scheduling_profiles',`select=*&id=eq.${enc(portal.provider_id)}&limit=1`),{headers:serviceHeaders(context.serviceKey)}));
  if(!provider){const error=new Error('This Portal Priestess scheduling profile could not be found.');error.statusCode=404;throw error;}
  return {appointment,portal,provider};
}
async function sessionAvailability(req,body,mode){
  const context=await requireFlowtelMember(req);const service=await getService(context);const {appointment,portal,provider}=await portalSessionForParticipant(context,String(body.appointment_id||''));const timezone=validTimezone(body.timezone||appointment.client_timezone||context.profile.timezone);
  const query={appointmentTypeID:service.acuity_appointment_type_id,calendarID:provider.acuity_calendar_id,timezone};
  if(mode==='dates')query.month=String(body.month||'').slice(0,7);else {query.date=String(body.date||'').slice(0,10);if(appointment.acuity_appointment_id)query['ignoreAppointmentIDs[]']=appointment.acuity_appointment_id;}
  if((mode==='dates'&&!/^\d{4}-\d{2}$/.test(query.month))||(mode==='times'&&!/^\d{4}-\d{2}-\d{2}$/.test(query.date))){const error=new Error(`Choose a valid ${mode==='dates'?'month':'date'}.`);error.statusCode=400;throw error;}
  let data=array(await acuityFetch(`/availability/${mode}`,{query}));const start=new Date(portal.starts_at).getTime(),end=new Date(portal.active_until).getTime();data=data.filter(item=>{const value=mode==='dates'?String(item?.date||item?.day||item).slice(0,10):slotValue(item);const candidate=mode==='dates'?new Date(`${value}T12:00:00Z`).getTime():new Date(value).getTime();const minimum=mode==='dates'?start-86400000:start-60000;return Number.isFinite(candidate)&&candidate>=minimum&&candidate<=end;});
  return {ok:true,[mode]:data,timezone,appointment_id:appointment.id,session_number:appointment.womb_magic_portal_session_number};
}
async function reschedule(req,body){
  const context=await requireFlowtelMember(req);const service=await getService(context);const {appointment,portal}=await portalSessionForParticipant(context,String(body.appointment_id||''));
  if(!appointment.acuity_appointment_id){const error=new Error('This Portal session is not connected to Acuity.');error.statusCode=409;throw error;}
  const timezone=validTimezone(body.timezone||appointment.client_timezone||context.profile.timezone);const datetime=String(body.datetime||'').trim();const requested=appointmentTimes({datetime,durationMinutes:service.duration_minutes});
  if(new Date(requested.startsAt).getTime()<new Date(portal.starts_at).getTime()-60000||new Date(requested.startsAt).getTime()>new Date(portal.active_until).getTime()){const error=new Error('Choose a new time inside the active four-week Portal.');error.statusCode=409;throw error;}
  const acuity=await acuityFetch(`/appointments/${enc(appointment.acuity_appointment_id)}/reschedule`,{method:'PUT',body:{datetime,calendarID:Number(appointment.acuity_calendar_id),timezone}});const times=appointmentTimes({datetime:dateTimeFromAcuity(acuity)||datetime,durationMinutes:Number(acuity.duration||service.duration_minutes)});
  await fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({starts_at:times.startsAt,ends_at:times.endsAt,status:'rescheduled',client_timezone:appointment.client_timezone||timezone,last_synced_at:nowIso(),external_payload:{...acuity,womb_magic_portal_id:portal.id,portal_session_number:appointment.womb_magic_portal_session_number},updated_at:nowIso()})});
  return {ok:true};
}
async function cancel(req,body){
  const context=await requireFlowtelMember(req);const {appointment}=await portalSessionForParticipant(context,String(body.appointment_id||''),{clientOnly:true});if(appointment.acuity_appointment_id)await acuityFetch(`/appointments/${enc(appointment.acuity_appointment_id)}/cancel`,{method:'PUT'});const stamp=nowIso();
  await Promise.all([fetchJson(serviceRestUrl(context,'flowtel_external_appointments',`id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'cancelled',canceled_at:stamp,last_synced_at:stamp,updated_at:stamp})}),fetchJson(serviceRestUrl(context,'flowtel_appointment_access_grants',`appointment_id=eq.${enc(appointment.id)}`),{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({status:'revoked',revoked_at:stamp,revoked_reason:'portal session cancelled',updated_at:stamp})})]);return {ok:true};
}

module.exports=async function handler(req,res){
  setPublicCors(res,'POST, OPTIONS');if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed.'});
  try{const body=await readRequestBody(req);let result;switch(String(body.action||'')){case 'bootstrap':result=await bootstrap(req);break;case 'dates':result=await availability(req,body,'dates');break;case 'times':result=await availability(req,body,'times');break;case 'book':result=await book(req,body);break;case 'session-dates':result=await sessionAvailability(req,body,'dates');break;case 'session-times':result=await sessionAvailability(req,body,'times');break;case 'reschedule':result=await reschedule(req,body);break;case 'cancel':result=await cancel(req,body);break;default:return res.status(400).json({ok:false,error:'Unknown Womb Magic Portal action.'});}return res.status(200).json(result);}catch(error){return sendAcuityError(res,error,'This Womb Magic Portal request could not be completed.');}
};
