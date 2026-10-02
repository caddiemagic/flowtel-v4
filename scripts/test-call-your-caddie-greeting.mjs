import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const nodes = new Map();
function node(id) {
 if(nodes.has(id)) return nodes.get(id);
 const classes=new Set(id==='greetingPlayback'?['hidden']:[]);
 const listeners={};
 const n={id,paused:true,ended:false,currentTime:0,disabled:false,textContent:'',
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
 addEventListener:(event,fn)=>(listeners[event]??=[]).push(fn),
 emit:async event=>{for(const fn of listeners[event]||[])await fn({preventDefault(){}})},
 play:async()=>{n.paused=false;await n.emit('play');if(!n.paused)await n.emit('playing');},
 pause:()=>{if(!n.paused){n.paused=true;void n.emit('pause');}},
 scrollIntoView:()=>{n.scrolled=true;},focus:()=>{n.focused=true;}};
 nodes.set(id,n);return n;
}
vm.runInNewContext(await readFile('caddie-magic/call-your-caddie/greeting.js','utf8'),{
 document:{getElementById:node},window:{matchMedia:()=>({matches:true}),addEventListener(){}}});
const a=node('greetingAudio'),b=node('callCaddieButton'),s=node('greetingStatus');
assert(a.paused,'Greeting must wait for user action');
await b.emit('click');assert.equal(s.textContent,'YOUR CADDIE IS ON THE LINE');
assert(!node('greetingPlayback').classList.contains('hidden'));
await b.emit('click');assert(a.paused);assert.equal(b.textContent,'Resume the Call');
await b.emit('click');assert(!a.paused);
a.ended=true;a.paused=true;await a.emit('ended');
assert(node('leave-message').focused);assert.equal(b.textContent,'Call Again');
node('recorderPanel').classList.add('is-recording');await b.emit('click');assert(a.paused);
a.paused=false;await a.emit('play');assert(a.paused,'Native controls must not play into recording');
node('recorderPanel').classList.remove('is-recording');
a.play=()=>Promise.reject(Error('blocked'));await b.emit('click');
assert.equal(b.textContent,'Try Calling Again');assert(!b.disabled);
await node('skipGreeting').emit('click');assert(node('leave-message').scrolled);
console.log('Greeting behavior passed: deliberate playback, pause/resume, completion/focus, recording guard, native control guard, failure/retry, skip.');
