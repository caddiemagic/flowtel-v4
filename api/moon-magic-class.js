// Moon Magic 101 classroom guest check-in: public write, owner-only reads.
// Does not create authentication accounts or grant any Queendom/Flowtel product access.
const ROOM='moon-magic-101-2026-10-16';
const CLOSE_AT=Date.parse('2026-10-17T14:59:59Z'); // End of workshop night in Flowtel Time.
function respond(res,status,data){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  return res.status(status).json(data);
}
function fail(code,message){const e=new Error(message);e.statusCode=code;throw e;}
function config(){
  const url=String(process.env.SUPABASE_URL||'').trim().replace(/\/$/,'');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
  if(!url||!key)fail(503,'The classroom is not yet configured.');
  return {url,key};
}
function headers(key,extra={}){
  return {apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...extra};
}
async function queryDB(c,path,options={}){
  const response=await fetch(c.url+path,{...options,headers:{...headers(c.key),...options.headers}});
  if(!response.ok){
    console.error('Moon classroom database error',response.status,(await response.text()).slice(0,250));
    fail(503,'The classroom could not save right now. Please try again.');
  }
  const raw=await response.text();
  return raw?JSON.parse(raw):null;
}
async function requireOwner(req,c){
  const authHeader=String(req.headers?.authorization||'');
  const jwt=authHeader.toLowerCase().startsWith('bearer ')?authHeader.slice(7).trim():'';
  if(!jwt)fail(401,'Please sign in to your Concierge Desk.');
  const auth=await fetch(c.url+'/auth/v1/user',{headers:{apikey:c.key,Authorization:'Bearer '+jwt}});
  if(!auth.ok)fail(401,'Your Flowtel session has expired.');
  const user=await auth.json();
  if(!user?.id)fail(401,'Please sign in to Flowtel.');
  const access=await queryDB(c,'/rest/v1/profiles?select=role&id=eq.'+encodeURIComponent(user.id)+'&limit=1');
  if(!['owner','admin'].includes(String(access?.[0]?.role||'').toLowerCase()))fail(403,'Only the Flowtel owner can view this classroom.');
}
function cleanString(value,max){
  return typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,max):'';
}
function validate(body){
  if(String(body.room_slug)!==ROOM)fail(404,'Classroom not found.');
  if(body.website)fail(400,'Unable to complete check-in.');
  const guestToken=String(body.guest_token||'').toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(guestToken))
    fail(400,'Please reload the page to create your personal classroom key.');
  const name=cleanString(body.guest_name,100);
  if(!name||name.length<2)fail(400,'Please enter your name.');
  const method='bleed'; // One cycle-day field; no email or account collected.
  const day=body.selected_cycle_day===null||body.selected_cycle_day===undefined||body.selected_cycle_day===''?null:Number(body.selected_cycle_day);
  if(!Number.isInteger(day)||day<1||day>120)fail(400,'Enter a cycle day between 1 and 120.');
  return {room_slug:ROOM,guest_token:guestToken,guest_name:name,email:null,
    cycle_day:day,tracking_method:method,
    show_first_name:true,email_updates_opt_in:false,
    shared_at:new Date().toISOString()};
}
function seasonFor(day){
  return day>=27||day<=5?'Winter':day<=11?'Spring':day<=19?'Summer':'Autumn';
}
function summarize(rows){
  const days=Array.from({length:28},(_,i)=>({day:i+1,count:0,names:[]}));
  const seasons={Winter:0,Spring:0,Summer:0,Autumn:0};
  const seasonNames={Winter:[],Spring:[],Summer:[],Autumn:[]};
  let moonTrackers=0;
  const moonTrackerNames=[];
  for(const row of rows){
    const day=Number(row.cycle_day);
    const valid=row.tracking_method==='bleed'&&Number.isInteger(day)&&day>0;
    const firstName=row.show_first_name===true?String(row.guest_name||'').trim().split(/\s+/)[0].slice(0,35):'';
    if(valid){
      const index=Math.min(day,28)-1,season=seasonFor(day);
      days[index].count++;seasons[season]++;
      if(firstName){days[index].names.push(firstName);seasonNames[season].push(firstName);}
    }else{
      moonTrackers++;
      if(firstName)moonTrackerNames.push(firstName);
    }
  }
  return {ok:true,room_slug:ROOM,total:rows.length,moon_trackers:moonTrackers,
    moon_tracker_names:moonTrackerNames,days,seasons,season_names:seasonNames,updated_at:new Date().toISOString()};
}
module.exports=async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return respond(res,405,{ok:false,error:'Method not allowed.'});
  try{
    const c=config();
    if(req.method==='GET'){
      await requireOwner(req,c);
      const rows=await queryDB(c,'/rest/v1/flowtel_moon_magic_class_entries?select=guest_name,show_first_name,cycle_day,tracking_method,shared_at&room_slug=eq.'+encodeURIComponent(ROOM)+'&order=shared_at.asc&limit=500');
      if(String(req.query?.view||'')==='contacts'){
        return respond(res,200,{ok:true,guests:rows.map(row=>({
          name:row.guest_name||'(no name)',cycle_day:row.cycle_day,
          joined_at:row.shared_at
        }))});
      }
      return respond(res,200,summarize(rows));
    }
    if(Date.now()>CLOSE_AT)fail(410,'The Moon Magic 101 classroom is now closed.');
    const length=Number(req.headers?.['content-length']||0);
    if(length>4096)fail(413,'Submission is too large.');
    const raw=typeof req.body==='object'&&req.body!==null?req.body:JSON.parse(req.body||'{}');
    const payload=validate(raw);
    await queryDB(c,'/rest/v1/flowtel_moon_magic_class_entries?on_conflict=room_slug,guest_token',
      {method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
    return respond(res,200,{ok:true,joined:true,
      day:payload.cycle_day,tracking_method:payload.tracking_method});
  }catch(e){
    const status=Number(e.statusCode)||500;
    if(status>=500)console.error('Moon classroom error',e.message);
    return respond(res,status,{ok:false,error:status===500?'The classroom could not save. Please try again.':e.message});
  }
};
