const supported=new Set(['video/mp4','video/webm','audio/mpeg','audio/mp4','audio/webm']);
const extensions={mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',m4a:'audio/mp4'};
export function recordingType(file){
 const type=file?.type||extensions[String(file?.name||'').split('.').pop().toLowerCase()];
 if(!supported.has(type))throw Error('Choose an MP4, WebM, MP3, or M4A recording.');
 if(!Number.isSafeInteger(file?.size)||file.size<1||file.size>524288000)throw Error('Choose a recording up to 500 MB.');
 return type;
}
// Holds a successful transfer only in this page's memory. Never persists upload tokens.
export function recordingUpload({authorize,transfer,finalize,onStage=()=>{}}){
 let pending=null,running=false;
 return {
  get uploaded(){return Boolean(pending);},
  async save(file,title){
   if(running)throw Error('This recording is already being uploaded.');
   if(typeof title!=='string'||!title.trim()||title.length>200)throw Error('Enter a recording title (up to 200 characters).');
   const mimeType=recordingType(file);running=true;
   try{
    if(!pending||pending.file!==file){
     pending=null;onStage('authorizing');const target=await authorize({mimeType,sizeBytes:file.size});
     onStage('uploading');await transfer(target,file,mimeType);
     pending={file,path:target.path};
    }
    onStage('saving');const replay=await finalize({path:pending.path,title:title.trim()});
    pending=null;onStage('complete');return replay;
   }finally{running=false;}
  }
 };
}
