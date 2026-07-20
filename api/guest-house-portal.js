// Flowtel v0.10.63 — authenticated Guest House replay-status portal and private media access.

const {
  fetchJson,normalizeEmail,readRequestBody,requireUser,sendError,serviceHeaders,setPublicCors,trimTo,
}=require('../server/guest-house-server.js');

function encodedStoragePath(path=''){
  return String(path).split('/').map(segment=>encodeURIComponent(segment)).join('/');
}

function publicStatus(value=''){
  const status=String(value || '').toLowerCase();
  if(['ready','delivered','received'].includes(status)) return 'ready';
  if(status==='unable_to_locate' || status==='archived') return 'unable_to_locate';
  return 'locating';
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

async function guestForUser({supabaseUrl,serviceKey,user}){
  const byAuth=await fetchJson(
    `${supabaseUrl}/rest/v1/flowtel_guest_house_guests?select=id,first_name,last_name,email,member_id,auth_user_id,account_created_at&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    {method:'GET',headers:serviceHeaders(serviceKey)}
  );
  return Array.isArray(byAuth) ? byAuth[0] || null : null;
}

async function latestRequest({supabaseUrl,serviceKey,guestId}){
  const rows=await fetchJson(
    `${supabaseUrl}/rest/v1/flowtel_guest_house_requests?select=id,status,call_topic,created_at,updated_at,ready_at,last_accessed_at,access_count&guest_id=eq.${encodeURIComponent(guestId)}&status=neq.archived&order=created_at.desc&limit=1`,
    {method:'GET',headers:serviceHeaders(serviceKey)}
  );
  return Array.isArray(rows) ? rows[0] || null : null;
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
      return res.status(200).json({
        ok:true,
        account:{
          firstName:trimTo(context.user.user_metadata?.first_name,100),
          lastName:trimTo(context.user.user_metadata?.last_name,100),
          email:normalizeEmail(context.user.email),
        },
        request:null,
      });
    }

    const request=await latestRequest({...context,guestId:guest.id});

    if(action==='event'){
      if(!request){const error=new Error('No Replay Room request belongs to this account.');error.statusCode=404;throw error;}
      const eventType=String(body.eventType || '');
      if(!['stream_started','download_requested'].includes(eventType)){
        const error=new Error('This Replay Room event is not supported.');error.statusCode=400;throw error;
      }
      const fileId=String(body.fileId || '');
      const files=await fetchJson(
        `${context.supabaseUrl}/rest/v1/flowtel_guest_house_files?select=id&request_id=eq.${encodeURIComponent(request.id)}&id=eq.${encodeURIComponent(fileId)}&is_active=eq.true&limit=1`,
        {method:'GET',headers:serviceHeaders(context.serviceKey)}
      );
      if(!Array.isArray(files) || !files[0]){const error=new Error('This replay file could not be found.');error.statusCode=404;throw error;}
      await fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
        method:'POST',headers:serviceHeaders(context.serviceKey,'return=minimal'),
        body:JSON.stringify({request_id:request.id,event_type:eventType,event_context:{file_id:fileId,access:'guest_house_account'}}),
      });
      return res.status(200).json({ok:true});
    }

    const normalizedStatus=request ? publicStatus(request.status) : null;
    const signedFiles=[];
    if(request && normalizedStatus==='ready'){
      const files=await fetchJson(
        `${context.supabaseUrl}/rest/v1/flowtel_guest_house_files?select=id,storage_path,original_filename,display_title,mime_type,media_kind,size_bytes,note_to_guest,uploaded_at&request_id=eq.${encodeURIComponent(request.id)}&is_active=eq.true&order=uploaded_at.asc`,
        {method:'GET',headers:serviceHeaders(context.serviceKey)}
      );
      for(const file of Array.isArray(files)?files:[]) signedFiles.push(await signedMedia({...context,file}));

      if(signedFiles.length){
        const now=new Date().toISOString();
        await Promise.all([
          fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_requests?id=eq.${encodeURIComponent(request.id)}`,{
            method:'PATCH',headers:serviceHeaders(context.serviceKey,'return=minimal'),
            body:JSON.stringify({
              last_accessed_at:now,
              access_count:(Number(request.access_count)||0)+1,
              updated_at:now,
            }),
          }),
          fetchJson(`${context.supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
            method:'POST',headers:serviceHeaders(context.serviceKey,'return=minimal'),
            body:JSON.stringify({request_id:request.id,event_type:'access_opened',event_context:{file_count:signedFiles.length,access:'guest_house_account'}}),
          }),
        ]);
      }
    }

    return res.status(200).json({
      ok:true,
      account:{
        firstName:guest.first_name,
        lastName:guest.last_name,
        email:guest.email,
      },
      request:request ? {
        id:request.id,
        reference:String(request.id).slice(0,8).toUpperCase(),
        status:normalizedStatus,
        callMemory:request.call_topic || '',
        createdAt:request.created_at,
        readyAt:request.ready_at,
        files:signedFiles,
      } : null,
    });
  }catch(error){return sendError(res,error,'The Guest House portal could not be opened.');}
};
