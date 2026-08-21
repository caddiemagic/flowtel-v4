import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const must=(file,needles)=>{const text=read(file);for(const needle of needles)assert.ok(text.includes(needle),`${file} missing ${needle}`);return text;};

const migration=must('database/migration-071-moon-mail-personal-cosmology.sql',[
  'alter table public.flowtel_moonbox_messages',
  'between 1 and 16000',
  'flowtel_moonbox_returns',
  'return_due_at',
  "now() + interval '7 days'",
  'flowtel_get_my_moon_mail_messages',
  'flowtel_get_due_moonbox_returns',
  'flowtel_complete_moonbox_return',
  'create table if not exists public.flowtel_member_cosmology',
  'share_with_active_practitioner',
  'flowtel_can_view_member_cosmology',
  "relationship.status = 'connected'",
  'relationship.consent_granted',
  'flowtel_has_active_appointment_access',
  "'flowtel-personal-cosmology'",
  "array['image/png','image/jpeg','image/webp','application/pdf']",
  'Authorized viewers read Personal Cosmology charts',
  "notify pgrst, 'reload schema'",
]);
assert.ok(migration.trim().startsWith('-- Flowtel v0.10.86'));
assert.ok(migration.includes('begin;')&&migration.trim().endsWith('commit;'));
assert.equal((migration.match(/\$\$/g)||[]).length%2,0,'migration dollar quotes must balance');
assert.ok(!migration.includes('create table if not exists public.flowtel_moon_mail_messages'),'must extend Moonbox, not create a second message system');
assert.ok(!migration.includes('create or replace function public.flowtel_get_collective_moonbox_messages'),'collective RPC must remain untouched so returns cannot leak into it');
assert.ok(migration.includes('revoke all on table public.flowtel_moonbox_returns from anon, authenticated'));
assert.ok(migration.includes('unique (message_id)'),'seven-day return must be one append-only record per source message');

const helperBlock=migration.slice(
  migration.indexOf('create or replace function public.flowtel_can_view_member_cosmology'),
  migration.indexOf('create or replace function public.flowtel_get_member_cosmology')
);
for(const forbidden of ['owner','admin','flowtel_current_user_is_owner','flowtel_current_user_is_admin']){
  assert.ok(!helperBlock.toLowerCase().includes(forbidden),`Personal Cosmology helper must not have a generic ${forbidden} bypass`);
}

const moonHtml=must('moonbox/index.html',[
  '<h1>MOON MAIL</h1>',
  'maxlength="16000"',
  'THE MOON HAS MAIL FOR YOU',
  'How do you feel now, seven days later?',
  'What has happened since you sent this message to the Moon instead of him?',
  'Seven-day outcomes never appear here.',
]);
const moonJs=must('moonbox/app.js',[
  'MAX_MESSAGE_LENGTH=16000',
  'flowtel_get_collective_moonbox_messages',
  'flowtel_get_my_moon_mail_messages',
  'flowtel_complete_moonbox_return',
  'return_due_at',
]);
assert.ok(moonJs.includes('identifyingDetails'),'collective PII guard must remain in browser UX');

must('client/index.html',[
  'href="/moon-mail/">Moon Mail</a>',
  'href="/personal-cosmology/">Personal Cosmology</a>',
  'id="moonMailAlertSuite"',
  'id="moonMailAlertLounge"',
  'THE MOON HAS MAIL FOR YOU',
]);
must('client/app.js',['flowtel_get_due_moonbox_returns','/moon-mail/?return=']);

const cosmologyHtml=must('personal-cosmology/index.html',[
  'PERSONAL COSMOLOGY',
  'Birth Date',
  'Birth Time',
  'Exact',
  'Approximate',
  'Unknown',
  'Birthplace',
  'Human Design Chart',
  'Share my Birth + Design details with my active Mentor or the Priestess actively holding me.',
]);
const cosmologyJs=must('personal-cosmology/app.js',[
  'flowtel_get_member_cosmology',
  'flowtel_save_my_cosmology',
  'flowtel_set_my_cosmology_chart',
  'createSignedUrl',
  'flowtel-personal-cosmology',
]);
assert.ok(!/calculate.*astrolog|calculate.*human design|bodygraph/i.test(cosmologyJs+cosmologyHtml),'v0.10.86 must not calculate astrology/Human Design');

must('cycle-data/index.html',['id="openPersonalCosmologyLink"']);
must('cycle-data/app.js',['/personal-cosmology/?client=']);
must('flow-fm/upcoming-calls/page.js',['Open Personal Cosmology','/personal-cosmology/?client=']);

const vercel=JSON.parse(read('vercel.json'));
for(const [source,destination] of [['/moonbox','/moonbox/index.html'],['/moon-mail','/moonbox/index.html'],['/personal-cosmology','/personal-cosmology/index.html']]){
  assert.ok((vercel.rewrites||[]).some(row=>row.source===source&&row.destination===destination),`${source} rewrite missing`);
}
for(const source of ['/moonbox','/moon-mail','/personal-cosmology']){
  const header=(vercel.headers||[]).find(row=>row.source===source);
  assert.ok(header,`${source} private headers missing`);
  const flat=JSON.stringify(header.headers||[]);
  assert.ok(flat.includes('no-store, private, max-age=0'));
  assert.ok(flat.includes('noindex, nofollow, noarchive'));
}

for(const publicSafeFile of ['team-map/app.js','flow-fm/profile-studio/app.js','shared/profiles.js']){
  if(fs.existsSync(path.join(root,publicSafeFile))){
    assert.ok(!read(publicSafeFile).includes('flowtel_member_cosmology'),`${publicSafeFile} must not read Personal Cosmology table`);
  }
}

must('docs/RELEASE-0.10.86.md',['Moon Mail + Personal Cosmology','migration-071-moon-mail-personal-cosmology.sql','Front Desk / Concierge Messages']);
must('docs/CHANGELOG.md',['## v0.10.86 — Moon Mail + Personal Cosmology']);
must('docs/FLOWTEL_ROADMAP.md',['## Next Priority — Front Desk / Concierge Messages','## Deferred — Flowtel Messaging + Wake Up Text']);

console.log('Flowtel v0.10.86 Moon Mail + Personal Cosmology validator passed.');
