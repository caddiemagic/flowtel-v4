// Flowtel v0.10.85 — server-only Squarespace Commerce helpers.
// Keeps Commerce credentials out of browser code and centralizes exact-email + order matching.

const API_BASE='https://api.squarespace.com';

function safeJson(value){try{return JSON.parse(value);}catch{return null;}}
function normalizeEmail(value){return String(value||'').trim().toLowerCase();}
function commerceApiKey(){return String(process.env.SQUARESPACE_COMMERCE_API_KEY||process.env.SQUARESPACE_API_KEY||'').trim();}
function headers(apiKey){return{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','User-Agent':'Flowtel Event Access/0.10.85'};}
async function jsonFetch(url,options={}){const response=await fetch(url,options);const text=await response.text();const data=safeJson(text);if(!response.ok){const error=new Error(data?.message||data?.error||text||`Squarespace request failed with ${response.status}.`);error.statusCode=response.status;throw error;}return data??{};}
function contactEmail(contact){return normalizeEmail(contact?.primaryEmail?.email||contact?.email||'');}
async function exactContact(email,apiKey=commerceApiKey()){
  const normalized=normalizeEmail(email);if(!normalized||!apiKey)return null;
  const data=await jsonFetch(`${API_BASE}/v1/contacts/query`,{method:'POST',headers:headers(apiKey),body:JSON.stringify({searchString:normalized,pageSize:10,sortField:'EMAIL',sortDirection:'ASCENDING'})});
  return (Array.isArray(data?.contacts)?data.contacts:[]).find(row=>contactEmail(row)===normalized)||null;
}
async function customerOrders(customerId,apiKey=commerceApiKey(),paymentState=''){
  if(!customerId||!apiKey)return[];
  const rows=[];const state=String(paymentState||'').trim();let next=`${API_BASE}/1.0/commerce/orders?customerId=${encodeURIComponent(customerId)}${state?`&paymentStates=${encodeURIComponent(state)}`:''}`;
  for(let page=0;next&&page<20;page+=1){const data=await jsonFetch(next,{method:'GET',headers:headers(apiKey)});rows.push(...(Array.isArray(data?.result)?data.result:[]));const candidate=String(data?.pagination?.nextPageUrl||'').trim();next=candidate?(candidate.startsWith('http')?candidate:`${API_BASE}${candidate.startsWith('/')?'':'/'}${candidate}`):'';}
  return rows;
}
function lineForProduct(order,productId){const wanted=String(productId||'').trim();return (Array.isArray(order?.lineItems)?order.lineItems:[]).find(line=>String(line?.productId||'').trim()===wanted)||null;}
function newestOrder(rows=[]){return [...rows].sort((a,b)=>new Date(b?.modifiedOn||b?.createdOn||0).getTime()-new Date(a?.modifiedOn||a?.createdOn||0).getTime())[0]||null;}
async function orderMatchForProduct(email,productId,apiKey=commerceApiKey()){
  const contact=await exactContact(email,apiKey);if(!contact)return{contact:null,order:null,line:null};
  const orders=await customerOrders(contact.id,apiKey);const matches=orders.filter(order=>lineForProduct(order,productId));const order=newestOrder(matches);return{contact,order,line:order?lineForProduct(order,productId):null};
}
async function paidOrderForProduct(email,productId,apiKey=commerceApiKey()){
  const match=await orderMatchForProduct(email,productId,apiKey);return match.order?.paymentState==='PAID'?match:{...match,order:null,line:null};
}

module.exports={API_BASE,commerceApiKey,customerOrders,exactContact,headers,jsonFetch,lineForProduct,normalizeEmail,orderMatchForProduct,paidOrderForProduct};
