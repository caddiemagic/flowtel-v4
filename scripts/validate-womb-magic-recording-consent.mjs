import fs from 'node:fs';
import assert from 'node:assert/strict';

const required=[
  'client/index.html',
  'server/acuity-server.js',
  'shared/acuity-scheduling.js',
  'api/acuity.js',
  'docs/RELEASE-0.10.84.1.md',
  'docs/CHANGELOG.md',
];
for(const file of required)assert(fs.existsSync(file),`Missing ${file}`);

const client=fs.readFileSync('client/index.html','utf8');
const server=fs.readFileSync('server/acuity-server.js','utf8');
const shared=fs.readFileSync('shared/acuity-scheduling.js','utf8');
const api=fs.readFileSync('api/acuity.js','utf8');
const changelog=fs.readFileSync('docs/CHANGELOG.md','utf8');
const release=fs.readFileSync('docs/RELEASE-0.10.84.1.md','utf8');

const disclosure='Your Womb Magic call will be recorded and uploaded to the Flow FM Library for training purposes, where it will be shared with care and integrity.';
const checkbox='I understand and consent to this temporary access and to my Womb Magic call being recorded and uploaded to the Flow FM Library for training purposes.';

assert(server.includes(disclosure),'Canonical server consent language must include recording/library disclosure.');
assert(shared.includes(disclosure),'Shared scheduling consent language must match the recording/library disclosure.');
assert(client.includes(checkbox),'Booking checkbox must explicitly acknowledge recording and Flow FM Library use.');
assert(client.includes('data-wm-book disabled'),'Booking must remain disabled before consent.');
assert(api.includes('consent_language:WOMB_MAGIC_CONSENT_LANGUAGE'),'New appointment must persist canonical consent language.');
assert(api.includes('consent_granted_at:nowIso()'),'New appointment must persist consent timestamp.');
assert(release.includes('new bookings made after deployment'),'Release note must document non-retroactive consent scope.');
assert(changelog.startsWith('## v0.10.84.1'),'Changelog must begin with v0.10.84.1.');

console.log(`Flowtel v0.10.84.1 Womb Magic recording consent validator passed (${required.length} release files checked).`);
