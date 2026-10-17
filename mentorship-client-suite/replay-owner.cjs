const crypto=require('node:crypto');
const {fetchJson,serviceHeaders}=require('../server/guest-house-server.js');
const {failure}=require('./request.cjs');
const {session,endpoint,validate}=require('./session-controls.cjs');
const bucket='flowtel-mentorship-replays',maxBytes=524288000;
const types={'video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/mp4':'m4a','audio/webm':'webm'};
const pathURL=p=>p.split('/').map(encodeURIComponent).join('/');
async function beginUpload(ctx,args){
 await session(ctx,args);
 if(!types[args.mimeType]||!Number.isSafeInteger(args.sizeBytes)||args.sizeBytes<1||args.sizeBytes>maxBytes)throw failure('Choose a supported audio/video file up to 500 MB');
 const path=args.enrollmentId+'/'+args.sessionId+'/'+crypto.randomUUID()+'.'+types[args.mimeType];
 const signed=await fetchJson(ctx.supabaseUrl+'/storage/v1/object/upload/sign/'+bucket+'/'+pathURL(path),{method:'POST',headers:serviceHeaders(ctx.serviceKey),body:'{}'});
 const token=new URL(signed.url||'',ctx.supabaseUrl).searchParams.get('token');if(!token)throw Error('Upload authorization unavailable');
 return {path,token,bucket,maxBytes};
}
async function finishUpload(ctx,args){
 await session(ctx,args);
 const prefix=args.enrollmentId+'/'+args.sessionId+'/';
 if(typeof args.path!=='string'||!args.path.startsWith(prefix)||!new RegExp('^[0-9a-f-]{36}\\.(mp4|webm|mp3|m4a)$').test(args.path.slice(prefix.length)))throw failure('Invalid recording path');
 if(typeof args.title!=='string'||!args.title.trim()||args.title.length>200)throw failure('Recording title is required (up to 200 characters)');
 // Storage metadata must exist before the recording can become visible.
 const filename=args.path.slice(prefix.length);
 const listed=await fetchJson(ctx.supabaseUrl+'/storage/v1/object/list/'+bucket,{method:'POST',headers:serviceHeaders(ctx.serviceKey),body:JSON.stringify({prefix:prefix.slice(0,-1),search:filename,limit:2})});
 const info=Array.isArray(listed)?listed.find(file=>file.name===filename):null;
 if(!info)throw failure('Uploaded recording was not found',404);
 const size=Number(info.metadata?.size??info.size),mime=info.metadata?.mimetype??info.contentType;
 if(!types[mime]||!Number.isFinite(size)||size<1||size>maxBytes)throw failure('Uploaded recording metadata is invalid');
 const existing=await fetchJson(endpoint(ctx,'replays','select=id,title,visible_to_client&session_id=eq.'+args.sessionId+'&storage_path=eq.'+encodeURIComponent(args.path)),{headers:serviceHeaders(ctx.serviceKey)});
 // A successful save response may be lost. A later retry returns the saved row without
 // duplicating it or resetting publication/title. The session and storage checks still run.
 if(!Array.isArray(existing))throw Error('Recording save could not be checked');
 if(existing.length===1)return {id:existing[0].id,title:existing[0].title,visible_to_client:existing[0].visible_to_client};
 if(existing.length>1)throw failure('Multiple records found for this upload. Refresh the recording list.',409);
 // The randomized upload UUID is also the new replay ID. Its existing primary key
 // prevents concurrent finalization of the same upload without a schema change.
 const replayId=validate(filename.slice(0,36));let records;
 try{records=await fetchJson(endpoint(ctx,'replays','select=id,title,visible_to_client'),{method:'POST',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify({id:replayId,session_id:args.sessionId,title:args.title.trim(),storage_path:args.path,visible_to_client:false})});}
 catch(error){
  if(error.statusCode!==409)throw error;
  const saved=await fetchJson(endpoint(ctx,'replays','select=id,title,visible_to_client&id=eq.'+replayId+'&session_id=eq.'+args.sessionId+'&storage_path=eq.'+encodeURIComponent(args.path)),{headers:serviceHeaders(ctx.serviceKey)});
  if(!Array.isArray(saved)||saved.length!==1)throw error;
  return {id:saved[0].id,title:saved[0].title,visible_to_client:saved[0].visible_to_client};
 }
 if(!Array.isArray(records)||records.length!==1)throw Error('Recording save failed');return records[0];
}
async function listReplays(ctx,args){await session(ctx,args);return fetchJson(endpoint(ctx,'replays','select=id,title,visible_to_client,created_at&session_id=eq.'+args.sessionId+'&order=created_at.desc'),{headers:serviceHeaders(ctx.serviceKey)});}
async function visibility(ctx,args){await session(ctx,args);validate(args.replayId);if(typeof args.visible!=='boolean')throw failure('Visibility must be true or false');const rows=await fetchJson(endpoint(ctx,'replays','id=eq.'+args.replayId+'&session_id=eq.'+args.sessionId+'&select=id,title,visible_to_client'),{method:'PATCH',headers:serviceHeaders(ctx.serviceKey,'return=representation'),body:JSON.stringify({visible_to_client:args.visible})});if(!Array.isArray(rows)||rows.length!==1)throw failure('Recording not found',404);return rows[0];}
module.exports={beginUpload,finishUpload,listReplays,visibility};
