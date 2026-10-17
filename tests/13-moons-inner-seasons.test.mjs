import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../shared/13-moons-inner-seasons.js',import.meta.url),'utf8');
const {seasonForWheelDay,INNER_SEASONS}=await import('data:text/javascript,'+encodeURIComponent(source));
assert.equal(INNER_SEASONS.length,4);
for(const [day,season] of [[1,'winter'],[5,'winter'],[6,'spring'],[11,'spring'],[12,'summer'],[19,'summer'],[20,'autumn'],[26,'autumn'],[27,'winter'],[28,'winter']]){
 assert.equal(seasonForWheelDay(day).key,season,'wheel day '+day);
}
for(const bad of [0,29,-4,1.5,null,'',NaN,Infinity]){
 assert.equal(seasonForWheelDay(bad),null,'invalid wheel day '+String(bad));
}
console.log('13 Moons inner-season wheel boundaries passed');
