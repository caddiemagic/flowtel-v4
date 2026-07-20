// Flowtel v0.10.64 — authenticated Guest House portal with 28-day replay stays.

const {
  fetchJson,normalizeEmail,readRequestBody,requireUser,sendError,serviceHeaders,setPublicCors,trimTo,
}=require('../server/guest-house-server.js');

function encodedStoragePath(path=''){
  return String(path).split('/').map(segment=>encodeURIComponent(segment)).join('/');
}
function daysRemaining(expiresAt){
  if(!expiresAt) return null;
  return Math.max(0,Math.ceil((new Date(expiresAt).getTime()-Date.now())/86400000));
}
function publicStatus(value=''){
  const status=String(value || '').toLowerCase();
  if(['ready','delivered','received'].includes(status)) return 'ready';
  if(status==='unable_to_locate' || status==='archived') return 'unable_to_locate';
  return 'locating';
}
function fileReachedReplayExpiration(file){
  if(!file) return false;
  if(file.deletion_status==='deleted') return true;
  return !!file.expires_at && new Date(file.expires_at).getTime()<=Date.now();
}
function fileIsAvailable(file){
  return !!file && file.is_active!==false && !fileReachedReplayExpiration(file);
}
async function signedMedia({supabaseUrl,serviceKey,file}){
  const signed=await fetchJson(
    `${supabaseUrl}/storage/v1/object/sign/flowtel-guest-house-replays/${encodedStoragePath(file.storage_path)}`,
    {method:'POST',headers:serviceHeaders(serviceKey),body:JSON.stringify({expiresIn:900})}
  );
  const relative=signed.signedURL || signed.signedUrl || signed.url;
  if(!relative) throw new Error('The private replay player could not be prepared.');
  const streamUrl=String(relative).startsWith('http') ? relative : `${supabaseUrl}/storage/v1${relative.startsWith('/')?'':'/'}${relative}`;
  const joiner=streamUrl.includes('?')?'&':'?';
  return {
    id:file.id,title:file.display_title || 'Your 1:1 Call Replay',filename:file.original_filename,
    mediaKind:file.media_kind,mimeType:file.mime_type || '',sizeBytes:Number(file.size_bytes)||0,
    note:file.note_to_guest || '',uploadedAt:file.uploaded_at,expiresAt:file.expires_at,
    daysRemaining:daysRemaining(file.expires_at),streamUrl,
    downloadUrl:`${streamUrl}${joiner}download=${encodeURIComponent(file.original_filename || 'flowtel-call-replay')}`,
    signedUntil:new Date(Date.now()+15*60*1000).toISOString(),
  };
}
async function guestForUser({supabaseUrl,serviceKey,user}){
  const rows=await fetchJson(
    `${supabaseUrl}/rest/v1/flowtel_guest_house_guests?select=id,first_name,last_name,email,member_id,auth_user_id,account_created_at&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    {method:'GET',headers:serviceHeaders(serviceKey)}
  );
  return Array.isArray(rows)?rows[0]||null:null;
}
async function latestRequest({supabaseUrl,serviceKey,guestId}){
  const rows=await fetchJson(
    `${supabaseUrl}/rest/v1/flowtel_guest_house_requests?select=id,status,call_topic,created_at,updated_at,ready_at,last_accessed_at,access_count&guest_id=eq.${encodeURIComponent(guestId)}&status=neq.archived&order=created_at.desc&limit=1`,
    {method:'GET',headers:serviceHeaders(serviceKey)}
  );
  return Array.isArray(rows)?rows[0]||null:null;
}
async function requestFiles(context,requestId){
  const rows=await fetchJson(
    `${context.supabaseUrl}/rest/v1/flowtel_guest_house_files?select=id,storage_path,original_filename,display_title,mime_type,media_kind,size_bytes,note_to_guest,uploaded_at,expires_at,is_active,deletion_status,first_viewed_at,last_viewed_at,view_count,first_downloaded_at,last_downloaded_at,download_count&request_id=eq.${encodeURIComponent(requestId)}&order=uploaded_at.asc`,
    {method:'GET',headers:serviceHeaders(context.serviceKey)}
  );
  return Array.isArray(rows)?rows:[];
}
async function recordFileReceipt(context,file,eventType,requestId){
  const now=new Date().toISOString();
  const isView=eventType==='stream_started';
  await Promise.all([
    fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
      method:'POST',headers:serviceHeaders(context.serviceKey,'return=minimal'),
      body:JSON.stringify({request_id:requestId,event_type:eventType,event_context:{file_id:file.id,access:'guest_house_account'}}),
    }),
    fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_files?id=eq.${encodeURIComponent(file.id)}`,{
      method:'PATCH',headers:serviceHeaders(context.serviceKey,'return=minimal'),
      body:JSON.stringify(isView?{
        first_viewed_at:file.first_viewed_at || now,last_viewed_at:now,view_count:(Number(file.view_count)||0)+1,
      }:{
        first_downloaded_at:file.first_downloaded_at || now,last_downloaded_at:now,download_count:(Number(file.download_count)||0)+1,
      }),
    }),
  ]);
}

module.exports=async function handler(req,res){
  setPublicCors(res,'POST, OPTIONS');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Use POST to open the Guest House portal.'});

  try{
    const context=await requireUser(req);
    const body=await readRequestBody(req);
    const action=String(body.action || 'room');
    const guest=await guestForUser(context);
    if(!guest){
      return res.status(200).json({ok:true,account:{
        firstName:trimTo(context.user.user_metadata?.first_name,100),
        lastName:trimTo(context.user.user_metadata?.last_name,100),
        email:normalizeEmail(context.user.email),
      },request:null});
    }

    const request=await latestRequest({...context,guestId:guest.id});
    if(action==='event'){
      if(!request){const error=new Error('No Replay Room request belongs to this account.');error.statusCode=404;throw error;}
      const eventType=String(body.eventType || '');
      if(!['stream_started','download_requested'].includes(eventType)){
        const error=new Error('This Replay Room event is not supported.');error.statusCode=400;throw error;
      }
      const file=(await requestFiles(context,request.id)).find(row=>row.id===String(body.fileId || ''));
      if(!file || !fileIsAvailable(file)){const error=new Error('This replay file is no longer available.');error.statusCode=404;throw error;}
      await recordFileReceipt(context,file,eventType,request.id);
      return res.status(200).json({ok:true});
    }

    const normalizedStatus=request?publicStatus(request.status):null;
    const signedFiles=[];
    let replayExpired=false;
    let replayExpiresAt=null;
    if(request && normalizedStatus==='ready'){
      const allFiles=await requestFiles(context,request.id);
      const available=allFiles.filter(fileIsAvailable);
      const expired=allFiles.filter(fileReachedReplayExpiration);
      replayExpired=expired.length>0 && available.length===0;
      replayExpiresAt=available.map(file=>file.expires_at).filter(Boolean).sort()[0]
        || expired.map(file=>file.expires_at).filter(Boolean).sort().at(-1)
        || null;
      for(const file of available) signedFiles.push(await signedMedia({...context,file}));

      if(signedFiles.length){
        const now=new Date().toISOString();
        await Promise.all([
          fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_requests?id=eq.${encodeURIComponent(request.id)}`,{
            method:'PATCH',headers:serviceHeaders(context.serviceKey,'return=minimal'),
            body:JSON.stringify({last_accessed_at:now,access_count:(Number(request.access_count)||0)+1,updated_at:now}),
          }),
          fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
            method:'POST',headers:serviceHeaders(context.serviceKey,'return=minimal'),
            body:JSON.stringify({request_id:request.id,event_type:'access_opened',event_context:{file_count:signedFiles.length,access:'guest_house_account'}}),
          }),
        ]);
      }
    }

    return res.status(200).json({ok:true,account:{firstName:guest.first_name,lastName:guest.last_name,email:guest.email},request:request?{
      id:request.id,reference:String(request.id).slice(0,8).toUpperCase(),status:normalizedStatus,
      callMemory:request.call_topic || '',createdAt:request.created_at,readyAt:request.ready_at,
      replayExpiresAt,daysRemaining:daysRemaining(replayExpiresAt),replayExpired,files:signedFiles,
    }:null});
  }catch(error){return sendError(res,error,'The Guest House portal could not be opened.');}
};
