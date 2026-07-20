import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { hashGuestHouseToken } from '../shared/guest-house-core.js';

const require=createRequire(import.meta.url);
const accountHandler=require('../api/guest-house-account.js');
const requestHandler=require('../api/guest-house-request.js');
const portalHandler=require('../api/guest-house-portal.js');
const accessHandler=require('../api/guest-house-access.js');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='service-key';
process.env.FLOWTEL_PUBLIC_ORIGIN='https://app.theflowtel.com';

function responseRecorder(){
  return {
    headers:{},statusCode:200,body:null,ended:false,
    setHeader(key,value){this.headers[key]=value;},
    status(code){this.statusCode=code;return this;},
    json(payload){this.body=payload;this.ended=true;return this;},
    end(){this.ended=true;return this;},
  };
}
function jsonResponse(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
}

const originalFetch=globalThis.fetch;
try{
  const accountCalls=[];
  globalThis.fetch=async (url,options={})=>{
    accountCalls.push({url:String(url),options});
    if(String(url).endsWith('/auth/v1/admin/users')) return jsonResponse({id:'guest-user-1',email:'mara@example.com'});
    throw new Error(`Unexpected account API fetch: ${url}`);
  };
  const accountRes=responseRecorder();
  await accountHandler({method:'POST',headers:{},body:{
    firstName:'Mara',lastName:'Rose',email:'MARA@example.com',password:'private-room-key',website:'',
  }},accountRes);
  assert.equal(accountRes.statusCode,201);
  assert.equal(accountRes.body.ok,true);
  const createCall=accountCalls.find(call=>call.url.endsWith('/auth/v1/admin/users'));
  const createBody=JSON.parse(createCall.options.body);
  assert.equal(createBody.email_confirm,true,'Guest House account creation must not require an email-confirmation integration.');
  assert.equal(createBody.user_metadata.source,'flowtel_guest_house');
  assert.equal(createBody.user_metadata.guest_house_only,true);
  assert(!accountCalls.some(call=>call.url.includes('/rest/v1/profiles')),'Guest House account creation must not create a Flowtel profile.');
  assert(!accountCalls.some(call=>call.url.includes('flowtel_stays')),'Guest House account creation must not create a Flowtel stay.');

  const retiredRes=responseRecorder();
  await requestHandler({method:'POST',headers:{},body:{}},retiredRes);
  assert.equal(retiredRes.statusCode,410);
  assert.equal(retiredRes.body.accountRequired,true);

  const portalCalls=[];
  globalThis.fetch=async (url,options={})=>{
    portalCalls.push({url:String(url),options});
    const value=String(url);
    if(value.endsWith('/auth/v1/user')) return jsonResponse({id:'guest-user-1',email:'mara@example.com',user_metadata:{first_name:'Mara',last_name:'Rose'}});
    if(value.includes('/flowtel_guest_house_guests?select=') && value.includes('auth_user_id=eq.guest-user-1')) return jsonResponse([{id:'guest-1',first_name:'Mara',last_name:'Rose',email:'mara@example.com',auth_user_id:'guest-user-1'}]);
    if(value.includes('/flowtel_guest_house_requests?select=') && value.includes('guest_id=eq.guest-1')) return jsonResponse([{id:'request-1',status:'ready',call_topic:'Womb wealth',created_at:'2026-07-20T00:00:00Z',ready_at:'2026-07-21T00:00:00Z',access_count:0}]);
    if(value.includes('/flowtel_guest_house_files?select=id,storage_path')) return jsonResponse([{
      id:'file-1',storage_path:'request-1/file.mp4',original_filename:'call.mp4',display_title:'Your Call Replay',
      mime_type:'video/mp4',media_kind:'video',size_bytes:1024,note_to_guest:'Held for you.',uploaded_at:'2026-07-20T00:00:00Z',
    }]);
    if(value.includes('/storage/v1/object/sign/flowtel-guest-house-replays/request-1/file.mp4')) return jsonResponse({signedURL:'/object/sign/flowtel-guest-house-replays/request-1/file.mp4?token=signed'});
    if(value.includes('/flowtel_guest_house_requests?id=eq.request-1')) return jsonResponse({});
    if(value.endsWith('/rest/v1/flowtel_guest_house_events')) return jsonResponse({});
    throw new Error(`Unexpected portal API fetch: ${value}`);
  };
  const portalRes=responseRecorder();
  await portalHandler({method:'POST',headers:{authorization:'Bearer guest-session'},body:{action:'room'}},portalRes);
  assert.equal(portalRes.statusCode,200);
  assert.equal(portalRes.body.request.status,'ready');
  assert.equal(portalRes.body.request.files[0].mediaKind,'video');
  assert.match(portalRes.body.request.files[0].streamUrl,/storage\/v1\/object\/sign/);
  assert.equal('storage_path' in portalRes.body.request.files[0],false,'Private Storage paths must not be exposed to Guest House accounts.');
  assert(portalCalls.some(call=>call.url.endsWith('/auth/v1/user')),'Guest House portal must verify the signed-in Auth user.');
  assert(portalCalls.some(call=>call.options.method==='PATCH'),'Opening a ready account room should preserve access receipt state.');

  const token='a'.repeat(64);
  const tokenHash=await hashGuestHouseToken(token);
  globalThis.fetch=async (url,options={})=>{
    const value=String(url);
    if(value.includes('/flowtel_guest_house_requests?select=') && value.includes(`access_token_hash=eq.${tokenHash}`)){
      return jsonResponse([{id:'request-1',guest_id:'guest-1',status:'ready',access_expires_at:'2099-01-01T00:00:00.000Z',access_revoked_at:null,access_count:0}]);
    }
    if(value.includes('/flowtel_guest_house_guests?select=first_name')) return jsonResponse([{first_name:'Mara',last_name:'Rose'}]);
    if(value.includes('/flowtel_guest_house_files?select=id,storage_path')) return jsonResponse([{
      id:'file-1',storage_path:'request-1/file.mp4',original_filename:'call.mp4',display_title:'Your Call Replay',
      mime_type:'video/mp4',media_kind:'video',size_bytes:1024,note_to_guest:'Held for you.',uploaded_at:'2026-07-20T00:00:00Z',
    }]);
    if(value.includes('/storage/v1/object/sign/flowtel-guest-house-replays/request-1/file.mp4')) return jsonResponse({signedURL:'/object/sign/flowtel-guest-house-replays/request-1/file.mp4?token=signed'});
    if(value.includes('/flowtel_guest_house_requests?id=eq.request-1')) return jsonResponse({});
    if(value.endsWith('/rest/v1/flowtel_guest_house_events')) return jsonResponse({});
    throw new Error(`Unexpected legacy access API fetch: ${value}`);
  };
  const accessRes=responseRecorder();
  await accessHandler({method:'POST',headers:{},body:{token,action:'room'}},accessRes);
  assert.equal(accessRes.statusCode,200,'Existing private Replay Room links must remain preserved.');

  console.log('Guest House account creation, authenticated portal, legacy-link preservation, and signed-media API tests passed.');
} finally {
  globalThis.fetch=originalFetch;
}
