// Flowtel v0.10.62 — Guest House request, replay-file, and private-room helpers.

export const GUEST_HOUSE_REPLAY_BUCKET = 'flowtel-guest-house-replays';
export const GUEST_HOUSE_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const GUEST_HOUSE_REPLAY_EXTENSIONS = ['mp4','mov','m4v','webm','mp3','wav','m4a','aac','ogg'];
export const GUEST_HOUSE_VIDEO_EXTENSIONS = new Set(['mp4','mov','m4v','webm']);
export const GUEST_HOUSE_AUDIO_EXTENSIONS = new Set(['mp3','wav','m4a','aac','ogg']);
export const GUEST_HOUSE_STATUS_LABELS = Object.freeze({
  requested: 'Request received',
  locating: 'Locating your replay',
  preparing: 'Preparing your Replay Room',
  ready: 'Replay Room ready',
  delivered: 'Private invitation shared',
  received: 'Replay received',
  unable_to_locate: 'A personal reply is needed',
  archived: 'Room archived',
});

const SUPPORTED_MIME_TYPES = new Set([
  'video/mp4','video/quicktime','video/x-m4v','video/webm',
  'audio/mpeg','audio/mp3','audio/mpeg3','audio/x-mpeg-3',
  'audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
  'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/x-aac','audio/ogg',
  'application/octet-stream','',
]);

export function normalizeGuestHouseEmail(value=''){
  return String(value || '').trim().toLowerCase();
}

export function extensionForGuestHouseFile(filename=''){
  const name=String(filename || '').trim().toLowerCase();
  const dot=name.lastIndexOf('.');
  return dot>=0 ? name.slice(dot+1) : '';
}

export function guestHouseMediaKind(filename='',mimeType=''){
  const extension=extensionForGuestHouseFile(filename);
  const mime=String(mimeType || '').toLowerCase();
  if(GUEST_HOUSE_VIDEO_EXTENSIONS.has(extension) || mime.startsWith('video/')) return 'video';
  if(GUEST_HOUSE_AUDIO_EXTENSIONS.has(extension) || mime.startsWith('audio/')) return 'audio';
  return '';
}

export function safeGuestHouseFilename(filename='replay'){
  const cleaned=String(filename || 'replay')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
  return cleaned || 'replay';
}


export function guestHouseProjectLimitMessage(file={}){
  const name=String(file?.name || 'This replay');
  const size=Math.max(1,Math.round((Number(file?.size)||0)/(1024*1024)));
  return `Supabase rejected ${name} (${size} MB) before transfer because the project-wide Storage limit is smaller than this recording. In Supabase, open Storage → Settings and raise Global file size limit to at least 1 GB, then try again. The private Guest House bucket is already configured for 2 GB.`;
}

export function validateGuestHouseReplayMetadata(file){
  if(!file || typeof file !== 'object') throw new Error('Choose a call replay first.');
  const filename=String(file.name || '');
  const extension=extensionForGuestHouseFile(filename);
  const mime=String(file.type || '').toLowerCase();
  const size=Number(file.size || 0);
  if(!GUEST_HOUSE_REPLAY_EXTENSIONS.includes(extension)){
    throw new Error('Choose an MP4, MOV, M4V, WEBM, MP3, WAV, M4A, AAC, or OGG replay file.');
  }
  if(!SUPPORTED_MIME_TYPES.has(mime)){
    throw new Error('This file does not appear to be a supported call replay.');
  }
  if(!Number.isFinite(size) || size<=0) throw new Error('This replay file appears to be empty.');
  if(size>GUEST_HOUSE_MAX_BYTES) throw new Error('Choose a replay file smaller than 2 GB.');
  const mediaKind=guestHouseMediaKind(filename,mime);
  if(!mediaKind) throw new Error('Flowtel could not identify this replay as audio or video.');
  return { extension,mimeType:mime || 'application/octet-stream',sizeBytes:size,mediaKind };
}

export function validateGuestHouseRequest(values={}){
  const firstName=String(values.firstName || values.first_name || '').trim();
  const lastName=String(values.lastName || values.last_name || '').trim();
  const email=normalizeGuestHouseEmail(values.email);
  const callDateHint=String(values.callDateHint || values.call_date_hint || '').trim();
  const callTopic=String(values.callTopic || values.call_topic || '').trim();
  const requesterNote=String(values.requesterNote || values.requester_note || '').trim();
  const confirmed=values.confirmed===true || values.requester_confirmed_ownership===true || values.confirmed==='true';

  if(firstName.length<1 || firstName.length>100) throw new Error('Enter your first name.');
  if(lastName.length<1 || lastName.length>100) throw new Error('Enter your last name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>320){
    throw new Error('Enter the email address you used for your 1:1 call.');
  }
  if(callDateHint.length>160) throw new Error('Keep the call date or month under 160 characters.');
  if(callTopic.length>240) throw new Error('Keep the call description under 240 characters.');
  if(requesterNote.length>2000) throw new Error('Keep your private note under 2,000 characters.');
  if(!confirmed) throw new Error('Confirm that you are requesting your own private call replay.');

  return { firstName,lastName,email,callDateHint,callTopic,requesterNote,confirmed:true };
}

export function guestHouseExpirationDate(days=90,fromDate=new Date()){
  const parsed=Math.max(1,Math.min(Number(days)||90,366));
  const date=new Date(fromDate);
  date.setUTCDate(date.getUTCDate()+parsed);
  return date;
}

export function buildGuestHouseReplayUrl(token,{origin='https://app.theflowtel.com'}={}){
  const root=String(origin || 'https://app.theflowtel.com').replace(/\/$/,'');
  return `${root}/guest-house/replay/?key=${encodeURIComponent(String(token || ''))}`;
}

export function guestHouseFileSize(bytes=0){
  const value=Number(bytes)||0;
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
  if(value<1024*1024*1024) return `${(value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)} MB`;
  return `${(value/(1024*1024*1024)).toFixed(2)} GB`;
}

function bytesToHex(bytes){
  return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export function createGuestHouseToken(){
  if(!globalThis.crypto?.getRandomValues) throw new Error('This browser cannot create a secure private room key.');
  const bytes=new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashGuestHouseToken(token){
  if(!globalThis.crypto?.subtle) throw new Error('This browser cannot protect the private room key.');
  const encoded=new TextEncoder().encode(String(token || ''));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',encoded);
  return bytesToHex(new Uint8Array(digest));
}
