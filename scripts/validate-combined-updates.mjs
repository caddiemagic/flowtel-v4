import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const read=(file)=>readFile(path.join(root,file),'utf8');
const files={
  migration:await read('database/migration-052-combined-flowtel-caddie-updates.sql'),
  managerJs:await read('manager/app.js'),managerHtml:await read('manager/index.html'),managerCss:await read('manager/styles.css'),
  clientJs:await read('client/app.js'),clientHtml:await read('client/index.html'),clientCss:await read('client/styles.css'),
  cycleJs:await read('cycle-data/app.js'),cycleHtml:await read('cycle-data/index.html'),cycleCss:await read('cycle-data/styles.css'),
  guestHtml:await read('guest-house/index.html'),
  availabilityJs:await read('flow-fm/availability/page.js'),availabilityHtml:await read('flow-fm/availability/index.html'),availabilityCss:await read('flow-fm/availability/styles.css'),
  mailbox:await read('shared/priestess-mailbox.js'),hfr:await read('shared/hourly-flow-rate.js'),
  caddieHtml:await read('caddie-magic/index.html'),caddieJs:await read('caddie-magic/app.js'),
  scoreHtml:await read('caddie-magic/score-map/index.html'),scoreJs:await read('caddie-magic/score-map/app.js'),scoreCss:await read('caddie-magic/score-map/styles.css'),
  collectiveHtml:await read('caddie-magic/collective-map/index.html'),collectiveCss:await read('caddie-magic/collective-map/styles.css'),
  vercel:JSON.parse(await read('vercel.json')),
};

assert(files.managerHtml.includes('styles.css?v=0.10.67'));
assert(files.managerHtml.includes('app.js?v=0.10.67-caddie-0.4.6'));
assert(files.managerCss.includes('.guest-house-request-body[hidden]{display:none!important}'),'Collapsed Guest House bodies can still override the hidden attribute.');
assert(files.managerJs.includes('guestHouseExpandedRequestId'),'One-at-a-time Guest House state is missing.');
assert(files.managerJs.includes('data-guest-house-toggle'),'Guest House request toggles are missing.');
assert(files.managerJs.includes("const seasonOrder=['Inner Autumn','Inner Summer','Inner Winter','Inner Spring']")||files.managerJs.includes("['Inner Autumn','Inner Summer','Inner Winter','Inner Spring']"),'Owner Team Map quadrants are not Autumn, Summer, Winter, Spring.');

assert(files.clientHtml.includes('id="loungeSeasonPlanner"'),'Lounge seasonal planner is missing.');
for(const field of ['city','region','country','lodging_idea','calling_reflection']) assert(files.clientJs.includes(field),`Lounge planner field missing: ${field}`);
assert(files.hfr.includes('flowtel_hfr_save_workshop_season'));
assert(files.clientCss.includes('#requestTurndownButton,#requestWakeUpTextButton'),'Concierge button width match is missing.');

assert(files.availabilityHtml.includes('FOUR-WEEK MAP'));
assert(files.availabilityJs.includes('day.availability_season===season'));
assert(files.migration.includes("'availability_season',case when d.cycle_day <= 7"),'Availability map is not four seven-day rows.');
assert(files.migration.includes('primary key (member_id, cycle_day)'));
assert(files.migration.includes('flowtel_availability_save_day'));
assert((files.vercel.rewrites||[]).some(row=>['/flow-fm/availability','/flow-fm/availability/'].includes(row.source)&&row.destination==='/flow-fm/availability/index.html'),'Availability rewrite is missing.');

assert(!files.guestHtml.includes('A Guest House account, not a Flowtel membership.'));
assert(files.guestHtml.includes('Your replay will be shared here soon. When you feel called to enter the Flowtel experience, your Queendom is waiting.'));

for(const label of ['Current Moon','Last Moon','Inner Season','Yearly Season','All Time']) assert(files.cycleJs.includes(label),`Client Snapshot filter missing: ${label}`);
assert(files.cycleJs.includes('flowtel_get_cycle_subject_snapshot'));
assert(files.cycleJs.includes('flowtel_get_cycle_subject_clockins'));
assert(files.migration.includes("'account_match_status'"));
assert(files.migration.includes('count(distinct s.id)::integer as checkins'));
assert(files.migration.includes('count(distinct cs.id)::integer as clockins'));

assert(files.migration.includes('r.reflection as reflection_text,r.created_at as reflection_created_at'),'Flow Map timestamp alias fix is missing.');
assert(files.migration.includes('note_entries.reflection_created_at desc'));

assert(files.managerJs.includes('SEND A PRIVATE FILE'));
assert(files.managerJs.includes('sendPrivateFileToPriestess'));
assert(files.managerJs.includes('priestessInboxEditorProtected'),'Priestess Inbox editor refresh protection is missing.');
assert(files.managerJs.includes('priestessInboxDraft'),'Priestess Inbox selected-file persistence is missing.');
assert(files.managerJs.includes('data-priestess-inbox-clear'),'Priestess Inbox selected-file clear control is missing.');
assert(files.managerCss.includes('.admin-mailbox-send-selected'),'Priestess Inbox selected-file panel styling is missing.');
assert(files.mailbox.includes('flowtel_mailbox_admin_list_recipients'));
assert(files.mailbox.includes('flowtel_mailbox_admin_send_file'));
assert(files.migration.includes("(storage.foldername(name))[3] = 'to-practitioner'") || files.migration.includes("split_part(coalesce(p_storage_path,''),'/',3)<>'to-practitioner'"));
assert(!/grant\s+(insert|update|delete)\s+on\s+public\.flowtel_priestess_mailbox_/i.test(files.migration),'Migration grants direct mailbox writes to browser roles.');

for(const html of [files.scoreHtml,files.collectiveHtml]){
  const order=['North Club','East Club','West Club','South Club'].map(text=>html.indexOf(text));
  assert(order.every((value,index)=>value>=0&&(index===0||value>order[index-1])),'Caddie quadrants are not ordered North/East/West/South.');
}
assert(files.scoreCss.includes('.cm-map-north{grid-column:1;grid-row:1}'));
assert(files.scoreCss.includes('.cm-map-east{grid-column:2;grid-row:1}'));
assert(files.scoreCss.includes('.cm-map-west{grid-column:1;grid-row:2}'));
assert(files.scoreCss.includes('.cm-map-south{grid-column:2;grid-row:2}'));
assert(files.collectiveCss.includes('.cm-collective-north{grid-column:1;grid-row:1}'));
assert(files.collectiveCss.includes('.cm-collective-east{grid-column:2;grid-row:1}'));
assert(files.collectiveCss.includes('.cm-collective-west{grid-column:1;grid-row:2}'));
assert(files.collectiveCss.includes('.cm-collective-south{grid-column:2;grid-row:2}'));

assert(files.caddieHtml.includes('What went well? What went wrong? What did you notice?'));
assert(files.caddieHtml.includes('id="nextRelevantMoonLabel"'));
assert(!files.caddieHtml.includes('id="lastNewMoonValue"'));
assert(!files.caddieHtml.includes('id="nextNewMoonValue"'));
assert(!files.caddieHtml.includes('id="nextFullMoonValue"'));
assert(files.caddieJs.includes('averageValidGolfScore'));
assert(files.scoreJs.includes('validGolfScore(entry.score) !== null'));
assert(files.caddieHtml.includes('v0.4.6'));

function duplicateIds(html){const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);return ids.filter((id,index)=>ids.indexOf(id)!==index);}
for(const [name,html] of Object.entries({manager:files.managerHtml,client:files.clientHtml,cycle:files.cycleHtml,availability:files.availabilityHtml,guest:files.guestHtml,caddie:files.caddieHtml,score:files.scoreHtml,collective:files.collectiveHtml})){
  assert.deepEqual(duplicateIds(html),[],`${name} HTML contains duplicate IDs.`);
}

function balancedCss(text){let depth=0;let quote='';let comment=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue;}if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='{')depth++;if(c==='}')depth--;if(depth<0)return false;}return depth===0&&!quote&&!comment;}
for(const [name,css] of Object.entries({manager:files.managerCss,client:files.clientCss,cycle:files.cycleCss,availability:files.availabilityCss,score:files.scoreCss,collective:files.collectiveCss})) assert(balancedCss(css),`${name} CSS is structurally unbalanced.`);

const dollarQuotes=(files.migration.match(/\$\$/g)||[]).length;
assert.equal(dollarQuotes%2,0,'Migration 052 has an unmatched SQL dollar quote.');
assert(files.migration.includes('Migration 037 remains retired'));

async function walk(dir){const out=[];for(const name of await readdir(dir)){const full=path.join(dir,name);const info=await stat(full);if(info.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
const all=await walk(root);
assert(!all.some(file=>/Four-Seasons-Flowtel-Workshop\.mp4$/i.test(file)),'Large Lounge workshop MP4 must remain outside Git.');
assert(!all.some(file=>/(^|\/)\.env($|\.)|node_modules|\.git\//.test(file)),'Local or secret artifacts were added.');

console.log('Combined Flowtel + Caddie Magic static validation passed.');
