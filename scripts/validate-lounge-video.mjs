import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const read=path=>readFile(path,'utf8');
const migration=await read('database/migration-051-flow-fm-lounge-video-uploader.sql');
const managerHtml=await read('manager/index.html');
const managerJs=await read('manager/app.js');
const managerCss=await read('manager/styles.css');
const clientHtml=await read('client/index.html');
const clientJs=await read('client/app.js');
const shared=await read('shared/lounge-video.js');
const core=await read('shared/lounge-video-core.js');
const release=await read('docs/RELEASE-0.10.65.md');

function moduleSyntax(name,source){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  assert.equal(result.status,0,`${name} module syntax failed:\n${result.stderr||result.stdout}`);
}
function uniqueIds(name,html){
  const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
  const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  assert.deepEqual(duplicates,[],`${name} duplicate ids: ${duplicates.join(', ')}`);
}
function cssBalanced(name,css){assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,`${name} CSS braces unbalanced`);}

uniqueIds('manager',managerHtml);uniqueIds('client',clientHtml);
cssBalanced('manager',managerCss);
moduleSyntax('manager',managerJs);moduleSyntax('client',clientJs);moduleSyntax('shared lounge',shared);moduleSyntax('core',core);
for(const token of [
  "'flowtel-lounge-videos'",'create table if not exists public.flowtel_lounge_videos',
  'flowtel_lounge_video_current_user_is_eligible','flowtel_admin_register_lounge_video',
  'flowtel_admin_list_lounge_videos','flowtel_admin_archive_lounge_video','flowtel_get_active_lounge_video',
  "public.flowtel_current_user_has_product_access('flowtel')",'>= 2','public.flowtel_current_user_is_concierge()',
]) assert(migration.includes(token),`Migration 051 missing ${token}`);
assert(migration.includes('public false') || migration.includes('public=false'),'Lounge bucket is not private.');
assert(managerHtml.includes('data-filter="lounge-video"'),'Concierge Lounge Video doorway missing.');
assert(managerJs.includes('uploadLoungeVideo'),'Concierge Lounge uploader missing.');
assert(managerJs.includes('loungeVideoEditorProtected'),'Lounge selected-file protection missing.');
assert(shared.includes('chunkSize:6*1024*1024'),'Resumable 6 MB upload missing.');
assert(shared.includes('getPendingLoungeVideoUpload'),'Pending upload recovery missing.');
assert(clientJs.includes('openActiveLoungeVideo'),'Flow FM Lounge private playback missing.');
assert(!clientHtml.includes('/assets/Four-Seasons-Flowtel-Workshop.mp4'),'Lounge still depends on a GitHub MP4 asset.');
assert(release.includes('Squarespace Code Block'),'Squarespace embed documentation missing.');
console.log('Private Lounge video validation passed.');
