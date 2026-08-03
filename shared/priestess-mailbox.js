// Flowtel v0.10.80.2 — private, resumable Priestess media exchange helpers.

import { supabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase-config.js';

export const PRIESTESS_MAILBOX_BUCKET = 'flowtel-priestess-mailbox';
export const PRIESTESS_MAILBOX_MAX_BYTES = 250 * 1024 * 1024;
export const PRIESTESS_MAILBOX_RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024;
export const PRIESTESS_MAILBOX_FILE_EXTENSIONS = [
  'pdf','txt','csv','zip','doc','docx','xls','xlsx','ppt','pptx',
  'jpg','jpeg','png','webp','gif',
  'mp3','wav','m4a','aac','ogg',
  'mp4','mov','m4v','webm',
];
// Historical export kept for older callers. It now reflects the complete safe mailbox list.
export const PRIESTESS_MAILBOX_EXTENSIONS = PRIESTESS_MAILBOX_FILE_EXTENSIONS;
export const PRIESTESS_INBOX_FILE_EXTENSIONS = PRIESTESS_MAILBOX_FILE_EXTENSIONS;
export const PRIESTESS_MAILBOX_ACCEPT = [
  '.pdf','.txt','.csv','.zip','.doc','.docx','.xls','.xlsx','.ppt','.pptx',
  '.jpg','.jpeg','.png','.webp','.gif',
  '.mp3','.wav','.m4a','.aac','.ogg',
  '.mp4','.mov','.m4v','.webm',
  'audio/*','video/*','image/*','application/pdf',
].join(',');

function randomId(){
  if(globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,char=>{
    const value=Math.random()*16|0;
    return (char==='x'?value:(value&0x3|0x8)).toString(16);
  });
}

function extensionFor(filename=''){
  return String(filename).trim().toLowerCase().split('.').pop() || '';
}

function safeFilename(filename='private-file'){
  const clean=String(filename || 'private-file')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
  return clean || 'private-file';
}

function isFileLike(file){
  return !!file && typeof file.name === 'string' && Number.isFinite(Number(file.size));
}

const pendingTransfers=new Map();
const PENDING_TRANSFER_TTL_MS=7*24*60*60*1000;

function transferFileKey(file){
  return [file?.name||'',Number(file?.size)||0,file?.type||'',Number(file?.lastModified)||0].join('|');
}
function transferStorageKey(scope,file){
  const raw=`${scope}|${transferFileKey(file)}`;
  let hash=2166136261;
  for(let index=0;index<raw.length;index+=1){
    hash^=raw.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return `flowtel-priestess-mailbox-transfer:${(hash>>>0).toString(16)}`;
}
function readPendingTransfer(scope,file){
  const key=transferStorageKey(scope,file);
  let value=pendingTransfers.get(key) || null;
  try{
    const stored=globalThis.localStorage?.getItem(key);
    if(stored) value=JSON.parse(stored);
  }catch{}
  if(!value || value.scope!==scope || value.fileKey!==transferFileKey(file) || Date.now()-Number(value.createdAt||0)>PENDING_TRANSFER_TTL_MS){
    pendingTransfers.delete(key);
    try{ globalThis.localStorage?.removeItem(key); }catch{}
    return null;
  }
  return {...value,key};
}
function savePendingTransfer(scope,file,value){
  const key=transferStorageKey(scope,file);
  const record={...value,scope,fileKey:transferFileKey(file),createdAt:Number(value.createdAt)||Date.now()};
  pendingTransfers.set(key,record);
  try{ globalThis.localStorage?.setItem(key,JSON.stringify(record)); }catch{}
  return {...record,key};
}
function clearPendingTransfer(transfer){
  if(!transfer?.key) return;
  pendingTransfers.delete(transfer.key);
  try{ globalThis.localStorage?.removeItem(transfer.key); }catch{}
}
function preparePendingTransfer(scope,file,create){
  return readPendingTransfer(scope,file) || savePendingTransfer(scope,file,create());
}
function markPendingTransferUploaded(transfer,file){
  return savePendingTransfer(transfer.scope,file,{...transfer,uploaded:true});
}

function fileSizeLabel(bytes=0){
  const value=Number(bytes)||0;
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
  return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
}

export function validatePriestessMailboxFile(file){
  if(!isFileLike(file)) throw new Error('Choose a private file first.');
  const extension=extensionFor(file.name);
  if(!PRIESTESS_MAILBOX_FILE_EXTENSIONS.includes(extension)){
    throw new Error('Choose a video, audio, image, PDF, document, spreadsheet, presentation, or ZIP file. Executable and script files are not accepted.');
  }
  if(Number(file.size)<=0) throw new Error('This private file appears to be empty.');
  if(Number(file.size)>PRIESTESS_MAILBOX_MAX_BYTES){
    throw new Error(`${file.name} is ${fileSizeLabel(file.size)}. The Priestess Mailbox currently accepts files up to 250 MB.`);
  }
  return file;
}

// Historical validation names remain available so older browser modules do not break.
export const validatePriestessMailboxAudio = validatePriestessMailboxFile;
export const validatePriestessInboxFile = validatePriestessMailboxFile;

async function authenticatedUser(){
  const { data, error } = await supabase.auth.getUser();
  if(error) throw error;
  if(!data?.user) throw new Error('Sign in through Flowtel before opening the Priestess Mailbox.');
  return data.user;
}

function directStorageEndpoint(){
  const url=new URL(SUPABASE_URL);
  if(/\.supabase\.co$/i.test(url.hostname) && !/\.storage\.supabase\.co$/i.test(url.hostname)){
    url.hostname=url.hostname.replace(/\.supabase\.co$/i,'.storage.supabase.co');
  }
  return `${url.origin}/storage/v1/upload/resumable`;
}

function uploadFailure(error,file){
  const source=String(error?.originalResponse?.getBody?.() || error?.message || error || '').trim();
  if(/413|maximum allowed size|exceeded.*size|too large|file size/i.test(source)){
    return new Error(`${file?.name || 'This file'} is larger than the live Storage limit. The Priestess Mailbox currently supports files up to 250 MB, and the Supabase project-wide limit must be at least that high.`);
  }
  if(/mime|content.?type|not allowed|unsupported.*type/i.test(source)){
    return new Error('This file type was rejected by private Storage. Choose a supported video, audio, image, document, spreadsheet, presentation, PDF, or ZIP file.');
  }
  if(/network|failed to fetch|load failed|timeout|timed out|connection|offline/i.test(source)){
    return new Error('The private upload was interrupted. Keep this page open and press Send again with the same file; large uploads will resume from the last saved chunk.');
  }
  return error instanceof Error ? error : new Error(source || 'The private file upload could not be completed.');
}

export async function uploadPriestessMailboxFile(path,file,onProgress){
  validatePriestessMailboxFile(file);
  if(!path) throw new Error('The Priestess Mailbox could not prepare a private storage path.');

  if(file.size<=PRIESTESS_MAILBOX_RESUMABLE_THRESHOLD_BYTES){
    onProgress?.(3,{uploadedBytes:0,totalBytes:file.size,resumable:false});
    const {error}=await supabase.storage
      .from(PRIESTESS_MAILBOX_BUCKET)
      .upload(path,file,{
        upsert:false,
        contentType:file.type || 'application/octet-stream',
        cacheControl:'3600',
      });
    if(error) throw uploadFailure(error,file);
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,resumable:false});
    return;
  }

  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  if(!data?.session) throw new Error('Enter through the Flowtel before sending a private file.');

  let tusModule;
  try{
    tusModule=await import('https://cdn.jsdelivr.net/npm/tus-js-client@4/+esm');
  }catch(error){
    throw new Error('Flowtel could not open the resumable uploader. Check your connection, then try again.');
  }
  const Upload=tusModule.Upload || tusModule.default?.Upload;
  if(!Upload) throw new Error('Flowtel could not open the resumable private file uploader.');

  await new Promise((resolve,reject)=>{
    const upload=new Upload(file,{
      endpoint:directStorageEndpoint(),
      retryDelays:[0,3000,5000,10000,20000],
      headers:{
        authorization:`Bearer ${data.session.access_token}`,
        apikey:SUPABASE_PUBLISHABLE_KEY,
        'x-upsert':'false',
      },
      uploadDataDuringCreation:true,
      removeFingerprintOnSuccess:true,
      chunkSize:PRIESTESS_MAILBOX_RESUMABLE_THRESHOLD_BYTES,
      fingerprint:()=>Promise.resolve(`flowtel-mailbox-${path}-${transferFileKey(file)}`),
      metadata:{
        bucketName:PRIESTESS_MAILBOX_BUCKET,
        objectName:path,
        contentType:file.type || 'application/octet-stream',
        cacheControl:'3600',
      },
      onError(error){ reject(uploadFailure(error,file)); },
      onProgress(uploaded,total){
        const percent=Math.max(1,Math.min(total?Math.round(uploaded/total*100):0,99));
        onProgress?.(percent,{uploadedBytes:uploaded,totalBytes:total,resumable:true});
      },
      onSuccess(){
        onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,resumable:true});
        resolve();
      },
    });

    upload.findPreviousUploads()
      .then(previousUploads=>{
        if(previousUploads?.length) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(error=>reject(uploadFailure(error,file)));
  });
}

export async function sendPrivateFileToConcierge(file,{ subject='', message='', note='', onProgress } = {}){
  validatePriestessMailboxFile(file);
  const user=await authenticatedUser();
  let transfer=preparePendingTransfer(`to-admin:${user.id}`,file,()=>{
    const threadId=randomId();
    const fileId=randomId();
    return {threadId,fileId,path:`${user.id}/${threadId}/to-admin/${fileId}-${safeFilename(file.name)}`,uploaded:false};
  });
  if(!transfer.uploaded){
    await uploadPriestessMailboxFile(transfer.path,file,onProgress);
    transfer=markPendingTransferUploaded(transfer,file);
  }else{
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,resumable:true,resumed:true});
  }

  const { data, error } = await supabase.rpc('flowtel_mailbox_create_thread',{
    p_thread_id:transfer.threadId,
    p_subject:subject || null,
    p_message:message || null,
    p_storage_path:transfer.path,
    p_original_filename:file.name,
    p_mime_type:file.type || null,
    p_size_bytes:file.size,
    p_file_note:note || null,
  });
  if(error){
    await supabase.storage.from(PRIESTESS_MAILBOX_BUCKET).remove([transfer.path]).catch(()=>{});
    clearPendingTransfer(transfer);
    throw error;
  }
  clearPendingTransfer(transfer);
  return data || transfer.threadId;
}

// Historical member upload name kept for compatibility.
export async function sendAudioToConcierge(file,options={}){
  return sendPrivateFileToConcierge(file,options);
}

export async function listMyPriestessMailbox(){
  const { data, error } = await supabase.rpc('flowtel_mailbox_get_my_threads');
  if(error) throw error;
  return data || [];
}

export async function listAdminPriestessMailbox(){
  const { data, error } = await supabase.rpc('flowtel_mailbox_admin_get_queue');
  if(error) throw error;
  return data || [];
}

export async function createMailboxDownloadUrl(storagePath,expiresIn = 900){
  if(!storagePath) throw new Error('This mailbox file has no storage path.');
  const { data, error } = await supabase.storage
    .from(PRIESTESS_MAILBOX_BUCKET)
    .createSignedUrl(storagePath,Math.max(60,Math.min(Number(expiresIn)||900,3600)));
  if(error) throw error;
  if(!data?.signedUrl) throw new Error('Flowtel could not prepare this private download.');
  return data.signedUrl;
}

export async function markMailboxFileReceived(fileId){
  const { data, error } = await supabase.rpc('flowtel_mailbox_admin_mark_received',{
    p_file_id:fileId,
  });
  if(error) throw error;
  return data;
}

export async function returnPrivateFile({ threadId, practitionerId, file, note='', onProgress } = {}){
  if(!threadId || !practitionerId) throw new Error('Choose a Priestess Mailbox thread first.');
  validatePriestessMailboxFile(file);
  let transfer=preparePendingTransfer(`to-practitioner:${practitionerId}:${threadId}`,file,()=>{
    const fileId=randomId();
    return {fileId,path:`${practitionerId}/${threadId}/to-practitioner/${fileId}-${safeFilename(file.name)}`,uploaded:false};
  });
  if(!transfer.uploaded){
    await uploadPriestessMailboxFile(transfer.path,file,onProgress);
    transfer=markPendingTransferUploaded(transfer,file);
  }else{
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,resumable:true,resumed:true});
  }

  const { data, error } = await supabase.rpc('flowtel_mailbox_admin_add_return_file',{
    p_thread_id:threadId,
    p_storage_path:transfer.path,
    p_original_filename:file.name,
    p_mime_type:file.type || null,
    p_size_bytes:file.size,
    p_file_note:note || null,
  });
  if(error){
    await supabase.storage.from(PRIESTESS_MAILBOX_BUCKET).remove([transfer.path]).catch(()=>{});
    clearPendingTransfer(transfer);
    throw error;
  }
  clearPendingTransfer(transfer);
  return data;
}

// Historical owner return name kept for compatibility.
export async function returnEditedAudio(options={}){
  return returnPrivateFile(options);
}

export async function markReturnedAudioDownloaded(fileId){
  const { data, error } = await supabase.rpc('flowtel_mailbox_member_mark_return_downloaded',{
    p_file_id:fileId,
  });
  if(error) throw error;
  return data;
}

export async function listPriestessInboxRecipients(){
  const {data,error}=await supabase.rpc('flowtel_mailbox_admin_list_recipients');
  if(error) throw error;
  return data||[];
}

export async function sendPrivateFileToPriestess({recipientId,file,subject='',message='',note='',onProgress}={}){
  if(!recipientId) throw new Error('Choose a Priestess to receive this file.');
  validatePriestessMailboxFile(file);
  let transfer=preparePendingTransfer(`admin-send:${recipientId}`,file,()=>{
    const threadId=randomId();
    const fileId=randomId();
    return {threadId,fileId,path:`${recipientId}/${threadId}/to-practitioner/${fileId}-${safeFilename(file.name)}`,uploaded:false};
  });
  if(!transfer.uploaded){
    await uploadPriestessMailboxFile(transfer.path,file,onProgress);
    transfer=markPendingTransferUploaded(transfer,file);
  }else{
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,resumable:true,resumed:true});
  }
  const {data,error}=await supabase.rpc('flowtel_mailbox_admin_send_file',{
    p_recipient_id:recipientId,
    p_thread_id:transfer.threadId,
    p_subject:subject||null,
    p_message:message||null,
    p_storage_path:transfer.path,
    p_original_filename:file.name,
    p_mime_type:file.type||null,
    p_size_bytes:file.size,
    p_file_note:note||null,
  });
  if(error){
    await supabase.storage.from(PRIESTESS_MAILBOX_BUCKET).remove([transfer.path]).catch(()=>{});
    clearPendingTransfer(transfer);
    throw error;
  }
  clearPendingTransfer(transfer);
  return data;
}
