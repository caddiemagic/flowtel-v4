// Feature-local request guards; existing Flowtel authentication remains authoritative.
const {bearerToken,readRequestBody}=require('../server/guest-house-server.js');
function failure(message,statusCode=400){return Object.assign(new Error(message),{statusCode});}
function authenticated(req){if(!bearerToken(req))throw failure('Sign in to Flowtel first.',401);}
async function body(req){
 const limit=32768;
 if(Number(req.headers?.['content-length'])>limit)throw failure('Request too large',413);
 if(req.body!==undefined){if(Buffer.byteLength(typeof req.body==='string'?req.body:JSON.stringify(req.body))>limit)throw failure('Request too large',413);return readRequestBody(req);}
 let size=0;const chunks=[];for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>limit)throw failure('Request too large',413);chunks.push(b);}
 try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw failure('Invalid JSON');}
}
module.exports={authenticated,body,failure};
