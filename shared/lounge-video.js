// Flowtel v0.10.65 — private owner uploader and Flow FM Lounge playback helpers.

import { supabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase-config.js';
import {
  LOUNGE_VIDEO_BUCKET,
  loungeVideoProjectLimitMessage,
  safeLoungeVideoFilename,
  validateLoungeVideo,
} from './lounge-video-core.js?v=0.10.65';

const PENDING_KEY='flowtel_lounge_video_pending_upload_v1';
let pendingMemory=null;

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
async function currentSession(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  if(!data?.session) throw new Error('Enter through the Flowtel before tending the Lounge.');
  return data.session;
}
function rememberPending(value){
  pendingMemory=value;
  try{globalThis.localStorage?.setItem(PENDING_KEY,JSON.stringify(value));}catch(_error){}
}
function forgetPending(){
  pendingMemory=null;
  try{globalThis.localStorage?.removeItem(PENDING_KEY);}catch(_error){}
}
export function getPendingLoungeVideoUpload(){
  if(pendingMemory) return pendingMemory;
  try{
    const parsed=JSON.parse(globalThis.localStorage?.getItem(PENDING_KEY)||'null');
    return parsed && typeof parsed==='object' ? parsed : null;
  }catch(_error){return null;}
}

export async function listAdminLoungeVideos(){
  const {data,error}=await supabase.rpc('flowtel_admin_list_lounge_videos');
  if(error) throw error;
  return Array.isArray(data)?data:[];
}
export async function getActiveLoungeVideo(){
  const {data,error}=await supabase.rpc('flowtel_get_active_lounge_video');
  if(error) throw error;
  return Array.isArray(data)?data[0]||null:data||null;
}
export async function createLoungeVideoSignedUrl(storagePath,expiresIn=21600){
  if(!storagePath) throw new Error('The Lounge transmission has no private Storage path.');
  const {data,error}=await supabase.storage.from(LOUNGE_VIDEO_BUCKET)
    .createSignedUrl(storagePath,Math.max(300,Math.min(Number(expiresIn)||21600,86400)));
  if(error) throw error;
  if(!data?.signedUrl) throw new Error('Flowtel could not prepare this Lounge transmission.');
  return data.signedUrl;
}
export async function openActiveLoungeVideo(){
  const video=await getActiveLoungeVideo();
  if(!video) return null;
  return {...video,signedUrl:await createLoungeVideoSignedUrl(video.storage_path)};
}

async function standardUpload(path,file,onProgress){
  onProgress?.(2);
  const {error}=await supabase.storage.from(LOUNGE_VIDEO_BUCKET).upload(path,file,{
    upsert:false,contentType:file.type || 'application/octet-stream',cacheControl:'3600',
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
      endpoint:directStorageEndpoint(),retryDelays:[0,3000,5000,10000,20000],
      headers:{authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'x-upsert':'false'},
      uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,
      metadata:{bucketName:LOUNGE_VIDEO_BUCKET,objectName:path,contentType:file.type || 'application/octet-stream',cacheControl:'3600'},
      onError(error){
        const detail=error?.originalResponse?.getBody?.() || error?.message || 'The large Lounge upload stopped unexpectedly.';
        const normalized=String(detail).toLowerCase();
        if(normalized.includes('maximum size exceeded') || normalized.includes('entitytoolarge') || normalized.includes('payload too large')){
          reject(new Error(loungeVideoProjectLimitMessage(file)));return;
        }
        reject(new Error(`The private Lounge upload stopped before completion. ${detail}`));
      },
      onProgress(uploaded,total){onProgress?.(Math.max(1,Math.min(total?Math.round((uploaded/total)*100):0,99)));},
      onSuccess(){onProgress?.(100);resolve();},
    });
    upload.findPreviousUploads().then(previous=>{
      if(previous?.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });
}
async function registerPending(pending){
  const {data,error}=await supabase.rpc('flowtel_admin_register_lounge_video',{
    p_storage_path:pending.storagePath,
    p_original_filename:pending.originalFilename,
    p_title:pending.title,
    p_description:pending.description || null,
    p_mime_type:pending.mimeType || null,
    p_size_bytes:pending.sizeBytes,
  });
  if(error) throw error;
  forgetPending();
  return data;
}
export async function finalizePendingLoungeVideo(){
  const pending=getPendingLoungeVideoUpload();
  if(!pending) throw new Error('There is no preserved Lounge upload waiting to be finished.');
  return registerPending(pending);
}
export async function discardPendingLoungeVideo(){
  const pending=getPendingLoungeVideoUpload();
  if(!pending) return false;
  const {error}=await supabase.storage.from(LOUNGE_VIDEO_BUCKET).remove([pending.storagePath]);
  if(error) throw error;
  forgetPending();
  return true;
}
export async function uploadLoungeVideo({file,title='Four Seasons Flowtel Workshop',description='',onProgress,onStage}={}){
  validateLoungeVideo(file);
  const path=`workshops/${randomId()}-${safeLoungeVideoFilename(file.name)}`;
  let uploadCompleted=false;
  try{
    onStage?.('uploading');
    if(file.size>6*1024*1024) await resumableUpload(path,file,onProgress);
    else await standardUpload(path,file,onProgress);
    uploadCompleted=true;
    const pending={
      storagePath:path,originalFilename:file.name,title:String(title || 'Flowtel Lounge Transmission').trim().slice(0,240),
      description:String(description || '').trim().slice(0,1200),mimeType:file.type || '',sizeBytes:file.size,uploadedAt:new Date().toISOString(),
    };
    rememberPending(pending);
    onStage?.('finalizing');
    const result=await registerPending(pending);
    onStage?.('complete');
    return result;
  }catch(error){
    if(!uploadCompleted) await supabase.storage.from(LOUNGE_VIDEO_BUCKET).remove([path]).catch(()=>{});
    throw error;
  }
}
export async function archiveLoungeVideo(videoId){
  if(!videoId) throw new Error('Choose a Lounge video first.');
  const {data,error}=await supabase.rpc('flowtel_admin_archive_lounge_video',{p_video_id:videoId});
  if(error) throw error;
  return data;
}
export async function createLoungeVideoOwnerDownloadUrl(storagePath){
  return createLoungeVideoSignedUrl(storagePath,3600);
}
