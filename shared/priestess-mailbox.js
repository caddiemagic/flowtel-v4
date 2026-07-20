// Flowtel v0.10.56 — private, bi-directional Priestess Audio Mailbox helpers.

import { supabase } from './supabase.js';

export const PRIESTESS_MAILBOX_BUCKET = 'flowtel-priestess-mailbox';
export const PRIESTESS_MAILBOX_MAX_BYTES = 250 * 1024 * 1024;
export const PRIESTESS_MAILBOX_EXTENSIONS = ['mp3','wav','m4a','aac','ogg'];
const MIME_TYPES = new Set([
  'audio/mpeg','audio/mp3','audio/mpeg3','audio/x-mpeg-3','audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
  'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/x-aac','audio/ogg','application/octet-stream','',
]);

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

function safeFilename(filename='audio-file'){
  const clean=String(filename || 'audio-file')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
  return clean || 'audio-file';
}

export function validatePriestessMailboxAudio(file){
  if(!(file instanceof File)) throw new Error('Choose an audio file first.');
  if(!PRIESTESS_MAILBOX_EXTENSIONS.includes(extensionFor(file.name))){
    throw new Error('Choose an MP3, WAV, M4A, AAC, or OGG audio file.');
  }
  if(!MIME_TYPES.has(String(file.type || '').toLowerCase())){
    throw new Error('This file does not appear to be a supported audio format.');
  }
  if(file.size <= 0) throw new Error('This audio file appears to be empty.');
  if(file.size > PRIESTESS_MAILBOX_MAX_BYTES){
    throw new Error('Choose an audio file smaller than 250 MB.');
  }
}

async function authenticatedUser(){
  const { data, error } = await supabase.auth.getUser();
  if(error) throw error;
  if(!data?.user) throw new Error('Sign in through Flowtel before opening the Priestess Mailbox.');
  return data.user;
}

async function uploadPrivateAudio(path,file){
  const { error } = await supabase.storage
    .from(PRIESTESS_MAILBOX_BUCKET)
    .upload(path,file,{
      upsert:false,
      contentType:file.type || 'application/octet-stream',
      cacheControl:'3600',
    });
  if(error) throw error;
}

export async function sendAudioToConcierge(file,{ subject='', message='', note='' } = {}){
  validatePriestessMailboxAudio(file);
  const user=await authenticatedUser();
  const threadId=randomId();
  const fileId=randomId();
  const path=`${user.id}/${threadId}/to-admin/${fileId}-${safeFilename(file.name)}`;
  await uploadPrivateAudio(path,file);

  const { data, error } = await supabase.rpc('flowtel_mailbox_create_thread',{
    p_thread_id:threadId,
    p_subject:subject || null,
    p_message:message || null,
    p_storage_path:path,
    p_original_filename:file.name,
    p_mime_type:file.type || null,
    p_size_bytes:file.size,
    p_file_note:note || null,
  });
  if(error){
    await supabase.storage.from(PRIESTESS_MAILBOX_BUCKET).remove([path]).catch(()=>{});
    throw error;
  }
  return data || threadId;
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

export async function returnEditedAudio({ threadId, practitionerId, file, note='' } = {}){
  if(!threadId || !practitionerId) throw new Error('Choose a Priestess Mailbox thread first.');
  validatePriestessMailboxAudio(file);
  const fileId=randomId();
  const path=`${practitionerId}/${threadId}/to-practitioner/${fileId}-${safeFilename(file.name)}`;
  await uploadPrivateAudio(path,file);

  const { data, error } = await supabase.rpc('flowtel_mailbox_admin_add_return_file',{
    p_thread_id:threadId,
    p_storage_path:path,
    p_original_filename:file.name,
    p_mime_type:file.type || null,
    p_size_bytes:file.size,
    p_file_note:note || null,
  });
  if(error){
    await supabase.storage.from(PRIESTESS_MAILBOX_BUCKET).remove([path]).catch(()=>{});
    throw error;
  }
  return data;
}

export async function markReturnedAudioDownloaded(fileId){
  const { data, error } = await supabase.rpc('flowtel_mailbox_member_mark_return_downloaded',{
    p_file_id:fileId,
  });
  if(error) throw error;
  return data;
}
