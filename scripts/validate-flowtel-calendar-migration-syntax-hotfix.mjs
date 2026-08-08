import fs from 'node:fs';

const migration = fs.readFileSync('database/migration-067-flowtel-calendar.sql', 'utf8');
const release = fs.readFileSync('docs/RELEASE-0.10.83.2.md', 'utf8');
const changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const corrected = "if v_rank < (case when v_event.audience='flowfm' then 2 else 1 end) then";
const invalid = "if v_rank<case when v_event.audience='flowfm' then 2 else 1 end then";
const correctedCount = migration.split(corrected).length - 1;

assert(migration.startsWith('-- Flowtel v0.10.83'), 'Unexpected migration 067 header.');
assert(/^begin;/m.test(migration), 'Migration 067 must remain transaction-wrapped.');
assert(/^commit;/m.test(migration), 'Migration 067 must retain its final COMMIT.');
assert(correctedCount === 2, `Expected exactly two corrected event membership checks; found ${correctedCount}.`);
assert(!migration.includes(invalid), 'Invalid IF/CASE syntax is still present.');
assert(migration.includes('flowtel_set_queendom_event_registration'), 'Registration function missing.');
assert(migration.includes('flowtel_get_queendom_event_join_details'), 'Join-details function missing.');
assert(release.includes('run again from the beginning'), 'Release instructions must tell the owner to rerun corrected migration 067.');
assert(changelog.includes('## v0.10.83.2 — Calendar Migration Syntax Hotfix'), 'Changelog must retain v0.10.83.2 history.');

console.log('Flowtel v0.10.83.2 migration syntax hotfix validator passed.');
