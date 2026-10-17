// Teaching-level interactive prompts. These are temporary exercises, not private records.
// The Four Corners of Creative Flow remain Time, Space, Purpose, and Energy.
export const CREATIVE_FLOW_CORNERS=Object.freeze([
 Object.freeze({key:'time',label:'Time',question:'What rhythms would create more time for your Big Vision?'}),
 Object.freeze({key:'space',label:'Space',question:'What space can you make for what wants to emerge?'}),
 Object.freeze({key:'purpose',label:'Purpose',question:'What matters most about the vision you are creating?'}),
 Object.freeze({key:'energy',label:'Energy',question:'What supports your energy as this vision unfolds?'})
]);
export const INNER_SEASON_PLANNING=Object.freeze([
 Object.freeze({key:'winter',label:'Inner Winter',question:'What can you leave open for rest, reflection, and listening?'}),
 Object.freeze({key:'spring',label:'Inner Spring',question:'What would you like to explore or begin?'}),
 Object.freeze({key:'summer',label:'Inner Summer',question:'Where would you like to share, express, or connect?'}),
 Object.freeze({key:'autumn',label:'Inner Autumn',question:'What needs completion, a boundary, or a little more space?'})
]);
export function validTeachingChoice(options,key){return options.some(option=>option.key===key);}
