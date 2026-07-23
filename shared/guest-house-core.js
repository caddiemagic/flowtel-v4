// Flowtel v0.10.74.2 — Guest House accounts, replay files, editable training offering, and private-room helpers.

export const GUEST_HOUSE_REPLAY_BUCKET = 'flowtel-guest-house-replays';
export const GUEST_HOUSE_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const GUEST_HOUSE_REPLAY_EXTENSIONS = ['mp4','mov','m4v','webm','mp3','wav','m4a','aac','ogg'];
export const GUEST_HOUSE_VIDEO_EXTENSIONS = new Set(['mp4','mov','m4v','webm']);
export const GUEST_HOUSE_AUDIO_EXTENSIONS = new Set(['mp3','wav','m4a','aac','ogg']);
export const GUEST_HOUSE_TRAINING_CONSENT_VERSION = 'flow-fm-training-offering-v3-2026-07-23';
export const GUEST_HOUSE_TRAINING_COUPON_CODE = 'WITNESSED';
export const GUEST_HOUSE_TRAINING_SCHEDULE_URL = 'https://meganmichele.as.me/energyreading';
export const GUEST_HOUSE_TRAINING_CONSENT_COPY = 'I freely give the selected Guest House session recording(s) as an offering for Moon Priestess training and give Megan Michele permission to share them inside the private Flow FM Mastermind portal. I understand that my name, voice, image, and personal conversation may be included. I understand that the complimentary session offered in gratitude will also be recorded and shared in Flow FM for the same training purpose.';
export const GUEST_HOUSE_TRAINING_SELECTION_COPY = 'I understand that only the recordings checked above are currently offered for private Moon Priestess training inside Flow FM.';
export const GUEST_HOUSE_STATUS_LABELS = Object.freeze({
  requested: 'Concierge is locating the recording',
  locating: 'Concierge is locating the recording',
  preparing: 'Concierge is locating the recording',
  ready: 'Replay Room is ready',
  delivered: 'Replay Room is ready',
  received: 'Replay Room is ready',
  unable_to_locate: "Concierge couldn't find the replay",
  archived: "Concierge couldn't find the replay",
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
  const callMemory=String(values.callMemory || values.call_memory || values.callTopic || values.call_topic || '').trim();
  const confirmed=values.confirmed===true || values.requester_confirmed_ownership===true || values.confirmed==='true';

  if(firstName.length<1 || firstName.length>100) throw new Error('Enter your first name.');
  if(lastName.length<1 || lastName.length>100) throw new Error('Enter your last name.');
  if(email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>320)){
    throw new Error('Enter a valid email address.');
  }
  if(!callMemory) throw new Error('Share what you remember about the call.');
  if(callMemory.length>2000) throw new Error('Keep your call memory under 2,000 characters.');
  if(!confirmed) throw new Error('Confirm that you are requesting your own private call replay.');

  return { firstName,lastName,email,callMemory,confirmed:true };
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

export function guestHouseReplayTitle(filename=''){
  const title=String(filename || '')
    .replace(/\.[^.]+$/,'')
    .replace(/[_-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return title || 'Your 1:1 Call Replay';
}

export function normalizeGuestHouseTrainingFileIds(values=[]){
  const source=Array.isArray(values)?values:[];
  return [...new Set(source.map(value=>String(value || '').trim()).filter(Boolean))];
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


export function guestHouseReplayDaysRemaining(expiresAt,fromDate=new Date()){
  if(!expiresAt) return null;
  const end=new Date(expiresAt).getTime();
  const start=new Date(fromDate).getTime();
  if(!Number.isFinite(end) || !Number.isFinite(start)) return null;
  return Math.max(0,Math.ceil((end-start)/86400000));
}

export function guestHouseReplayExpirationCopy(expiresAt,fromDate=new Date()){
  const days=guestHouseReplayDaysRemaining(expiresAt,fromDate);
  if(days===null) return '';
  if(days<=0) return 'This replay has reached the end of its 28-day Guest House stay.';
  if(days===1) return 'This replay will be deleted in 1 day.';
  return `This replay will be deleted in ${days} days.`;
}
