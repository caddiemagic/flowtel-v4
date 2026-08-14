import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const commerce=require('../server/squarespace-commerce.js');
const bridgeHandler=require('../api/squarespace-bridge.js');

const originalFetch=global.fetch;
const originalEnv={...process.env};
function responseHarness(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[name]=value;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;},end(){return this;}};}
try{
  const calls=[];
  global.fetch=async(url,options={})=>{
    calls.push(String(url));
    if(String(url).includes('/v1/contacts/query')) return new Response(JSON.stringify({contacts:[{id:'contact-1',primaryEmail:{email:'MOVIE@EXAMPLE.COM'}}]}),{status:200,headers:{'content-type':'application/json'}});
    if(String(url).includes('/1.0/commerce/orders')) return new Response(JSON.stringify({result:[
      {id:'old',modifiedOn:'2026-08-01T12:00:00Z',paymentState:'PAID',lineItems:[{id:'line-old',productId:'other'}]},
      {id:'movie',modifiedOn:'2026-08-10T12:00:00Z',paymentState:'PAID',lineItems:[{id:'line-1',productId:'movie-night',quantity:1,unitPricePaid:{value:'111.00',currency:'USD'}}]},
    ],pagination:{}}),{status:200,headers:{'content-type':'application/json'}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  const match=await commerce.orderMatchForProduct('movie@example.com','movie-night','key');
  assert.equal(match.contact.id,'contact-1');
  assert.equal(match.order.id,'movie');
  assert.equal(match.order.paymentState,'PAID');
  assert.equal(match.line.productId,'movie-night');
  assert.ok(calls.some(url=>url.includes('customerId=contact-1')));

  global.fetch=async(url)=>{
    if(String(url).includes('/v1/contacts/query')) return new Response(JSON.stringify({contacts:[{id:'contact-2',primaryEmail:{email:'movie@example.com'}}]}),{status:200,headers:{'content-type':'application/json'}});
    if(String(url).includes('/1.0/commerce/orders')) return new Response(JSON.stringify({result:[{id:'refund',modifiedOn:'2026-08-12T12:00:00Z',paymentState:'REFUNDED',lineItems:[{productId:'movie-night'}]}],pagination:{}}),{status:200,headers:{'content-type':'application/json'}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  const refunded=await commerce.orderMatchForProduct('movie@example.com','movie-night','key');
  assert.equal(refunded.order.paymentState,'REFUNDED');
  const paidOnly=await commerce.paidOrderForProduct('movie@example.com','movie-night','key');
  assert.equal(paidOnly.order,null);



  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='service-key';
  process.env.SQUARESPACE_COMMERCE_API_KEY='commerce-key';
  process.env.SQUARESPACE_QUEENDOM_PRODUCT_IDS='queendom-product';
  process.env.SQUARESPACE_FLOWFM_PRODUCT_IDS='flowfm-product';
  process.env.SQUARESPACE_COUNCIL_PRODUCT_IDS='';
  global.fetch=async(url,options={})=>{
    const value=String(url);
    if(value.includes('/v1/contacts/query')) return new Response(JSON.stringify({contacts:[{id:'member-contact',primaryEmail:{email:'newmember@example.com'},firstName:'New',lastName:'Member'}]}),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/rest/v1/profiles?select=')) return new Response(JSON.stringify([]),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/1.0/commerce/orders?customerId=member-contact')) return new Response(JSON.stringify({result:[{id:'membership-order',modifiedOn:'2026-08-13T12:00:00Z',paymentState:'PAID',lineItems:[{productId:'flowfm-product'}]}],pagination:{}}),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/rest/v1/flowtel_member_signup_admissions?on_conflict=email')){
      const payload=JSON.parse(options.body||'{}');
      assert.equal(payload.email,'newmember@example.com');
      assert.equal(payload.membership_type,'flowfm');
      assert.equal(payload.membership_rank,2);
      assert.equal(payload.source_order_id,'membership-order');
      assert.equal(options.method,'POST');
      return new Response('',{status:201});
    }
    throw new Error(`Unexpected bridge fetch ${value} ${options.method||'GET'}`);
  };
  const memberRes=responseHarness();
  await bridgeHandler({method:'POST',body:{email:'newmember@example.com',intent:'signup',trustedDoorway:false}},memberRes);
  assert.equal(memberRes.statusCode,200);
  assert.equal(memberRes.body.membershipType,'flowfm');
  assert.equal(memberRes.body.bridgeMode,'squarespace-paid-membership');

  // Existing canonical Flowtel members may create their private Auth account even
  // when an older Squarespace Contacts record is missing. The server still writes
  // a short-lived admission, and the browser cannot invent that admission itself.
  global.fetch=async(url,options={})=>{
    const value=String(url);
    if(value.includes('/rest/v1/profiles?select=')) return new Response(JSON.stringify([{id:'existing-id',email:'existing@example.com',role:'client',first_name:'Existing',last_name:'Member',membership_type:'queendom',membership_rank:1}]),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/v1/contacts/query')) return new Response(JSON.stringify({contacts:[]}),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/rest/v1/flowtel_member_signup_admissions?on_conflict=email')){
      const payload=JSON.parse(options.body||'{}');
      assert.equal(payload.email,'existing@example.com');
      assert.equal(payload.membership_type,'queendom');
      assert.equal(payload.source,'existing-flowtel-membership');
      return new Response('',{status:201});
    }
    throw new Error(`Unexpected existing-member fetch ${value}`);
  };
  const existingRes=responseHarness();
  await bridgeHandler({method:'POST',body:{email:'existing@example.com',intent:'signup',trustedDoorway:false}},existingRes);
  assert.equal(existingRes.statusCode,200);
  assert.equal(existingRes.body.membershipType,'queendom');
  assert.equal(existingRes.body.bridgeMode,'existing-flowtel-membership');
  assert.equal(existingRes.body.contact.firstName,'Existing');

  global.fetch=async(url)=>{
    const value=String(url);
    if(value.includes('/v1/contacts/query')) return new Response(JSON.stringify({contacts:[{id:'contact-only',primaryEmail:{email:'contactonly@example.com'}}]}),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/rest/v1/profiles?select=')) return new Response(JSON.stringify([]),{status:200,headers:{'content-type':'application/json'}});
    if(value.includes('/1.0/commerce/orders?customerId=contact-only')) return new Response(JSON.stringify({result:[],pagination:{}}),{status:200,headers:{'content-type':'application/json'}});
    throw new Error(`Unexpected contact-only fetch ${value}`);
  };
  const deniedRes=responseHarness();
  await bridgeHandler({method:'POST',body:{email:'contactonly@example.com',intent:'signup',trustedDoorway:false}},deniedRes);
  assert.equal(deniedRes.statusCode,403);
  assert.match(deniedRes.body.error,/could not verify an active Queendom or Flow FM membership purchase/i);

  console.log('Flowtel v0.10.85 event access behavior tests passed.');
}finally{global.fetch=originalFetch;for(const key of Object.keys(process.env)){if(!(key in originalEnv))delete process.env[key];}for(const [key,value] of Object.entries(originalEnv))process.env[key]=value;}
