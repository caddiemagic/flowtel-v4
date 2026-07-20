// Flowtel v0.10.65 — private Flow FM Lounge video metadata and validation.

export const LOUNGE_VIDEO_BUCKET='flowtel-lounge-videos';
export const LOUNGE_VIDEO_MAX_BYTES=2147483648;
const ALLOWED_TYPES=new Set([
  'video/mp4','video/quicktime','video/x-m4v','video/webm','application/octet-stream',
]);

export function loungeVideoFileSize(bytes=0){
  const size=Math.max(0,Number(bytes)||0);
  if(size<1024) return `${size} B`;
  if(size<1024**2) return `${(size/1024).toFixed(1)} KB`;
  if(size<1024**3) return `${(size/1024**2).toFixed(1)} MB`;
  return `${(size/1024**3).toFixed(2)} GB`;
}

export function safeLoungeVideoFilename(value='lounge-video.mp4'){
  const cleaned=String(value || 'lounge-video.mp4')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^[-.]+|[-.]+$/g,'')
    .slice(0,180);
  return cleaned || 'lounge-video.mp4';
}

export function validateLoungeVideo(file){
  if(!file || typeof file.size!=='number') throw new Error('Choose the Lounge video first.');
  if(file.size<=0) throw new Error('This video file appears to be empty.');
  if(file.size>LOUNGE_VIDEO_MAX_BYTES) throw new Error('The Lounge uploader accepts video files up to 2 GB.');
  const type=String(file.type || 'application/octet-stream').toLowerCase();
  const extension=String(file.name || '').split('.').pop()?.toLowerCase();
  const extensionAllowed=['mp4','mov','m4v','webm'].includes(extension);
  if(!ALLOWED_TYPES.has(type) && !extensionAllowed){
    throw new Error('Choose an MP4, MOV, M4V, or WEBM video for the Lounge.');
  }
  return {mimeType:type,extension};
}

export function loungeVideoProjectLimitMessage(file){
  return `${file?.name || 'This video'} is ${loungeVideoFileSize(file?.size)}. The private Lounge bucket accepts it, but the Supabase project-wide Storage limit is lower. Raise Storage → Settings → Global file size limit above this file size, then try again.`;
}
