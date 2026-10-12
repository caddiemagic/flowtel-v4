export function holeScorePayload(holes,values){
 if(![9,18].includes(Number(holes))||values.length!==Number(holes))throw Error('Choose 9 or 18 holes.');
 const scores=values.map(value=>{if(value===null||String(value).trim()==='')return null;const n=Number(value);if(!Number.isInteger(n)||n<1||n>30)throw Error('Hole scores must be whole numbers from 1 to 30.');return n;});
 if(scores.every(s=>s===null))throw Error('Enter at least one hole score.');const total=scores.reduce((sum,s)=>sum+(s||0),0);if(total>300)throw Error('The recorded total must be 300 or less.');
 return {holes_played:Number(holes),hole_scores:scores,score:total,round_complete:scores.every(s=>s!==null)};
}
export function holeAngle(index,holes){return 180-180/holes-index*360/holes;}
