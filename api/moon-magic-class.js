// Moon Magic 101 classroom. Separate, anonymous submissions; owner-only aggregate read.
// Service role credentials never leave this server function.
const ROOM = 'moon-magic-101-2026-10-16';
const CLOSING_TIME = Date.parse('2026-10-17T14:59:59Z'); // 7:59 am Flowtel Time next day
function json(res,status,payload){
  res.setHeader('Cache-Control','no-store, private, max-age=0');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  return res.status(status).json(payload);
}
function fail(status,message){
  const e=new Error(message); e.statusCode=status; throw e;
}
function getConfig(){
  const url=String(process.env.SUPABASE_URL||'').trim().replace(/\/$/,'');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
  if(!url||!key) fail(503,'The Moon Magic Room is not configured.');
  return {url,key};
}
function headers(key,additional={}){
  return {apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...additional};
}
async function databaseRequest(config,path,options={}){
  const response=await fetch(config.url+path,{...options,headers:{...headers(config.key),...(options.headers||{})}});
  if(!response.ok) throw new Error('Moon Magic database request failed ('+response.status+').');
  const body=await response.text();
  return body?JSON.parse(body):null;
}
async function ownerGate(req,config){
  const h=String(req.headers.authorization||'');
  const jwt=h.startsWith('Bearer ')?h.slice(7).trim():'';
  if(!jwt) fail(401,'Sign in to the Concierge Desk first.');
  const auth=await fetch(config.url+'/auth/v1/user',{
    headers:{apikey:config.key,Authorization:'Bearer '+jwt}
  });
  if(!auth.ok) fail(401,'The Concierge session has expired. Sign in again.');
  const user=await auth.json();
  if(!user.id) fail(401,'Please sign in.');
  const rows=await databaseRequest(config,'/rest/v1/profiles?select=role&id=eq.'+encodeURIComponent(user.id)+'&limit=1');
  const role=String(rows?.[0]?.role||'').toLowerCase();
  if(!['owner','admin'].includes(role)) fail(403,'This classroom projection is reserved for the Flowtel owner.');
}
function validatePayload(body){
  if(String(body.room_slug||'')!==ROOM) fail(404,'Classroom not found.');
  const token=String(body.guest_token||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token))
    fail(400,'The private classroom session could not be identified.');
  const method=String(body.tracking_method||'');
  if(!['bleed','moon-no-period','moon-unknown-day-1'].includes(method))
    fail(400,'Please complete the cycle tracker first.');
  const cycleDay=body.selected_cycle_day==null?null:Number(body.selected_cycle_day);
  if(method==='bleed'&&(!Number.isInteger(cycleDay)||cycleDay<1||cycleDay>120))
    fail(400,'Choose a valid cycle day before joining the wheel.');
  if(method!=='bleed'&&cycleDay!==null)
    fail(400,'Moon-tracking participants do not submit a personal cycle day.');
  if(body.consent!==true) fail(400,'Anonymous classroom sharing requires your permission.');
  return {room_slug:ROOM,guest_token:token.toLowerCase(),cycle_day:method==='bleed'?cycleDay:null,tracking_method:method,shared_at:new Date().toISOString()};
}
function summarize(rows){
  const counts=Array(29).fill(0);
  let moonTrackers=0;
  for(const row of rows){
    if(row.tracking_method==='bleed'&&Number.isInteger(row.cycle_day)&&row.cycle_day>0){
      counts[Math.min(row.cycle_day,28)]++;
    }else moonTrackers++;
  }
  const seasonCounts={Winter:0,Spring:0,Summer:0,Autumn:0};
  for(let day=1;day<=28;day++){
    const season=day>=27||day<=5?'Winter':day<=11?'Spring':day<=19?'Summer':'Autumn';
    seasonCounts[season]+=counts[day];
  }
  return {ok:true,room_slug:ROOM,total:rows.length,moon_trackers:moonTrackers,
    days:counts.slice(1).map((count,index)=>({day:index+1,count})),
    seasons:seasonCounts,updated_at:new Date().toISOString()};
}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method)) return json(res,405,{ok:false,error:'Method not allowed.'});
  try{
    const config=getConfig();
    if(req.method==='GET'){
      await ownerGate(req,config);
      const rows=await databaseRequest(config,
        '/rest/v1/flowtel_moon_magic_class_entries?select=cycle_day,tracking_method&room_slug=eq.'+
        encodeURIComponent(ROOM)+'&limit=500');
      return json(res,200,summarize(Array.isArray(rows)?rows:[]));
    }
    if(Date.now()>CLOSING_TIME) return json(res,410,{ok:false,error:'This classroom room is now closed.'});
    const raw=typeof req.body==='object'&&req.body!==null?req.body:JSON.parse(req.body||'{}');
    const payload=validatePayload(raw);
    await databaseRequest(config,'/rest/v1/flowtel_moon_magic_class_entries?on_conflict=room_slug,guest_token',
      {method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
    return json(res,200,{ok:true,shared:true});
  }catch(error){
    const status=Number(error.statusCode)||500;
    if(status===500) console.error('Moon Magic class API error:',error);
    return json(res,status,{ok:false,error:status===500?'The classroom could not be updated. Please try again.':error.message});
  }
};
