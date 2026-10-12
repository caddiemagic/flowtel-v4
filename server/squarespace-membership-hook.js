const crypto=require('crypto');
const {serverConfig,serviceHeaders,fetchJson,publicOrigin}=require('./guest-house-server.js');
const commerce=require('./squarespace-commerce.js');
function verify(raw,signature,secret){if(!/^[a-f0-9]{32,}$/i.test(String(secret||''))||!(/^[a-f0-9]{64}$/i.test(String(signature||''))))return false;const expected=crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(raw).digest();const got=Buffer.from(signature,'hex');return got.length===expected.length&&crypto.timingSafeEqual(got,expected);}
async function handle(req,res,{provisionFlowtel}){
 try{
  const chunks=[];let size=0;if(req.rawBody)chunks.push(Buffer.from(req.rawBody));else if(typeof req[Symbol.asyncIterator]==='function'){for await(const c of req){size+=c.length;if(size>65536)throw Error('Payload too large');chunks.push(Buffer.from(c));}}else if(typeof req.body==='string')chunks.push(Buffer.from(req.body));else throw Error('Raw webhook payload unavailable');
  const raw=Buffer.concat(chunks).toString('utf8');if(!verify(raw,req.headers['squarespace-signature'],process.env.SQUARESPACE_MEMBERSHIP_WEBHOOK_SECRET))return res.status(401).json({ok:false,error:'Invalid webhook signature.'});
  const event=JSON.parse(raw);if(process.env.SQUARESPACE_WEBSITE_ID&&event.websiteId!==process.env.SQUARESPACE_WEBSITE_ID)return res.status(403).json({ok:false,error:'Wrong website.'});
  if(!['order.create','order.update'].includes(event.topic))return res.status(200).json({ok:true,ignored:true});const orderId=String(event.data?.orderId||'');if(!orderId||!event.id)throw Error('Missing order identity');
  const context=serverConfig(),base=context.supabaseUrl+'/rest/v1/flowtel_membership_webhook_events',query=`?event_id=eq.${encodeURIComponent(event.id)}`;
  await fetchJson(base,{method:'POST',headers:serviceHeaders(context.serviceKey,'resolution=ignore-duplicates,return=minimal'),body:JSON.stringify({event_id:event.id,order_id:orderId})});const stored=await fetchJson(base+query+'&select=processed_at&limit=1',{headers:serviceHeaders(context.serviceKey)});if(stored[0]?.processed_at)return res.status(200).json({ok:true,duplicate:true});
  const order=await commerce.jsonFetch(`${commerce.API_BASE}/1.0/commerce/orders/${encodeURIComponent(orderId)}`,{headers:commerce.headers(commerce.commerceApiKey())});const email=commerce.normalizeEmail(order.customerEmail);const kingdom=require('./kingdom-membership.js'),settings=kingdom.config(),isKingdom=settings.productIds.some(id=>commerce.lineForProduct(order,id));
  if(isKingdom&&order.paymentState==='REFUNDED'){const rows=await fetchJson(`${context.supabaseUrl}/rest/v1/caddie_magic_membership_orders?order_id=eq.${encodeURIComponent(orderId)}&select=user_id`,{headers:serviceHeaders(context.serviceKey)});for(const row of rows)await fetchJson(context.supabaseUrl+'/rest/v1/rpc/caddie_magic_revoke_refunded_membership',{method:'POST',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({p_user_id:row.user_id,p_order_id:orderId})});}
  else if(order.paymentState==='PAID'&&isKingdom){await kingdom.claim({headers:{host:new URL(publicOrigin()).host,origin:publicOrigin()}},{email}, {verifiedOrderId:orderId});}
  else if(order.paymentState==='PAID'){const womenIds=String([process.env.SQUARESPACE_QUEENDOM_PRODUCT_IDS,process.env.SQUARESPACE_FLOWFM_PRODUCT_IDS,process.env.SQUARESPACE_COUNCIL_PRODUCT_IDS].filter(Boolean).join(',')).split(/[\s,]+/);if(womenIds.some(id=>id&&commerce.lineForProduct(order,id)))await provisionFlowtel({email,source:'verified-purchase-webhook'});}
  await fetchJson(base+query,{method:'PATCH',headers:serviceHeaders(context.serviceKey),body:JSON.stringify({processed_at:new Date().toISOString()})});return res.status(200).json({ok:true});
 }catch(error){console.error('Verified membership webhook could not complete.');return res.status(503).json({ok:false,error:'Membership notification could not be processed. Retry later.'});}
}
module.exports={verify,handle};
