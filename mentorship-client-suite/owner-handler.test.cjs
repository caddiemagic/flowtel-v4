const test=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const ownerHandler=require('./owner-handler.DRAFT.cjs');
function response(){
 const res={statusCode:200,headers:{}};
 res.setHeader=(k,v)=>{res.headers[k]=v;};
 res.status=n=>{res.statusCode=n;return res;};
 res.json=data=>{res.body=data;return res;};
 res.end=()=>res;
 return res;
}
test('rejects unauthenticated owner GET before touching database',async()=>{
 const res=response();
 await ownerHandler({method:'GET',headers:{}},res);
 assert.equal(res.statusCode,401);
 assert.equal(res.body.ok,false);
});
test('POST requires authentication, even for draft enrollment',async()=>{
 const res=response();
 const req=Object.assign(Readable.from([]),{method:'POST',headers:{},body:{action:'create-draft',email:'fictional@example.com',offeringId:'22222222-2222-4222-8222-222222222222'}});
 await ownerHandler(req,res);
 assert.equal(res.statusCode,401);
});
test('non-allowed methods do not execute owner actions',async()=>{
 const res=response();
 await ownerHandler({method:'DELETE',headers:{}},res);
 assert.equal(res.statusCode,405);
});
