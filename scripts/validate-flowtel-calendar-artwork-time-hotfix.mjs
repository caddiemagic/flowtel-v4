import fs from 'node:fs';
import assert from 'node:assert/strict';

const files=[
  'database/migration-069-queendom-event-artwork-storage.sql',
  'shared/queendom-events.js',
  'manager/events/index.html',
  'manager/events/app.js',
  'manager/events/styles.css',
  'docs/RELEASE-0.10.83.3.md',
  'docs/CHANGELOG.md',
];
for(const file of files)assert(fs.existsSync(file),`Missing ${file}`);

const migration=fs.readFileSync('database/migration-069-queendom-event-artwork-storage.sql','utf8');
assert(migration.includes('for select to authenticated'),'Migration 069 must grant authenticated SELECT through RLS.');
assert(migration.includes("bucket_id='flowtel-queendom-event-images'"),'Migration 069 must scope policies to the Queendom event image bucket.');
assert(migration.includes('flowtel_current_user_is_admin_or_owner()'),'Storage policy must remain Owner/Admin-only.');
assert(migration.includes('for insert to authenticated'),'Insert policy repair missing.');
assert(migration.includes('for update to authenticated'),'Update policy repair missing.');
assert(migration.includes('for delete to authenticated'),'Delete policy repair missing.');
assert(/^begin;/m.test(migration)&&/^commit;/m.test(migration),'Migration 069 must remain transaction-wrapped.');

const html=fs.readFileSync('manager/events/index.html','utf8');
for(const minute of ['00','15','30','45']){
  const count=(html.match(new RegExp(`<option value="${minute}">:${minute}</option>`,'g'))||[]).length;
  assert(count===2,`Expected start/end :${minute} options exactly twice; found ${count}.`);
}
assert(!html.includes('id="eventStartTime" type="time"'),'Start time must not use unrestricted native time input.');
assert(!html.includes('id="eventEndTime" type="time"'),'End time must not use unrestricted native time input.');
assert(html.includes('v=0.10.83.3'),'Manager event cache bust must be v0.10.83.3.');

const app=fs.readFileSync('manager/events/app.js','utf8');
assert(app.includes("parts.period.value==='AM'&&hour===12"),'12 AM conversion missing.');
assert(app.includes("parts.period.value==='PM'&&hour!==12"),'PM conversion missing.');
assert(app.includes("if(!values.start_time)throw new Error('Choose a start time.')"),'Start-time validation missing.');
assert(app.includes("renderHourOptions(fields.endHour,{optional:true})"),'Optional end-time setup missing.');

const shared=fs.readFileSync('shared/queendom-events.js','utf8');
assert(shared.includes('Run Flowtel migration 069'),'Storage RLS error should point Owner to migration 069.');

const changelog=fs.readFileSync('docs/CHANGELOG.md','utf8');
assert(changelog.includes('## v0.10.83.3 — Event Artwork + Quarter-Hour Time Picker Hotfix'),'Changelog must retain the v0.10.83.3 entry.');

console.log(`Flowtel v0.10.83.3 artwork/time hotfix validator passed (${files.length} release files checked).`);
