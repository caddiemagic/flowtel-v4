// Flowtel v0.10.83.3 — Queendom events, linked Flow FM hosts, protected Zoom access, and event artwork Storage repair.
import { supabase } from './supabase.js';

export const QUEENDOM_EVENT_IMAGE_BUCKET='flowtel-queendom-event-images';
export const QUEENDOM_EVENT_IMAGE_MAX_BYTES=10*1024*1024;
export const QUEENDOM_EVENT_IMAGE_TYPES=['image/jpeg','image/png','image/webp'];

async function rpc(name,args={}){
  const {data,error}=await supabase.rpc(name,args);
  if(error){
    const detail=String(error.message||'');
    if(/schema cache/i.test(detail)&&/queendom.*event|flowtel_(?:list|public|admin|set|get)_queendom/i.test(`${name} ${detail}`)){
      throw new Error('The Flowtel Calendar database setup is not complete yet. Run migrations 067 and 068, then refresh this room.');
    }
    throw error;
  }
  return data;
}

export async function listQueendomEvents({monthStart=null,monthCount=6}={}){
  const data=await rpc('flowtel_list_queendom_events',{
    p_month_start:monthStart||null,
    p_month_count:Math.max(1,Math.min(Number(monthCount)||6,18)),
  });
  return Array.isArray(data)?data:[];
}

export async function listPublicQueendomEvents({monthStart=null,monthCount=3}={}){
  const data=await rpc('flowtel_public_queendom_events',{
    p_month_start:monthStart||null,
    p_month_count:Math.max(1,Math.min(Number(monthCount)||3,18)),
  });
  return Array.isArray(data)?data:[];
}

export async function setQueendomEventRegistration(eventId,registered=true){
  if(!eventId)throw new Error('Choose an event first.');
  return rpc('flowtel_set_queendom_event_registration',{
    p_event_id:eventId,
    p_registered:Boolean(registered),
  });
}

export async function getQueendomEventJoinDetails(eventId){
  if(!eventId)throw new Error('Choose an event first.');
  return rpc('flowtel_get_queendom_event_join_details',{p_event_id:eventId});
}

export async function loadQueendomEventsAdmin(){
  const data=await rpc('flowtel_admin_list_queendom_events');
  return Array.isArray(data)?data:[];
}

export async function loadQueendomEventHostsAdmin(){
  const data=await rpc('flowtel_admin_list_queendom_event_hosts');
  return Array.isArray(data)?data:[];
}

export async function saveQueendomEventAdmin(payload={}){
  return rpc('flowtel_admin_save_queendom_event',{
    p_event_id:payload.event_id||null,
    p_title:String(payload.title||'').trim(),
    p_event_type:String(payload.event_type||'workshop').trim().toLowerCase(),
    p_description:String(payload.description||'').trim()||null,
    p_event_date:payload.event_date||null,
    p_start_time:payload.start_time||null,
    p_end_time:payload.end_time||null,
    p_timezone:String(payload.timezone||'America/Los_Angeles').trim(),
    p_host_name:String(payload.host_name||'').trim()||null,
    p_audience:String(payload.audience||'queendom').trim().toLowerCase(),
    p_zoom_url:String(payload.zoom_url||'').trim()||null,
    p_zoom_passcode:String(payload.zoom_passcode||'').trim()||null,
    p_image_path:String(payload.image_path||'').trim()||null,
    p_image_url:String(payload.image_url||'').trim()||null,
    p_status:String(payload.status||'draft').trim().toLowerCase(),
    p_host_member_id:payload.host_member_id||null,
  });
}

export async function cancelQueendomEventAdmin(eventId){
  if(!eventId)throw new Error('Choose an event first.');
  return rpc('flowtel_admin_cancel_queendom_event',{p_event_id:eventId});
}

function validateEventImage(file){
  if(!(file instanceof File))throw new Error('Choose an event image first.');
  if(!QUEENDOM_EVENT_IMAGE_TYPES.includes(file.type))throw new Error('Choose a JPG, PNG, or WebP image.');
  if(file.size>QUEENDOM_EVENT_IMAGE_MAX_BYTES)throw new Error('Choose an event image smaller than 10 MB.');
}

export async function uploadQueendomEventImage(eventId,file){
  validateEventImage(file);
  if(!eventId)throw new Error('Save the event before uploading its image.');
  const path=`${eventId}/cover`;
  const {error}=await supabase.storage.from(QUEENDOM_EVENT_IMAGE_BUCKET).upload(path,file,{
    upsert:true,
    contentType:file.type,
    cacheControl:'3600',
  });
  if(error){
    const detail=String(error.message||'');
    if(/bucket.*not found|not found.*bucket/i.test(detail)){
      throw new Error('Event artwork storage is not installed yet. Run Flowtel migrations 067, 068, and 069, then try the image again.');
    }
    if(/row-level security|42501|unauthorized/i.test(detail)){
      throw new Error('Event artwork permission is not installed yet. Run Flowtel migration 069, refresh the Events room, and try the image again.');
    }
    throw error;
  }
  const {data}=supabase.storage.from(QUEENDOM_EVENT_IMAGE_BUCKET).getPublicUrl(path);
  if(!data?.publicUrl)throw new Error('The image uploaded, but Flowtel could not prepare its calendar URL.');
  return {image_path:path,image_url:`${data.publicUrl}?v=${Date.now()}`};
}
