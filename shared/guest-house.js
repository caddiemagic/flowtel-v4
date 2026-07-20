// Flowtel v0.10.64 — resilient owner Concierge helpers with 28-day replay cleanup.

import { supabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase-config.js';
import {
  GUEST_HOUSE_REPLAY_BUCKET,
  buildGuestHouseReplayUrl,
  createGuestHouseToken,
  guestHouseExpirationDate,
  guestHouseProjectLimitMessage,
  hashGuestHouseToken,
  safeGuestHouseFilename,
  validateGuestHouseReplayMetadata,
} from './guest-house-core.js?v=0.10.64';

const PENDING_UPLOAD_KEY='flowtel_guest_house_pending_uploads_v1';
const pendingUploadMemory=new Map();

function randomId(){
  if(globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function directStorageEndpoint(){
  const url=new URL(SUPABASE_URL);
  if(/\.supabase\.co$/i.test(url.hostname) && !/\.storage\.supabase\.co$/i.test(url.hostname)){
    url.hostname=url.hostname.replace(/\.supabase\.co$/i,'.storage.supabase.co');
  }
  return `${url.origin}/storage/v1/upload/resumable`;
}

function readPendingUploadStore(){
  try{
    const value=JSON.parse(globalThis.localStorage?.getItem(PENDING_UPLOAD_KEY)||'{}');
    return value && typeof value==='object' && !Array.isArray(value) ? value : {};
  }catch(_error){
    return {};
  }
}

function writePendingUploadStore(value){
  try{
    globalThis.localStorage?.setItem(PENDING_UPLOAD_KEY,JSON.stringify(value));
  }catch(_error){
    // The in-memory copy still protects the current Concierge session.
  }
}

function rememberPendingUpload(pending){
  pendingUploadMemory.set(pending.requestId,pending);
  const store=readPendingUploadStore();
  store[pending.requestId]=pending;
  writePendingUploadStore(store);
}

function forgetPendingUpload(requestId){
  pendingUploadMemory.delete(requestId);
  const store=readPendingUploadStore();
  if(Object.prototype.hasOwnProperty.call(store,requestId)){
    delete store[requestId];
    writePendingUploadStore(store);
  }
}

export function getPendingGuestHouseUpload(requestId){
  if(!requestId) return null;
  return pendingUploadMemory.get(requestId) || readPendingUploadStore()[requestId] || null;
}

async function currentSession(){
  const { data, error }=await supabase.auth.getSession();
  if(error) throw error;
  if(!data?.session) throw new Error('Enter through the Flowtel before tending the Guest House.');
  return data.session;
}

export async function purgeExpiredGuestHouseReplays(){
  const {data:expired,error:listError}=await supabase.rpc('flowtel_guest_house_admin_get_expired_files');
  if(listError){
    const missing=/flowtel_guest_house_admin_get_expired_files|PGRST202|42883/i.test(String(listError.message || listError.code || ''));
    if(missing) return {deleted:0,pendingMigration:true};
    throw listError;
  }
  const rows=Array.isArray(expired)?expired:[];
  if(!rows.length) return {deleted:0};
  const deletedIds=[];
  for(const row of rows){
    try{
      const {error}=await supabase.storage.from(GUEST_HOUSE_REPLAY_BUCKET).remove([row.storage_path]);
      if(error) throw error;
      deletedIds.push(row.file_id);
    }catch(error){
      await supabase.rpc('flowtel_guest_house_admin_mark_file_delete_failed',{
        p_file_id:row.file_id,
        p_error:String(error?.message || error || 'Storage deletion failed.').slice(0,1000),
      }).catch(()=>{});
    }
  }
  if(deletedIds.length){
    const {error}=await supabase.rpc('flowtel_guest_house_admin_mark_files_deleted',{p_file_ids:deletedIds});
    if(error) throw error;
  }
  return {deleted:deletedIds.length};
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
      endpoint:directStorageEndpoint(),
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
      onError(error){
        const detail=error?.originalResponse?.getBody?.() || error?.message || 'The large replay upload stopped unexpectedly.';
        const normalized=String(detail || '').toLowerCase();
        if(normalized.includes('maximum size exceeded') || normalized.includes('entitytoolarge') || normalized.includes('payload too large')){
          reject(new Error(guestHouseProjectLimitMessage(file)));
          return;
        }
        reject(new Error(`The private upload stopped before completion. ${detail}`));
      },
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

async function registerPendingReplay(pending){
  const { data, error }=await supabase.rpc('flowtel_guest_house_admin_add_file',{
    p_request_id:pending.requestId,
    p_storage_path:pending.storagePath,
    p_original_filename:pending.originalFilename,
    p_display_title:pending.displayTitle || null,
    p_mime_type:pending.mimeType || null,
    p_media_kind:pending.mediaKind,
    p_size_bytes:pending.sizeBytes,
    p_note_to_guest:pending.noteToGuest || null,
  });
  if(error) throw error;
  forgetPendingUpload(pending.requestId);
  return data;
}

async function finalizeWithRetry(pending){
  let lastError=null;
  for(const delay of [0,1000,2500]){
    if(delay) await new Promise(resolve=>setTimeout(resolve,delay));
    try{
      return await registerPendingReplay(pending);
    }catch(error){
      lastError=error;
    }
  }
  const error=new Error('The replay reached private Storage, but Flowtel could not finish adding it to the Replay Room. Use FINISH ADDING TO ROOM instead of uploading the file again.');
  error.code='GUEST_HOUSE_FINALIZE_PENDING';
  error.cause=lastError;
  error.requestId=pending.requestId;
  throw error;
}

export async function finalizePendingGuestHouseReplay(requestId){
  const pending=getPendingGuestHouseUpload(requestId);
  if(!pending) throw new Error('There is no preserved replay waiting to be finished for this guest.');
  return finalizeWithRetry(pending);
}

export async function discardPendingGuestHouseReplay(requestId){
  const pending=getPendingGuestHouseUpload(requestId);
  if(!pending) return false;
  const { error }=await supabase.storage.from(GUEST_HOUSE_REPLAY_BUCKET).remove([pending.storagePath]);
  if(error) throw error;
  forgetPendingUpload(requestId);
  return true;
}

export async function uploadGuestHouseReplay({requestId,file,displayTitle='',noteToGuest='',onProgress,onStage}={}){
  if(!requestId) throw new Error('Choose a Guest House request first.');
  const metadata=validateGuestHouseReplayMetadata(file);
  const fileId=randomId();
  const path=`${requestId}/${fileId}-${safeGuestHouseFilename(file.name)}`;
  let uploadCompleted=false;

  try{
    onStage?.('uploading');
    if(file.size>6*1024*1024) await resumableUpload(path,file,onProgress);
    else await standardUpload(path,file,onProgress);
    uploadCompleted=true;

    const pending={
      requestId,
      storagePath:path,
      originalFilename:file.name,
      displayTitle:displayTitle || '',
      mimeType:file.type || '',
      mediaKind:metadata.mediaKind,
      sizeBytes:file.size,
      noteToGuest:noteToGuest || '',
      uploadedAt:new Date().toISOString(),
    };
    rememberPendingUpload(pending);
    onStage?.('finalizing');
    const result=await finalizeWithRetry(pending);
    onStage?.('complete');
    return result;
  }catch(error){
    if(!uploadCompleted){
      await supabase.storage.from(GUEST_HOUSE_REPLAY_BUCKET).remove([path]).catch(()=>{});
    }
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
