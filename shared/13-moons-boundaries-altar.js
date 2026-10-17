// Interface prompts only: additions to, not replacements for, the canonical
// Womb Work assignments in shared/womb-work.js. These are not persisted.
export const BOUNDARY_SLOTS=Object.freeze([
  Object.freeze({number:1,label:'First boundary'}),
  Object.freeze({number:2,label:'Second boundary'}),
  Object.freeze({number:3,label:'Third boundary'})
]);
// The directions/elements are transcribed from the existing daily invocation:
// north/wind, east/fire, south/earth, west/water.
export const ALTAR_DIRECTIONS=Object.freeze([
  Object.freeze({key:'north',label:'North',element:'Air · Wind',invitation:'Clear thoughts and direction'}),
  Object.freeze({key:'east',label:'East',element:'Fire',invitation:'Release what belongs to past timelines'}),
  Object.freeze({key:'south',label:'South',element:'Earth',invitation:'Grounding and a steady foundation'}),
  Object.freeze({key:'west',label:'West',element:'Water',invitation:'Flow, fluidity, and forgiveness'})
]);
export function findAltarDirection(key){
 return ALTAR_DIRECTIONS.find(direction=>direction.key===key)||null;
}
