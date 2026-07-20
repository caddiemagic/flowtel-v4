// Flowtel v0.10.58 — owner Concierge helpers for Guest House replay requests.

import { supabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase-config.js';
import {
  GUEST_HOUSE_REPLAY_BUCKET,
  buildGuestHouseReplayUrl,
  createGuestHouseToken,
  guestHouseExpirationDate,
  hashGuestHouseToken,
  safeGuestHouseFilename,
  validateGuestHouseReplayMetadata,
} from './guest-house-core.js';

function randomId(){
  if(globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function currentSession(){
  const { data, error }=await supabase.auth.getSession();
  if(error) throw error;
  if(!data?.session) throw new Error('Enter through the Flowtel before tending the Guest House.');
  return data.session;
}

export async function listGuestHouseRequests(){
  const { data, error }=await supabase.rpc('flowtel_guest_house_admin_get_queue');
  if(error) throw error;
  return data || [];
}

export async function updateGuestHouseRequest({requestId,status,ownerNote=''}={}){
  if(!requestId) throw new Error('Choose a Guest House request first.');
  const { data, error }=await supabase.rpc('flowtel_guest_house_admin_update_request',{
    p_request_id:requestId,
    p_status:status,
    p_owner_note:ownerNote || null,
  });
  if(error) throw error;
  return data;
}

async function standardUpload(path,file,onProgress){
  onProgress?.(2);
  const { error }=await supabase.storage.from(GUEST_HOUSE_REPLAY_BUCKET).upload(path,file,{
    upsert:false,
    contentType:file.type || 'application/octet-stream',
    cacheControl:'3600',
  });
  if(error) throw error;
  onProgress?.(100);
}

async function resumableUpload(path,file,onProgress){
  const session=await currentSession();
  const tusModule=await import('https://cdn.jsdelivr.net/npm/tus-js-client@4/+esm');
  const Upload=tusModule.Upload || tusModule.default?.Upload;
  if(!Upload) throw new Error('Flowtel could not open the large-file uploader.');

  await new Promise((resolve,reject)=>{
    const upload=new Upload(file,{
      endpoint:`${String(SUPABASE_URL).replace(/\/$/,'')}/storage/v1/upload/resumable`,
      retryDelays:[0,3000,5000,10000,20000],
      headers:{
        authorization:`Bearer ${session.access_token}`,
        apikey:SUPABASE_PUBLISHABLE_KEY,
        'x-upsert':'false',
      },
      uploadDataDuringCreation:true,
      removeFingerprintOnSuccess:true,
      chunkSize:6*1024*1024,
      metadata:{
        bucketName:GUEST_HOUSE_REPLAY_BUCKET,
        objectName:path,
        contentType:file.type || 'application/octet-stream',
        cacheControl:'3600',
      },
      onError:reject,
      onProgress(bytesUploaded,bytesTotal){
        const percent=bytesTotal ? Math.round((bytesUploaded/bytesTotal)*100) : 0;
        onProgress?.(Math.max(1,Math.min(percent,99)));
      },
      onSuccess(){ onProgress?.(100); resolve(); },
    });
    upload.findPreviousUploads().then(previous=>{
      if(previous?.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });
}

export async function uploadGuestHouseReplay({requestId,file,displayTitle='',noteToGuest='',onProgress}={}){
  if(!requestId) throw new Error('Choose a Guest House request first.');
  const metadata=validateGuestHouseReplayMetadata(file);
  const fileId=randomId();
  const path=`${requestId}/${fileId}-${safeGuestHouseFilename(file.name)}`;

  try{
    if(file.size>6*1024*1024) await resumableUpload(path,file,onProgress);
    else await standardUpload(path,file,onProgress);

    const { data, error }=await supabase.rpc('flowtel_guest_house_admin_add_file',{
      p_request_id:requestId,
      p_storage_path:path,
      p_original_filename:file.name,
      p_display_title:displayTitle || null,
      p_mime_type:file.type || null,
      p_media_kind:metadata.mediaKind,
      p_size_bytes:file.size,
      p_note_to_guest:noteToGuest || null,
    });
    if(error) throw error;
    return data;
  }catch(error){
    await supabase.storage.from(GUEST_HOUSE_REPLAY_BUCKET).remove([path]).catch(()=>{});
    throw error;
  }
}

export async function deactivateGuestHouseReplay(fileId){
  if(!fileId) throw new Error('Choose a Guest House replay first.');
  const { data, error }=await supabase.rpc('flowtel_guest_house_admin_deactivate_file',{
    p_file_id:fileId,
  });
  if(error) throw error;
  return data;
}

export async function createGuestHouseOwnerDownloadUrl(storagePath,expiresIn=900){
  if(!storagePath) throw new Error('This replay file has no private storage path.');
  const { data, error }=await supabase.storage
    .from(GUEST_HOUSE_REPLAY_BUCKET)
    .createSignedUrl(storagePath,Math.max(60,Math.min(Number(expiresIn)||900,3600)));
  if(error) throw error;
  if(!data?.signedUrl) throw new Error('Flowtel could not prepare this private replay.');
  return data.signedUrl;
}

export async function prepareGuestHouseAccess({requestId,days=90,origin=window.location.origin}={}){
  const token=createGuestHouseToken();
  const tokenHash=await hashGuestHouseToken(token);
  const expiresAt=guestHouseExpirationDate(days).toISOString();
  const { error }=await supabase.rpc('flowtel_guest_house_admin_prepare_access',{
    p_request_id:requestId,
    p_token_hash:tokenHash,
    p_expires_at:expiresAt,
  });
  if(error) throw error;
  return {
    token,
    tokenHash,
    expiresAt,
    url:buildGuestHouseReplayUrl(token,{origin}),
  };
}

export async function revokeGuestHouseAccess(requestId){
  const { data, error }=await supabase.rpc('flowtel_guest_house_admin_revoke_access',{
    p_request_id:requestId,
  });
  if(error) throw error;
  return data;
}

export async function sendGuestHouseInvitation({requestId,token}={}){
  const session=await currentSession();
  const response=await fetch('/api/guest-house-notify',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${session.access_token}`,
    },
    body:JSON.stringify({requestId,token}),
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload.error || 'The private invitation could not be emailed. Copy the room link instead.');
  return payload;
}
