import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { hashGuestHouseToken } from '../shared/guest-house-core.js';

const require=createRequire(import.meta.url);
const requestHandler=require('../api/guest-house-request.js');
const accessHandler=require('../api/guest-house-access.js');
const notifyHandler=require('../api/guest-house-notify.js');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='service-key';
process.env.FLOWTEL_PUBLIC_ORIGIN='https://app.theflowtel.com';
delete process.env.RESEND_API_KEY;
delete process.env.FLOWTEL_GUEST_HOUSE_FROM_EMAIL;

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
  const requestCalls=[];
  globalThis.fetch=async (url,options={})=>{
    requestCalls.push({url:String(url),options});
    const value=String(url);
    if(value.includes('/rest/v1/profiles?')) return jsonResponse([]);
    if(value.includes('/rest/v1/flowtel_guest_house_guests?select=')) return jsonResponse([]);
    if(value.includes('/rest/v1/flowtel_guest_house_guests?on_conflict=')) return jsonResponse([{id:'guest-1',member_id:null}]);
    if(value.includes('/rest/v1/flowtel_guest_house_requests?select=id&')) return jsonResponse([]);
    if(value.endsWith('/rest/v1/flowtel_guest_house_requests')) return jsonResponse([{id:'12345678-0000-0000-0000-000000000000'}]);
    if(value.endsWith('/rest/v1/flowtel_guest_house_events')) return jsonResponse({});
    throw new Error(`Unexpected request API fetch: ${value}`);
  };
  const requestRes=responseRecorder();
  await requestHandler({method:'POST',headers:{},body:{
    firstName:'Mara',lastName:'Rose',email:'MARA@example.com',callDateHint:'Spring 2026',
    callTopic:'Womb wealth',requesterNote:'Please find my replay.',confirmed:true,website:'',
  }},requestRes);
  assert.equal(requestRes.statusCode,201);
  assert.equal(requestRes.body.ok,true);
  assert.equal(requestRes.body.requestReference,'12345678');
  assert(!requestCalls.some(call=>call.url.includes('/auth/v1/admin/users')),'Public request must not create an Auth user.');
  assert(!requestCalls.some(call=>call.url.includes('flowtel_product_access')),'Public request must not grant product access.');

  const token='a'.repeat(64);
  const tokenHash=await hashGuestHouseToken(token);
  const accessCalls=[];
  globalThis.fetch=async (url,options={})=>{
    accessCalls.push({url:String(url),options});
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
    throw new Error(`Unexpected access API fetch: ${value}`);
  };
  const accessRes=responseRecorder();
  await accessHandler({method:'POST',headers:{},body:{token,action:'room'}},accessRes);
  assert.equal(accessRes.statusCode,200);
  assert.equal(accessRes.body.ok,true);
  assert.equal(accessRes.body.room.firstName,'Mara');
  assert.equal(accessRes.body.room.files[0].mediaKind,'video');
  assert.match(accessRes.body.room.files[0].streamUrl,/storage\/v1\/object\/sign/);
  assert.match(accessRes.body.room.files[0].downloadUrl,/download=call.mp4/);
  assert.equal('storage_path' in accessRes.body.room.files[0],false,'Storage paths must not be exposed to Guest House visitors.');
  assert(accessCalls.some(call=>call.options.method==='PATCH'),'Opening the room should preserve access receipt state.');

  globalThis.fetch=async (url,options={})=>{
    const value=String(url);
    if(value.endsWith('/auth/v1/user')) return jsonResponse({id:'owner-1',email:'mm.johnson@icloud.com'});
    if(value.endsWith('/rest/v1/rpc/flowtel_current_user_is_concierge')) return jsonResponse(true);
    if(value.includes('/flowtel_guest_house_requests?select=') && value.includes('id=eq.request-1')) return jsonResponse([{id:'request-1',guest_id:'guest-1',status:'ready',access_expires_at:'2099-01-01T00:00:00.000Z',access_revoked_at:null}]);
    if(value.includes('/flowtel_guest_house_guests?select=first_name')) return jsonResponse([{first_name:'Mara',last_name:'Rose',email:'mara@example.com'}]);
    throw new Error(`Unexpected notify API fetch: ${value}`);
  };
  const notifyRes=responseRecorder();
  const originalConsoleError=console.error;
  console.error=()=>{};
  try{
    await notifyHandler({method:'POST',headers:{authorization:'Bearer owner-session'},body:{requestId:'request-1',token}},notifyRes);
  } finally {
    console.error=originalConsoleError;
  }
  assert.equal(notifyRes.statusCode,503);
  assert.match(notifyRes.body.error,/Email delivery is not configured/);

  console.log('Guest House public request, private access, signed-media, and optional-email API tests passed.');
} finally {
  globalThis.fetch=originalFetch;
}
