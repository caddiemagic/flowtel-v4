import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=[
  'shared/womb-magic-booking.js',
  'shared/relationships.js',
  'shared/flow-fm-availability-admin.js',
  'client/index.html',
  'client/styles.css',
  'cycle-data/app.js',
  'cycle-data/styles.css',
  'manager/availability/index.html',
  'manager/availability/app.js',
  'manager/availability/styles.css',
  'database/migration-065-mentor-directory-owner-availability.sql',
  'docs/RELEASE-0.10.81.2.md',
];
for(const file of required)assert.ok(fs.existsSync(path.join(root,file)),`Missing ${file}`);

const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
assert.ok(vercel.rewrites.some(item=>item.source==='/manager/availability'&&item.destination==='/manager/availability/index.html'),'Missing owner availability route.');

const migration=fs.readFileSync(path.join(root,'database/migration-065-mentor-directory-owner-availability.sql'),'utf8');
for(const token of [
  'flowtel_flow_fm_availability_season_status',
  'flowtel_list_available_mentors',
  'flowtel_admin_list_flow_fm_availability',
  'flowtel_availability_save_season',
  'flowtel_current_user_is_phase_one_owner',
])assert.ok(migration.includes(token),`Migration 065 is missing ${token}.`);
assert.doesNotMatch(migration,/drop\s+table|truncate\s+table|delete\s+from\s+public\.flowtel_stays/i,'Migration 065 contains destructive history SQL.');

const adminModule=fs.readFileSync(path.join(root,'shared/flow-fm-availability-admin.js'),'utf8');
assert.match(adminModule,/flowtel_admin_list_flow_fm_availability/);
assert.doesNotMatch(adminModule,/service_role|process\.env/i);

console.log('Flowtel v0.10.81.2 static validation passed.');
