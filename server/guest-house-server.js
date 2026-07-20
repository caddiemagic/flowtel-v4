// Shared server-only helpers for Flowtel v0.10.63 Guest House endpoints.

const crypto=require('crypto');

function safeJsonParse(value){
  try{return JSON.parse(value);}catch(error){return null;}
}

async function readRequestBody(req){
  if(req.body && typeof req.body==='object') return req.body;
  if(typeof req.body==='string') return safeJsonParse(req.body) || {};
  const chunks=[];
  for await(const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return safeJsonParse(Buffer.concat(chunks).toString('utf8')) || {};
}

function normalizeSupabaseProjectUrl(value){
  const raw=String(value || '').trim();
  if(!raw) return '';
  try{
    const url=new URL(raw);
    return `${url.protocol}//${url.host}`.replace(/\/$/,'');
  }catch(error){return raw.replace(/\/$/,'');}
}

function serverConfig(){
  const supabaseUrl=normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if(!supabaseUrl || !serviceKey){
    const error=new Error('Guest House server access is not configured.');
    error.statusCode=500;
    throw error;
  }
  return {supabaseUrl,serviceKey};
}

function serviceHeaders(serviceKey,prefer=''){
  const headers={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'};
  if(prefer) headers.Prefer=prefer;
  return headers;
}

function userHeaders(serviceKey,userToken,prefer=''){
  const headers={apikey:serviceKey,Authorization:`Bearer ${userToken}`,'Content-Type':'application/json'};
  if(prefer) headers.Prefer=prefer;
  return headers;
}

async function fetchJson(url,options={}){
  const response=await fetch(url,options);
  const text=await response.text();
  const data=safeJsonParse(text);
  if(!response.ok){
    const error=new Error(data?.message || data?.error_description || data?.error || text || `Request failed with ${response.status}.`);
    error.statusCode=response.status;
    error.details=data;
    throw error;
  }
  return data ?? {};
}

function setPublicCors(res,methods='POST, OPTIONS'){
  res.setHeader('Access-Control-Allow-Origin',process.env.FLOWTEL_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods',methods);
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
}

function normalizeEmail(value){return String(value || '').trim().toLowerCase();}
function trimTo(value,max){return String(value || '').trim().slice(0,max);}
function hashToken(token){return crypto.createHash('sha256').update(String(token || '')).digest('hex');}
function validToken(token){return /^[a-f0-9]{64}$/i.test(String(token || ''));}
function publicOrigin(){return String(process.env.FLOWTEL_PUBLIC_ORIGIN || 'https://app.theflowtel.com').replace(/\/$/,'');}

function bearerToken(req){
  const header=String(req.headers?.authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

async function requireUser(req){
  const {supabaseUrl,serviceKey}=serverConfig();
  const token=bearerToken(req);
  if(!token){
    const error=new Error('Sign in to open the Flowtel Guest House.');
    error.statusCode=401;
    throw error;
  }
  const user=await fetchJson(`${supabaseUrl}/auth/v1/user`,{method:'GET',headers:userHeaders(serviceKey,token)});
  if(!user?.id || !user?.email){
    const error=new Error('Your Guest House session could not be verified.');
    error.statusCode=401;
    throw error;
  }
  return {user,token,supabaseUrl,serviceKey};
}

async function requireOwner(req){
  const {supabaseUrl,serviceKey}=serverConfig();
  const token=bearerToken(req);
  if(!token){
    const error=new Error('Enter through the owner Concierge Desk first.');
    error.statusCode=401;
    throw error;
  }
  const user=await fetchJson(`${supabaseUrl}/auth/v1/user`,{method:'GET',headers:userHeaders(serviceKey,token)});
  if(!user?.id){
    const error=new Error('The owner session could not be verified.');
    error.statusCode=401;
    throw error;
  }
  const allowed=await fetchJson(`${supabaseUrl}/rest/v1/rpc/flowtel_current_user_is_concierge`,{
    method:'POST',headers:userHeaders(serviceKey,token),body:'{}',
  });
  if(allowed!==true){
    const error=new Error('The Guest House is reserved for the Flowtel owner.');
    error.statusCode=403;
    throw error;
  }
  return {user,token,supabaseUrl,serviceKey};
}

function sendError(res,error,fallback='This Guest House request could not be completed.'){
  const status=Number(error?.statusCode)||500;
  if(status>=500) console.error(error);
  res.status(status).json({ok:false,error:error?.message || fallback});
}

module.exports={
  bearerToken,fetchJson,hashToken,normalizeEmail,publicOrigin,readRequestBody,requireOwner,
  requireUser,safeJsonParse,sendError,serverConfig,serviceHeaders,setPublicCors,trimTo,userHeaders,validToken,
};
