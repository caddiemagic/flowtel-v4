// Flowtel v0.10.58 — token-gated Guest House Replay Room access.

const {
  fetchJson,hashToken,readRequestBody,sendError,serverConfig,serviceHeaders,setPublicCors,validToken,
}=require('../server/guest-house-server.js');

function encodedStoragePath(path=''){
  return String(path).split('/').map(segment=>encodeURIComponent(segment)).join('/');
}

function activeAccess(request){
  if(!request) return false;
  if(request.access_revoked_at) return false;
  if(!request.access_expires_at || new Date(request.access_expires_at).getTime()<=Date.now()) return false;
  return ['ready','delivered','received'].includes(String(request.status || ''));
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
    id:file.id,
    title:file.display_title || 'Your 1:1 Call Replay',
    filename:file.original_filename,
    mediaKind:file.media_kind,
    mimeType:file.mime_type || '',
    sizeBytes:Number(file.size_bytes)||0,
    note:file.note_to_guest || '',
    uploadedAt:file.uploaded_at,
    streamUrl,
    downloadUrl:`${streamUrl}${joiner}download=${encodeURIComponent(file.original_filename || 'flowtel-call-replay')}`,
    signedUntil:new Date(Date.now()+15*60*1000).toISOString(),
  };
}

module.exports=async function handler(req,res){
  setPublicCors(res);
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Use POST to open a private Replay Room.'});

  try{
    const body=await readRequestBody(req);
    const token=String(body.token || '').trim();
    if(!validToken(token)){const error=new Error('This private Replay Room key is not valid.');error.statusCode=401;throw error;}
    const tokenHash=hashToken(token);
    const {supabaseUrl,serviceKey}=serverConfig();
    const headers=serviceHeaders(serviceKey);

    const requests=await fetchJson(
      `${supabaseUrl}/rest/v1/flowtel_guest_house_requests?select=id,guest_id,status,access_expires_at,access_revoked_at,ready_at,delivered_at,last_accessed_at,access_count&access_token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
      {method:'GET',headers}
    );
    const request=Array.isArray(requests) ? requests[0] : null;
    if(!activeAccess(request)){
      const error=new Error('This private Replay Room is closed, expired, or not ready yet.');error.statusCode=403;throw error;
    }

    if(body.action==='event'){
      const eventType=String(body.eventType || '');
      if(!['stream_started','download_requested'].includes(eventType)){
        const error=new Error('This Replay Room event is not supported.');error.statusCode=400;throw error;
      }
      const fileId=String(body.fileId || '');
      const files=await fetchJson(
        `${supabaseUrl}/rest/v1/flowtel_guest_house_files?select=id&request_id=eq.${encodeURIComponent(request.id)}&id=eq.${encodeURIComponent(fileId)}&is_active=eq.true&limit=1`,
        {method:'GET',headers}
      );
      if(!Array.isArray(files) || !files[0]){const error=new Error('This replay file could not be found.');error.statusCode=404;throw error;}
      await fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
        method:'POST',headers:serviceHeaders(serviceKey,'return=minimal'),
        body:JSON.stringify({request_id:request.id,event_type:eventType,event_context:{file_id:fileId}}),
      });
      return res.status(200).json({ok:true});
    }

    const [guests,files]=await Promise.all([
      fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_guests?select=first_name,last_name&id=eq.${encodeURIComponent(request.guest_id)}&limit=1`,{method:'GET',headers}),
      fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_files?select=id,storage_path,original_filename,display_title,mime_type,media_kind,size_bytes,note_to_guest,uploaded_at&request_id=eq.${encodeURIComponent(request.id)}&is_active=eq.true&order=uploaded_at.asc`,{method:'GET',headers}),
    ]);
    const guest=Array.isArray(guests) ? guests[0] : null;
    if(!guest || !Array.isArray(files) || !files.length){
      const error=new Error('This private Replay Room is still being prepared.');error.statusCode=404;throw error;
    }

    const signedFiles=[];
    for(const file of files) signedFiles.push(await signedMedia({supabaseUrl,serviceKey,file}));

    const now=new Date().toISOString();
    await Promise.all([
      fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_requests?id=eq.${encodeURIComponent(request.id)}`,{
        method:'PATCH',headers:serviceHeaders(serviceKey,'return=minimal'),
        body:JSON.stringify({
          last_accessed_at:now,
          access_count:(Number(request.access_count)||0)+1,
          status:'received',
          updated_at:now,
        }),
      }),
      fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
        method:'POST',headers:serviceHeaders(serviceKey,'return=minimal'),
        body:JSON.stringify({request_id:request.id,event_type:'access_opened',event_context:{file_count:signedFiles.length}}),
      }),
    ]);

    return res.status(200).json({
      ok:true,
      room:{
        requestId:request.id,
        firstName:guest.first_name,
        status:'received',
        accessExpiresAt:request.access_expires_at,
        files:signedFiles,
      },
    });
  }catch(error){return sendError(res,error,'This private Replay Room could not be opened.');}
};
