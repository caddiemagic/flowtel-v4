import assert from 'node:assert/strict';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
const source=await readFile('api/caddie-acuity.js','utf8');let calls=[];
const server={serviceHeaders:()=>({}),readRequestBody:async req=>req.body,setPublicCors(){},sendAcuityError(){throw Error('Unexpected fallback')},flowtelPublicOrigin:()=>''};
const sandbox={module:{exports:null},require(name){if(name==='crypto')return crypto;if(name.includes('acuity-server'))return server;if(name.includes('guest-house-server'))return {serverConfig:()=>({supabaseUrl:'https://example.invalid',serviceKey:'test-key'}),fetchJson:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return 'ok';}};throw Error(name);},URL,console};
vm.runInNewContext(source,sandbox);
async function submit(body,origin='https://flowtel.test'){let result;const res={status(code){this.code=code;return this;},json(data){result={code:this.code,data};return this;},setHeader(){}};await sandbox.module.exports({method:'POST',headers:{host:'flowtel.test',origin},body},res);return result;}
const body={action:'public-compass-submit',submission_id:crypto.randomUUID(),name:'Ryan',email:'ryan@example.com',clubs:['Driver','7 Iron','56° Wedge','5 Wood'],consent:true};
assert.equal((await submit(body)).code,200);assert.equal(calls.length,1);assert.equal(calls[0].body.p_clubs[2],'56° Wedge');assert.equal(calls[0].body.p_ip_hash.length,64);
for(const change of [{consent:false},{clubs:['Putter','7 Iron','Wedge','Driver']},{website:'bot'},{email:'bad'},{clubs:['Driver','driver','7 Iron','5 Wood']}])assert.notEqual((await submit({...body,...change})).code,200);
assert.equal((await submit(body,'https://other.test')).code,403);assert.equal(calls.length,1);
const sql=await readFile('database/migration-082-cardinal-compass-consecration.sql','utf8');assert(sql.includes('enable row level security'));assert(sql.includes('to service_role'));assert(sql.includes('pg_advisory_xact_lock'));assert(sql.includes("v_count>=8"));assert(sql.includes('auth.uid() is null'));assert(sql.includes('consent_version'));
console.log('Public submit handler: accepted valid NEWS payload; rejected missing consent, putter, duplicate clubs, honeypot, bad email and foreign origin; only valid request reached RPC. SQL access safeguards inspected; database not executed.');
