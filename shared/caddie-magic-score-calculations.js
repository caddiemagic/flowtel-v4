// Caddie Magic v0.4.6 — shared valid-score calculations.

export function validGolfScore(value){
  if(value === null || value === undefined || value === '') return null;
  const score=Number(value);
  return Number.isFinite(score) && score > 0 ? score : null;
}

export function averageValidGolfScore(entries=[]){
  const scores=entries
    .map(entry=>validGolfScore(typeof entry === 'object' && entry !== null ? entry.score : entry))
    .filter(score=>score !== null);
  if(!scores.length) return null;
  return Math.round((scores.reduce((sum,score)=>sum+score,0)/scores.length)*10)/10;
}

export function bestValidGolfScore(entries=[]){
  const scores=entries
    .map(entry=>validGolfScore(typeof entry === 'object' && entry !== null ? entry.score : entry))
    .filter(score=>score !== null);
  return scores.length ? Math.min(...scores) : null;
}
