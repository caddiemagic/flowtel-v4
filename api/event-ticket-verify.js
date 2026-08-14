// Flowtel v0.10.85 — authenticated Squarespace ticket verification.
// A paid order grants an event entitlement and registers the signed-in attendee.

const {fetchJson,serverConfig,serviceHeaders,userHeaders}=require('../server/guest-house-server.js');
const {commerceApiKey,normalizeEmail,orderMatchForProduct}=require('../server/squarespace-commerce.js');

function normalizeUrl(value){return String(value||'').trim().replace(/\/$/,'');}
function adminHeaders(serviceKey,prefer=''){return serviceHeaders(serviceKey,prefer);}
async function currentUser(req,{supabaseUrl,serviceKey}){
  const header=String(req.headers?.authorization||'');const token=header.toLowerCase().startsWith('bearer ')?header.slice(7).trim():'';
  if(!token){const e=new Error('Sign in before checking your event ticket.');e.statusCode=401;throw e;}
  const user=await fetchJson(`${supabaseUrl}/auth/v1/user`,{method:'GET',headers:userHeaders(serviceKey,token)});
  if(!user?.id||!user?.email){const e=new Error('Your Flowtel session could not be verified.');e.statusCode=401;throw e;}
  return user;
}
async function upsertEntitlement({supabaseUrl,serviceKey,eventId,userId,email,order,line,productId}){
  const amount=Number(line?.unitPricePaid?.value||0)*Math.max(1,Number(line?.quantity||1));const now=new Date().toISOString();
  const payload={event_id:eventId,member_id:userId,buyer_email:email,source:'squarespace',source_order_id:String(order.id),source_product_id:String(productId),payment_state:'PAID',paid_amount:Number.isFinite(amount)?amount:null,currency:line?.unitPricePaid?.currency||order?.grandTotal?.currency||'USD',verified_at:now,revoked_at:null,raw_context:{order_number:order.orderNumber||null,testmode:Boolean(order.testmode),line_item_id:line?.id||null},updated_at:now};
  await fetchJson(`${supabaseUrl}/rest/v1/flowtel_queendom_event_entitlements?on_conflict=event_id,source_order_id,source_product_id`,{method:'POST',headers:adminHeaders(serviceKey,'resolution=merge-duplicates,return=minimal'),body:JSON.stringify(payload)});
  await fetchJson(`${supabaseUrl}/rest/v1/flowtel_queendom_event_registrations?on_conflict=event_id,member_id`,{method:'POST',headers:adminHeaders(serviceKey,'resolution=merge-duplicates,return=minimal'),body:JSON.stringify({event_id:eventId,member_id:userId,registered_at:now,cancelled_at:null,updated_at:now})});
}

async function revokeEntitlement({supabaseUrl,serviceKey,eventId,userId,email,paymentState='REFUNDED'}){
  const now=new Date().toISOString();
  await fetchJson(`${supabaseUrl}/rest/v1/flowtel_queendom_event_entitlements?event_id=eq.${encodeURIComponent(eventId)}&revoked_at=is.null&or=(member_id.eq.${encodeURIComponent(userId)},buyer_email.eq.${encodeURIComponent(email)})`,{method:'PATCH',headers:adminHeaders(serviceKey,'return=minimal'),body:JSON.stringify({payment_state:paymentState,revoked_at:now,updated_at:now})});
  await fetchJson(`${supabaseUrl}/rest/v1/flowtel_queendom_event_registrations?event_id=eq.${encodeURIComponent(eventId)}&member_id=eq.${encodeURIComponent(userId)}&cancelled_at=is.null`,{method:'PATCH',headers:adminHeaders(serviceKey,'return=minimal'),body:JSON.stringify({cancelled_at:now,updated_at:now})});
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, private, max-age=0');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Use POST to verify an event ticket.'});
  try{
    const supabaseUrl=normalizeUrl(process.env.SUPABASE_URL),serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,apiKey=commerceApiKey();
    if(!supabaseUrl||!serviceKey)throw new Error('Flowtel server access is not configured.');
    if(!apiKey){const e=new Error('Squarespace ticket verification is not configured yet. Add SQUARESPACE_COMMERCE_API_KEY in Vercel.');e.statusCode=503;throw e;}
    const body=typeof req.body==='object'?req.body:JSON.parse(req.body||'{}');const eventId=String(body.event_id||'').trim();
    if(!eventId){const e=new Error('Choose an event first.');e.statusCode=400;throw e;}
    const user=await currentUser(req,{supabaseUrl,serviceKey});const email=normalizeEmail(user.email);
    const events=await fetchJson(`${supabaseUrl}/rest/v1/flowtel_queendom_events?select=id,title,status,squarespace_product_id&id=eq.${encodeURIComponent(eventId)}&limit=1`,{headers:adminHeaders(serviceKey)});
    const event=Array.isArray(events)?events[0]:null;
    if(!event||event.status!=='published'){const e=new Error('That event is not currently available.');e.statusCode=404;throw e;}
    if(!event.squarespace_product_id){const e=new Error('This event does not have a Squarespace ticket product mapped yet.');e.statusCode=409;throw e;}
    const match=await orderMatchForProduct(email,event.squarespace_product_id,apiKey);
    if(!match.contact){const e=new Error('Flowtel could not find a Squarespace customer with this email yet. Use the same email you used at checkout.');e.statusCode=404;throw e;}
    if(match.order?.paymentState==='REFUNDED'){await revokeEntitlement({supabaseUrl,serviceKey,eventId,userId:user.id,email,paymentState:'REFUNDED'});return res.status(200).json({ok:true,paid:false,revoked:true,event_id:eventId,message:'This ticket has been refunded, so the private event room is no longer open.'});}
    if(match.order?.paymentState!=='PAID')return res.status(200).json({ok:true,paid:false,event_id:eventId,payment_state:match.order?.paymentState||null,message:'A paid ticket has not appeared for this email yet. If you just checked out, wait a moment and check again.'});
    await upsertEntitlement({supabaseUrl,serviceKey,eventId,userId:user.id,email,order:match.order,line:match.line,productId:event.squarespace_product_id});
    return res.status(200).json({ok:true,paid:true,registered:true,event_id:eventId,order_id:match.order.id,message:'Your ticket is confirmed. Your event room is open.'});
  }catch(error){return res.status(Number(error.statusCode)||500).json({ok:false,error:error.message||'Flowtel could not verify that ticket.'});}
};
