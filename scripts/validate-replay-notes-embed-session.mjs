import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read=(path)=>readFile(path,'utf8');
const files={
  replayHtml:await read('replay-notes/index.html'),
  replayJs:await read('replay-notes/app.js'),
  replayCss:await read('replay-notes/styles.css'),
  connectHtml:await read('replay-notes/connect/index.html'),
  connectJs:await read('replay-notes/connect/app.js'),
  connectCss:await read('replay-notes/connect/styles.css'),
  vercel:JSON.parse(await read('vercel.json')),
};

function ids(html){return [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);}
function uniqueIds(name,html){
  const found=ids(html);
  const duplicates=[...new Set(found.filter((id,index)=>found.indexOf(id)!==index))];
  assert.deepEqual(duplicates,[],`${name} duplicate ids: ${duplicates.join(', ')}`);
}
function cssBalanced(name,css){
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,`${name} CSS braces are unbalanced.`);
}
function moduleSyntax(name,source){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  assert.equal(result.status,0,`${name} browser-module syntax failed:\n${result.stderr||result.stdout}`);
}
function literalElementReferences(source){
  return [...source.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match=>match[1]);
}
function assertReferences(name,html,source){
  const htmlIds=new Set(ids(html));
  const missing=[...new Set(literalElementReferences(source).filter(id=>!htmlIds.has(id)))];
  assert.deepEqual(missing,[],`${name} unresolved element ids: ${missing.join(', ')}`);
}

uniqueIds('Replay Notes',files.replayHtml);
uniqueIds('Replay Notes Connect',files.connectHtml);
cssBalanced('Replay Notes',files.replayCss);
cssBalanced('Replay Notes Connect',files.connectCss);
moduleSyntax('Replay Notes',files.replayJs);
moduleSyntax('Replay Notes Connect',files.connectJs);
assertReferences('Replay Notes',files.replayHtml,files.replayJs);
assertReferences('Replay Notes Connect',files.connectHtml,files.connectJs);

assert(files.replayJs.includes("event.origin!==window.location.origin"),'Message origin validation is missing.');
assert(files.replayJs.includes('event.source!==connectPopup'),'Message source validation is missing.');
assert(files.replayJs.includes("payload.connection!==connectionId"),'Connection nonce validation is missing.');
assert(files.connectJs.includes("},window.location.origin)"),'Exact targetOrigin is missing from postMessage.');
assert(!files.connectJs.includes("postMessage({") || !files.connectJs.includes("},'*')"),'Wildcard postMessage target must not be used.');
assert(!files.replayJs.includes('target="_top"'),'The embedded room should no longer require leaving Squarespace to connect.');
assert(files.replayHtml.includes('id="replayNoteFields" disabled'),'The visible-by-default form must remain disabled before authorization.');
assert(files.replayJs.includes("await requireProductAccess('flowtel')"),'Flowtel product boundary was removed.');
assert(files.replayJs.includes('effectiveFlowFmRank(profile)<1'),'Queendom membership boundary was removed.');
assert((files.vercel.rewrites||[]).some(item=>item.source==='/replay-notes/connect'),'Connection route is not deployed.');

console.log('Replay Notes Squarespace session bridge validation passed.');
