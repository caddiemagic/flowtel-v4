// Educational mapping used throughout 13 Moons, not a clinical cycle prediction.
// This 28-position medicine-wheel correspondence is independent of a person's
// actual menstrual length or the astronomical moon phase on a given date.
export const INNER_SEASONS=Object.freeze([
 Object.freeze({key:'winter',name:'Inner Winter',phase:'New Moon',cycle:'Menstruation',days:'27–5',description:'An invitation to listen, rest, and notice what is beginning or ending.'}),
 Object.freeze({key:'spring',name:'Inner Spring',phase:'Half Full Moon',cycle:'Follicular',days:'6–11',description:'An invitation to explore what is stirring, growing, or asking for expression.'}),
 Object.freeze({key:'summer',name:'Inner Summer',phase:'Full Moon',cycle:'Ovulation',days:'12–19',description:'An invitation to notice your expression, connection, and available energy.'}),
 Object.freeze({key:'autumn',name:'Inner Autumn',phase:'Half New Moon',cycle:'Luteal',days:'20–26',description:'An invitation to notice what needs completion, protection, or a clearer boundary.'})
]);
export function seasonForWheelDay(value){
 const day=Number(value);
 if(!Number.isInteger(day)||day<1||day>28)return null;
 return INNER_SEASONS[day<=5||day>=27?0:day<=11?1:day<=19?2:3];
}
