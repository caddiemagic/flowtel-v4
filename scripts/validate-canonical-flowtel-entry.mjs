import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(file)=>readFile(file,'utf8');
const vercel=JSON.parse(await read('vercel.json'));
const enter=await read('enter/index.html');
const beta=await read('beta-request/index.html');
const moon=await read('moon-widget/index.html');
const profile=await read('profile/index.html');
const client=await read('client/index.html');

const redirects=vercel.redirects||[];
for(const source of ['/enter','/beta-request']){
  const rule=redirects.find(row=>row.source===source);
  assert.ok(rule,`${source} canonical redirect is missing.`);
  assert.equal(rule.destination,'/client/');
  assert.equal(rule.permanent,false);
}

for(const [name,html] of [['enter',enter],['beta-request',beta]]){
  assert.ok(html.includes('flowtel-canonical-entry'),`${name} static fallback marker is missing.`);
  assert.ok(html.includes('window.location.replace("/client/")'),`${name} static fallback redirect is missing.`);
}

assert.ok(moon.includes('href="/client/"'),'Moon widget must enter through /client/.');
assert.ok(profile.includes('href="/client/"'),'Profile unauthenticated doorway must enter through /client/.');

for(const token of ['id="signInButton"','id="forgotPasswordButton"','id="showNewAccountButton"']){
  assert.ok(client.includes(token),`Canonical client doorway is missing ${token}.`);
}

console.log('Flowtel v0.10.85.1 canonical entry validator passed.');
