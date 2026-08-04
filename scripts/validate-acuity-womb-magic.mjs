import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['api/acuity.js','api/acuity-webhook.js','server/acuity-server.js','shared/acuity-scheduling.js','flow-fm/womb-magic/index.html','flow-fm/upcoming-calls/index.html','manager/acuity/index.html','database/migration-064-acuity-womb-magic-scheduling.sql','docs/RELEASE-0.10.81.md'];
for(const file of required)assert.ok(fs.existsSync(path.join(root,file)),`Missing ${file}`);
const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
for(const route of ['/flow-fm/womb-magic','/flow-fm/upcoming-calls','/manager/acuity'])assert.ok(vercel.rewrites.some(item=>item.source===route),`Missing route ${route}`);
const server=fs.readFileSync(path.join(root,'server/acuity-server.js'),'utf8');
assert.match(server,/process\.env\.ACUITY_USER_ID/);assert.match(server,/process\.env\.ACUITY_API_KEY/);
for(const browserFile of ['shared/acuity-scheduling.js','flow-fm/womb-magic/page.js','manager/acuity/app.js']){const text=fs.readFileSync(path.join(root,browserFile),'utf8');assert.doesNotMatch(text,/process\.env|ACUITY_API_KEY\s*=/,`Secret handling in ${browserFile}`);}
console.log('Acuity Womb Magic static validation passed.');
