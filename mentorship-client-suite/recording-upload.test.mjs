import test from 'node:test';import assert from 'node:assert/strict';
import {recordingType,recordingUpload} from './recording-upload.mjs';
const file={name:'fictional.mp3',type:'audio/mpeg',size:100};
test('recording validation rejects invalid files before authorization and supports missing browser MIME',async()=>{
 assert.equal(recordingType({...file,type:''}),'audio/mpeg');assert.equal(recordingType({...file,name:'VOICE.M4A',type:''}),'audio/mp4');
 for(const input of [null,{...file,type:'text/html'},{...file,size:0},{...file,size:524288001}])assert.throws(()=>recordingType(input));
 let calls=0;const workflow=recordingUpload({authorize:()=>calls++});await assert.rejects(workflow.save(file,''));await assert.rejects(workflow.save({...file,size:0},'Fictional'));assert.equal(calls,0);
});
test('failed finalization retries saved details without reauthorizing or transferring file',async()=>{
 let authorizations=0,transfers=0,saves=0;const stages=[];
 const workflow=recordingUpload({authorize:async()=>{authorizations++;return {path:'private-fictional-path'};},transfer:async()=>{transfers++;},finalize:async args=>{saves++;assert.equal(args.path,'private-fictional-path');if(saves===1)throw Error('Lost response');return {id:'saved'};},onStage:stage=>stages.push(stage)});
 await assert.rejects(workflow.save(file,'Fictional'));assert.equal(workflow.uploaded,true);
 assert.deepEqual(await workflow.save(file,'Fictional'),{id:'saved'});assert.equal(workflow.uploaded,false);assert.equal(authorizations,1);assert.equal(transfers,1);assert.equal(saves,2);assert.deepEqual(stages,['authorizing','uploading','saving','saving','complete']);
});
test('transfer failure requires a new authorization and never finalizes unconfirmed bytes',async()=>{
 let transfers=0,authorizations=0,saves=0;const workflow=recordingUpload({authorize:async()=>({path:String(++authorizations)}),transfer:async()=>{if(++transfers===1)throw Error('Transfer interrupted');},finalize:async()=>saves++});
 await assert.rejects(workflow.save(file,'Fictional'));assert.equal(workflow.uploaded,false);assert.equal(saves,0);await workflow.save(file,'Fictional');assert.equal(authorizations,2);assert.equal(saves,1);
});
test('duplicate clicks cannot run overlapping transfers',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let transfers=0;
 const workflow=recordingUpload({authorize:async()=>{await gate;return {path:'test'};},transfer:async()=>{transfers++;},finalize:async()=>({})});const first=workflow.save(file,'Fictional');await assert.rejects(workflow.save(file,'Fictional'),/already/);release();await first;assert.equal(transfers,1);
});
