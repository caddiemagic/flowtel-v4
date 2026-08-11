import fs from 'node:fs';
import assert from 'node:assert/strict';

const files=[
  'client/index.html','client/styles.css','client/app.js',
  'shared/queendom-events.js','manager/events/index.html','manager/events/styles.css','manager/events/app.js',
  'queendom-calendar/index.html','queendom-calendar/styles.css','queendom-calendar/app.js',
  'database/migration-068-flowtel-calendar-polish.sql','docs/RELEASE-0.10.83.1.md','docs/CHANGELOG.md'
];
for(const file of files)assert(fs.existsSync(new URL(`../${file}`,import.meta.url)),`Missing ${file}`);
const migration=fs.readFileSync(new URL('../database/migration-068-flowtel-calendar-polish.sql',import.meta.url),'utf8');
assert(migration.includes('Flowtel migration 067 must be installed before migration 068.'),'Migration dependency guard missing.');
assert(migration.includes('host_member_id uuid references public.profiles(id) on delete set null'),'Host relationship is not safely nullable.');
const html=fs.readFileSync(new URL('../manager/events/index.html',import.meta.url),'utf8');
assert(/v=0\.10\.83\.(?:1|[3-9]|\d{2,})/.test(html),'Manager event cache bust missing or regressed below v0.10.83.1.');
const lounge=fs.readFileSync(new URL('../client/index.html',import.meta.url),'utf8');
assert(/v=0\.10\.(?:83\.(?:1|[3-9]|\d{2,})|8[4-9]|\d{3,})/.test(lounge),'Lounge cache bust missing or regressed below v0.10.83.1.');
console.log(`Flowtel v0.10.83.1 validator passed (${files.length} release files checked).`);
