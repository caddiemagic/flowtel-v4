import test from 'node:test';import assert from 'node:assert/strict';import {mountMentorshipEntry} from './suite-entry.mjs';
function fixture(fetcher){let callback;let session={user:{id:'fictional-a'},access_token:'fictional-token'};const classes=new Set(['hidden']);const element={hidden:true,classList:{add:c=>classes.add(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)}};const events=new EventTarget();const supabase={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}}}}};const control=mountMentorshipEntry({supabase,element,fetcher,events});return {control,element,events,signOut(){session=null;callback('SIGNED_OUT');}};}
const response=body=>({ok:true,json:async()=>({ok:true,...body})});
test('only linked eligible or verified prepared mentorships reveal the doorway',async()=>{
 for(const status of ['active','paused','completed','invited','draft','archived','cancelled']){const f=fixture(async url=>response(url.includes('prepared=1')?{prepared:[]}:{enrollments:[{id:'fictional',status}]}));await f.control.refresh();assert.equal(f.element.hidden,['draft','archived','cancelled'].includes(status));f.control.dispose();}
 const f=fixture(async url=>response(url.includes('prepared=1')?{prepared:[{id:'fictional-prepared'}]}:{enrollments:[]}));await f.control.refresh();assert.equal(f.element.hidden,false);f.control.dispose();
});
test('non-clients, network failures, malformed payloads and unauthorized responses stay hidden',async()=>{
 for(const fetcher of [async()=>response({enrollments:[],prepared:[]}),async()=>{throw Error('offline')},async()=>({ok:false}),async()=>response({enrollments:{id:'bad'},prepared:null})]){const f=fixture(fetcher);await f.control.refresh();assert.equal(f.element.hidden,true);f.control.dispose();}
});
test('sign-out hides immediately and ignores an earlier account response',async()=>{
 let release;const pending=new Promise(r=>release=r);const f=fixture(async()=>{await pending;return response({enrollments:[{id:'fictional',status:'active'}]});});const refresh=f.control.refresh();await Promise.resolve();f.signOut();assert.equal(f.element.hidden,true);release();await refresh;assert.equal(f.element.hidden,true);f.control.dispose();
});
test('rechecking archived eligibility hides a previously visible doorway and sends only bearer auth',async()=>{
 let eligible=true;const requests=[];const f=fixture(async(url,options)=>{requests.push(options);return response({enrollments:eligible?[{id:'fictional',status:'active'}]:[],prepared:[]});});await f.control.refresh();assert.equal(f.element.hidden,false);eligible=false;await f.control.refresh();assert.equal(f.element.hidden,true);assert.equal(requests[0].headers.Authorization,'Bearer fictional-token');assert.equal(requests[0].cache,'no-store');f.control.dispose();
});
