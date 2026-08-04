// Server-only Acuity helpers for Flowtel v0.10.81.
// Acuity credentials remain in Vercel environment variables and never enter browser code.

const crypto = require('crypto');
const {
  fetchJson,
  normalizeEmail,
  readRequestBody,
  requireOwner,
  requireUser,
  sendError,
  serviceHeaders,
  setPublicCors,
  trimTo,
}=require('./guest-house-server.js');

const ACUITY_API_BASE='https://acuityscheduling.com/api/v1';
const WOMB_MAGIC_CONSENT_LANGUAGE='By booking this Womb Magic call, you allow the Priestess holding your appointment to view your Flowtel cycle data, check-ins, reflections, Flow Map, and stay history so she can prepare for and hold your call. Her access begins when the call is booked and ends seven days after the appointment.';

function safeJsonParse(value){try{return JSON.parse(value);}catch(error){return null;}}
function normalizeId(value){const text=String(value ?? '').trim();return /^\d+$/.test(text)?text:'';}
function compactText(value,max=500){return String(value ?? '').trim().slice(0,max);}
function encodePath(value=''){return String(value).split('/').map(encodeURIComponent).join('/');}
function flowtelPublicOrigin(){return String(process.env.FLOWTEL_PUBLIC_ORIGIN || 'https://app.theflowtel.com').replace(/\/$/,'');}

function acuityConfig(){
  const userId=String(process.env.ACUITY_USER_ID || '').trim();
  const apiKey=String(process.env.ACUITY_API_KEY || '').trim();
  if(!userId || !apiKey){
    const error=new Error('Acuity is not connected yet. Add ACUITY_USER_ID and ACUITY_API_KEY in Vercel.');
    error.statusCode=503;
    throw error;
  }
  return {userId,apiKey};
}

function acuityHeaders({userId,apiKey}){
  return {
    Authorization:`Basic ${Buffer.from(`${userId}:${apiKey}`).toString('base64')}`,
    'Content-Type':'application/json',
    Accept:'application/json',
    'User-Agent':'Flowtel Acuity Bridge/0.10.81',
  };
}

async function acuityFetch(path,{method='GET',query=null,body=null}={}){
  const config=acuityConfig();
  const url=new URL(`${ACUITY_API_BASE}${path.startsWith('/')?path:`/${path}`}`);
  if(query){
    for(const [key,value] of Object.entries(query)){
      if(value===undefined || value===null || value==='') continue;
      if(Array.isArray(value)) value.forEach(item=>url.searchParams.append(key,String(item)));
      else url.searchParams.set(key,String(value));
    }
  }
  const response=await fetch(url,{method,headers:acuityHeaders(config),body:body===null?undefined:JSON.stringify(body)});
  const text=await response.text();
  const data=safeJsonParse(text);
  if(!response.ok){
    const error=new Error(data?.message || data?.error || text || `Acuity request failed with ${response.status}.`);
    error.statusCode=response.status;
    error.acuityError=data?.error || null;
    error.details=data;
    throw error;
  }
  return data ?? {};
}

function serviceRestUrl(context,resource,query=''){
  return `${context.supabaseUrl}/rest/v1/${resource}${query?`?${query}`:''}`;
}

async function profileForUser(context,userId=context.user.id){
  const rows=await fetchJson(serviceRestUrl(context,'profiles',`select=*&id=eq.${encodeURIComponent(userId)}&limit=1`),{
    method:'GET',headers:serviceHeaders(context.serviceKey),
  });
  return Array.isArray(rows)?rows[0]||null:null;
}

async function productAccessForUser(context,userId=context.user.id){
  const rows=await fetchJson(serviceRestUrl(context,'flowtel_product_access',`select=flowtel_access,access_role,access_source&user_id=eq.${encodeURIComponent(userId)}&limit=1`),{
    method:'GET',headers:serviceHeaders(context.serviceKey),
  });
  return Array.isArray(rows)?rows[0]||null:null;
}

function membershipRank(profile={}){
  const explicit=Number(profile.membership_rank||0);
  const membership=String(profile.membership_type||'').toLowerCase().replace(/[^a-z]/g,'');
  const role=String(profile.role||'').toLowerCase();
  return Math.max(
    explicit,
    membership==='council'?3:membership==='flowfm'?2:membership==='queendom'?1:0,
    ['owner','admin','practitioner','mentor'].includes(role)?2:0,
  );
}

async function requireFlowtelMember(req){
  const context=await requireUser(req);
  const [profile,access]=await Promise.all([profileForUser(context),productAccessForUser(context)]);
  if(!profile || !access?.flowtel_access || membershipRank(profile)<1){
    const error=new Error('A Queendom Room Key is required to book a Womb Magic call.');
    error.statusCode=403;
    throw error;
  }
  return {...context,profile,access};
}

async function requireFlowtelProvider(req){
  const context=await requireFlowtelMember(req);
  const role=String(context.profile?.role||'').toLowerCase();
  if(!['practitioner','mentor','admin','owner'].includes(role)){
    const error=new Error('This room is reserved for approved Flow FM Priestesses.');
    error.statusCode=403;
    throw error;
  }
  return context;
}

async function requireFlowtelOwner(req){
  const context=await requireOwner(req);
  const profile=await profileForUser(context);
  return {...context,profile};
}

function profileDisplayName(profile={},fallback='Flowtel Guest'){
  const direct=String(profile.display_name||'').trim();
  if(direct) return direct;
  const legal=[profile.first_name,profile.last_name].map(value=>String(value||'').trim()).filter(Boolean).join(' ');
  return legal || String(profile.email||'').split('@')[0] || fallback;
}

function firstLastForBooking(profile={},user={}){
  const display=profileDisplayName(profile,'Flowtel Guest').split(/\s+/).filter(Boolean);
  const first=String(profile.first_name||user.user_metadata?.first_name||display[0]||'Flowtel').trim();
  const last=String(profile.last_name||user.user_metadata?.last_name||display.slice(1).join(' ')||'Guest').trim();
  return {firstName:first.slice(0,100),lastName:last.slice(0,100)};
}

function validTimezone(value){
  const timezone=String(value||'').trim()||'America/Los_Angeles';
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone}).format(new Date());return timezone;}catch(error){return 'America/Los_Angeles';}
}

function periodKeyFor(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit'}).formatToParts(date);
  const year=parts.find(part=>part.type==='year')?.value;
  const month=parts.find(part=>part.type==='month')?.value;
  return `${year}-${month}`;
}

function dateOnlyInZone(date,timezone='America/Los_Angeles'){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:validTimezone(timezone),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function appointmentTimes({datetime,durationMinutes=45}){
  const starts=new Date(datetime);
  if(Number.isNaN(starts.getTime())){
    const error=new Error('Choose a valid appointment time.');
    error.statusCode=400;
    throw error;
  }
  const ends=new Date(starts.getTime()+Number(durationMinutes||45)*60000);
  return {startsAt:starts.toISOString(),endsAt:ends.toISOString()};
}

function verifyAcuitySignature(rawBody,signature){
  const {apiKey}=acuityConfig();
  const expected=crypto.createHmac('sha256',apiKey).update(rawBody).digest('base64');
  const received=String(signature||'');
  if(expected.length!==received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(received));
}

function sendAcuityError(res,error,fallback='This Acuity request could not be completed.'){
  const status=Number(error?.statusCode)||500;
  if(status>=500) console.error(error);
  const publicMessage=status===401
    ? 'Flowtel could not connect to Acuity. Check the Acuity User ID and API key in Vercel.'
    : error?.message || fallback;
  res.status(status).json({ok:false,error:publicMessage,code:error?.acuityError||null});
}

module.exports={
  ACUITY_API_BASE,
  WOMB_MAGIC_CONSENT_LANGUAGE,
  acuityConfig,
  acuityFetch,
  appointmentTimes,
  compactText,
  dateOnlyInZone,
  encodePath,
  firstLastForBooking,
  flowtelPublicOrigin,
  normalizeEmail,
  normalizeId,
  periodKeyFor,
  profileDisplayName,
  profileForUser,
  productAccessForUser,
  readRequestBody,
  requireFlowtelMember,
  requireFlowtelOwner,
  requireFlowtelProvider,
  safeJsonParse,
  sendAcuityError,
  sendError,
  serviceHeaders,
  serviceRestUrl,
  setPublicCors,
  trimTo,
  validTimezone,
  verifyAcuitySignature,
};
