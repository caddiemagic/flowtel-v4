import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../shared/13-moons-boundaries-altar.js',import.meta.url),'utf8');
const {BOUNDARY_SLOTS,ALTAR_DIRECTIONS,findAltarDirection}=await import('data:text/javascript,'+encodeURIComponent(source));
assert.equal(BOUNDARY_SLOTS.length,3);
assert.deepEqual(BOUNDARY_SLOTS.map(x=>x.number),[1,2,3]);
assert.equal(new Set(BOUNDARY_SLOTS.map(x=>x.label)).size,3);
assert.deepEqual(ALTAR_DIRECTIONS.map(x=>x.key),['north','east','south','west']);
assert.deepEqual(ALTAR_DIRECTIONS.map(x=>x.element),['Air · Wind','Fire','Earth','Water']);
assert.equal(new Set(ALTAR_DIRECTIONS.map(x=>x.key)).size,4);
for(const item of ALTAR_DIRECTIONS){
 assert.equal(findAltarDirection(item.key),item);
 assert.ok(item.invitation.trim().length>9);
}
assert.equal(findAltarDirection('northeast'),null);
assert.equal(findAltarDirection(null),null);
console.log('13 Moons three boundaries and altar directions passed');
