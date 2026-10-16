// In-memory Supabase contract double. Fictional identities only; never connects to a real project.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const owner=require('./owner-handler.DRAFT.cjs'),client=require('./client-handler.DRAFT.cjs');
const ids={offering:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',enrollment:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',session:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',a:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',b:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'};
async function start(){
 const tables={offerings:[{id:ids.offering,title:'Fictional Womb Activation',offering_key:'womb_activation',price_cents:77700,duration_days:14,activation_minutes:180,is_active:true}],enrollments:[{id:ids.enrollment,invited_email:'fictional-a@example.com',client_user_id:ids.a,offering_id:ids.offering,status:'active',offering_snapshot:{title:'Fictional Womb Activation',duration_days:14},starts_on:'2027-01-20',ends_on:'2027-02-03'}],sessions:[{id:ids.session,enrollment_id:ids.enrollment,session_number:1,session_kind:'activation',duration_minutes:180,status:'unscheduled',scheduled_at:null,timezone:'America/Los_Angeles'}],monthly_focus:[],replays:[],external_appointments:[]};
 const objects=new Map();let origin;
 const old={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY};
 const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,origin);const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};
 const read=async()=>{let text='';for await(const chunk of req)text+=chunk;return text?JSON.parse(text):{}};
 if(u.pathname==='/auth/v1/user'){const token=req.headers.authorization?.slice(7);if(!['owner','a','b'].includes(token))return send(401,{message:'Invalid fictional token'});return send(200,{id:token==='a'?ids.a:token==='b'?ids.b:ids.offering,email:'fictional-'+token+'@example.com',email_confirmed_at:'2026-01-01T00:00:00Z'})}
 if(u.pathname==='/rest/v1/rpc/flowtel_current_user_is_concierge')return send(200,req.headers.authorization==='Bearer owner');
 if(u.pathname==='/rest/v1/rpc/flowtel_get_cycle_subject_snapshot'){const data=await read();const user=req.headers.authorization==='Bearer a'?ids.a:req.headers.authorization==='Bearer b'?ids.b:null;if(!user||data.p_subject_id!==user)return send(403,{message:'Consent required'});return send(200,{subject:{email:'PRIVATE-SHOULD-NOT-LEAK'},current:{cycle_day:22,inner_season:'Inner Autumn',latest_checkin_date:'2026-10-15'}})}
 if(u.pathname.startsWith('/rest/v1/flowtel_mentorship_')||u.pathname==='/rest/v1/flowtel_external_appointments'){
 if(req.headers.apikey!=='fictional-service')return send(403,{message:'Service access required'});
 const name=u.pathname==='/rest/v1/flowtel_external_appointments'?'external_appointments':u.pathname.split('flowtel_mentorship_')[1],table=tables[name];if(!table)return send(404,{});
 const matches=row=>[...u.searchParams].every(([key,value])=>{if(['select','order','limit','on_conflict'].includes(key))return true;if(value==='is.null')return row[key]==null;if(value.startsWith('eq.'))return String(row[key])===value.slice(3);if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(String(row[key]));return false});
 let rows=table.filter(matches);
 if(req.method==='PATCH'){const data=await read();rows.forEach(row=>Object.assign(row,data))}
 if(req.method==='POST'){const data=await read();rows=[];for(const item of Array.isArray(data)?data:[data]){let row=u.searchParams.get('on_conflict')?table.find(x=>x.enrollment_id===item.enrollment_id&&x.focus_month===item.focus_month):null;if(row)Object.assign(row,item);else{row={id:crypto.randomUUID(),created_at:new Date().toISOString(),...item};table.push(row)}rows.push(row)}}
 if(u.searchParams.has('limit'))rows=rows.slice(0,Number(u.searchParams.get('limit')));
 const select=u.searchParams.get('select');return send(200,rows.map(row=>!select||select==='*'?row:Object.fromEntries(select.split(',').filter(k=>k in row).map(k=>[k,row[k]]))));
 }
 if(u.pathname.startsWith('/storage/v1/object/upload/sign/'))return send(200,{url:'/upload?token=fictional-upload'});
 if(u.pathname==='/test-upload'){const data=await read();objects.set(data.path,{metadata:{size:data.size,mimetype:data.type}});return send(200,{})}
 if(u.pathname==='/storage/v1/object/list/flowtel-mentorship-replays'){const data=await read();const value=objects.get(data.prefix+'/'+data.search);return send(200,value?[{name:data.search,...value}]:[])}
 if(u.pathname.startsWith('/storage/v1/object/sign/'))return send(200,{signedURL:'/storage/v1/object/sign/fictional?token=fictional-playback'});
 if(u.pathname==='/api/caddie-acuity'){
 req.query=Object.fromEntries(u.searchParams);req.body=req.method==='POST'?await read():undefined;
 res.status=code=>{res.statusCode=code;return res};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return res};
 return await (req.query.mentorship==='owner'?owner:client)(req,res);
 }
 if(u.pathname==='/shared/supabase.js'){
 res.setHeader('Content-Type','text/javascript');return res.end(`const role=window.__fictionalRole||'a';export const supabase={auth:{getSession:async()=>({data:{session:{access_token:role}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},storage:{from:()=>({uploadToSignedUrl:async(path,token,file)=>{await fetch('/test-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,size:file.size,type:file.type})});return {error:null}}})}};`);
 }
 const root=path.resolve(__dirname,'..');let file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return send(403,{});if(u.pathname.endsWith('/'))file=path.join(file,'index.html');
 const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':'text/plain');res.end(data);
 }catch(error){res.statusCode=500;res.end(JSON.stringify({error:error.message}))}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;process.env.SUPABASE_URL=origin;process.env.SUPABASE_SERVICE_ROLE_KEY='fictional-service';
 return {origin,ids,tables,objects,async close(){await new Promise(resolve=>server.close(resolve));for(const [key,value] of [['SUPABASE_URL',old.url],['SUPABASE_SERVICE_ROLE_KEY',old.key]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}};
}
module.exports={start};
