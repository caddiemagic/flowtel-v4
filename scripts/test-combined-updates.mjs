import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { averageValidGolfScore, bestValidGolfScore, validGolfScore } from '../shared/caddie-magic-score-calculations.js';

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

assert.equal(validGolfScore(null),null);
assert.equal(validGolfScore(''),null);
assert.equal(validGolfScore(0),null);
assert.equal(validGolfScore('0'),null);
assert.equal(validGolfScore('74'),74);
const mixed=[{score:74},{score:null},{score:''},{score:90},{score:0},{score:67},{score:undefined},{score:'not-a-score'}];
assert.equal(averageValidGolfScore(mixed),77);
assert.equal(bestValidGolfScore(mixed),67);
assert.equal(averageValidGolfScore([{score:null},{score:''}]),null);
assert.equal(bestValidGolfScore([{score:0},{score:null}]),null);

const scoreMap=await read('caddie-magic/score-map/index.html');
const collective=await read('caddie-magic/collective-map/index.html');
for(const html of [scoreMap,collective]){
  const north=html.indexOf('North Club');
  const east=html.indexOf('East Club');
  const west=html.indexOf('West Club');
  const south=html.indexOf('South Club');
  assert(north>=0&&east>north&&west>east&&south>west,'Caddie quadrants are not ordered North, East, West, South in markup.');
}

const caddieHtml=await read('caddie-magic/index.html');
assert(caddieHtml.includes('What went well? What went wrong? What did you notice?'));
assert(caddieHtml.includes('id="nextRelevantMoonLabel"'));
assert(!caddieHtml.includes('id="lastNewMoonValue"'));
assert(!caddieHtml.includes('id="nextNewMoonValue"'));
assert(!caddieHtml.includes('id="nextFullMoonValue"'));
const hero=caddieHtml.slice(caddieHtml.indexOf('<div class="cm-hero-actions"'),caddieHtml.indexOf('</div>',caddieHtml.indexOf('<div class="cm-hero-actions"'))+6);
assert(hero.includes('Log a Round')&&hero.includes('Score Map'));
assert(!hero.includes('Locker Room')&&!hero.includes('Caddie Compass')&&!hero.includes('Find a Caddie'));

const caddieApp=await read('caddie-magic/app.js');
const stats=caddieApp.slice(caddieApp.indexOf('function renderStats()'),caddieApp.indexOf('\nfunction ',caddieApp.indexOf('function renderStats()')+20));
assert(!/Latest Score|Moon Data|Latest Swing Thought/.test(stats));

const migration=await read('database/migration-052-combined-flowtel-caddie-updates.sql');
assert(migration.includes("'availability_season',case when d.cycle_day <= 7"));
assert(migration.includes("when d.cycle_day <= 14 then 'Inner Spring'"));
assert(migration.includes("when d.cycle_day <= 21 then 'Inner Summer'"));
assert(migration.includes('flowtel_hfr_save_workshop_season'));
assert(migration.includes('flowtel_availability_save_day'));
assert(migration.includes('flowtel_get_cycle_subject_snapshot'));
assert(migration.includes('flowtel_get_cycle_subject_clockins'));
assert(migration.includes('flowtel_mailbox_admin_send_file'));
assert(migration.includes('r.created_at as reflection_created_at'));

const managerCss=await read('manager/styles.css');
assert(managerCss.includes('.guest-house-request-body[hidden]{display:none!important}'));
const managerApp=await read('manager/app.js');
assert(managerApp.includes("['Inner Autumn','Inner Summer','Inner Winter','Inner Spring']"));
assert(managerApp.includes('sendPrivateFileToPriestess'));
assert(managerApp.includes('priestessInboxEditorProtected'));
assert(managerApp.includes('priestessInboxDraft'));
assert(managerApp.includes('data-priestess-inbox-clear'));
assert(managerCss.includes('.admin-mailbox-send-selected'));

const guest=await read('guest-house/index.html');
assert(!guest.includes('A Guest House account, not a Flowtel membership.'));
assert(guest.includes('Your replay will be shared here soon. When you feel called to enter the Flowtel experience, your Queendom is waiting.'));

console.log('Combined Flowtel + Caddie Magic behavior tests passed.');
