// Flowtel v0.10.80.6 — authenticated Storage SDK Priestess media upload reliability.

import { supabase } from './supabase.js';

export const PRIESTESS_MAILBOX_BUCKET = 'flowtel-priestess-mailbox';
export const PRIESTESS_MAILBOX_MAX_BYTES = 1 * 1024 * 1024 * 1024;
// Historical export retained so older callers do not break. The Mailbox no longer
// branches into the custom TUS authorization pathway.
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
const PENDING_TRANSFER_TTL_MS=14*24*60*60*1000;

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
  if(value<1024*1024*1024) return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
  return `${(value/(1024*1024*1024)).toFixed(value>=10*1024*1024*1024?0:2)} GB`;
}

export function validatePriestessMailboxFile(file){
  if(!isFileLike(file)) throw new Error('Choose a private file first.');
  const extension=extensionFor(file.name);
  if(!PRIESTESS_MAILBOX_FILE_EXTENSIONS.includes(extension)){
    throw new Error('Choose a video, audio, image, PDF, document, spreadsheet, presentation, or ZIP file. Executable and script files are not accepted.');
  }
  if(Number(file.size)<=0) throw new Error('This private file appears to be empty.');
  if(Number(file.size)>PRIESTESS_MAILBOX_MAX_BYTES){
    throw new Error(`${file.name} is ${fileSizeLabel(file.size)}. The Priestess Mailbox currently accepts files up to 1 GB.`);
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

function standardUploadProgress(onProgress,percent,extra={}){
  onProgress?.(percent,{transport:'supabase-storage-sdk',indeterminate:percent<100,...extra});
}

function uploadFailure(error,file){
  const source=String(error?.originalResponse?.getBody?.() || error?.message || error || '').trim();
  if(/413|maximum allowed size|exceeded.*size|too large|file size/i.test(source)){
    return new Error(`${file?.name || 'This file'} is larger than the live Storage limit. The Priestess Mailbox currently supports files up to 1 GB, and the Supabase project-wide limit must be at least that high.`);
  }
  if(/mime|content.?type|not allowed|unsupported.*type/i.test(source)){
    return new Error('This file type was rejected by private Storage. Choose a supported video, audio, image, document, spreadsheet, presentation, PDF, or ZIP file.');
  }
  if(/invalid compact jws|invalid jwt|jwt expired|unauthorized|not authenticated|access denied/i.test(source)){
    return new Error('Private Storage did not accept this upload. Please try the file once more. If it repeats, capture the message shown here so the exact Storage response can be repaired.');
  }
  if(/network|failed to fetch|load failed|timeout|timed out|connection|offline/i.test(source)){
    return new Error('The private upload was interrupted. Keep the file selected and press Send again when the connection is stable.');
  }
  return error instanceof Error ? error : new Error(source || 'The private file upload could not be completed.');
}

export async function uploadPriestessMailboxFile(path,file,onProgress){
  validatePriestessMailboxFile(file);
  if(!path) throw new Error('The Priestess Mailbox could not prepare a private storage path.');

  // The prior custom TUS authorization pathway repeatedly failed against the
  // live project even while the same signed-in user could read and write all
  // other Flowtel data. Use the authenticated Supabase Storage SDK directly.
  // Supabase supports standard uploads up to 5 GB; the Mailbox remains capped
  // at 1 GB by both browser validation and its private bucket boundary.
  standardUploadProgress(onProgress,8,{stage:'uploading'});
  const {error}=await supabase.storage
    .from(PRIESTESS_MAILBOX_BUCKET)
    .upload(path,file,{
      upsert:false,
      contentType:file.type || 'application/octet-stream',
      cacheControl:'3600',
    });
  if(error) throw uploadFailure(error,file);
  standardUploadProgress(onProgress,100,{stage:'complete',uploadedBytes:file.size,totalBytes:file.size,indeterminate:false});
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
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,transport:'registered-upload',indeterminate:false,resumed:true});
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

export async function createMailboxDownloadUrl(storagePath,expiresIn = 21600){
  if(!storagePath) throw new Error('This mailbox file has no storage path.');
  const { data, error } = await supabase.storage
    .from(PRIESTESS_MAILBOX_BUCKET)
    .createSignedUrl(storagePath,Math.max(300,Math.min(Number(expiresIn)||21600,43200)));
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

// Clears the owner alert without deleting or downloading the private file.
// The existing received_at field is the canonical handled/notification state.
export async function clearMailboxFileNotification(fileId){
  return markMailboxFileReceived(fileId);
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
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,transport:'registered-upload',indeterminate:false,resumed:true});
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
    onProgress?.(100,{uploadedBytes:file.size,totalBytes:file.size,transport:'registered-upload',indeterminate:false,resumed:true});
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
