import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../shared/13-moons-ceremony-choices.js',import.meta.url),'utf8');
const {CREATIVE_FLOW_CORNERS,INNER_SEASON_PLANNING,validTeachingChoice}=await import('data:text/javascript,'+encodeURIComponent(source));
assert.deepEqual(CREATIVE_FLOW_CORNERS.map(x=>x.label),['Time','Space','Purpose','Energy']);
assert.deepEqual(INNER_SEASON_PLANNING.map(x=>x.label),['Inner Winter','Inner Spring','Inner Summer','Inner Autumn']);
for(const options of [CREATIVE_FLOW_CORNERS,INNER_SEASON_PLANNING]){
 assert.equal(new Set(options.map(x=>x.key)).size,4);
 for(const item of options){
  assert.ok(item.question.trim().length>15);
  assert.ok(validTeachingChoice(options,item.key));
 }
 assert.equal(validTeachingChoice(options,'not-a-season'),false);
}
console.log('13 Moons ceremonial choice mapping passed');
