const zone='America/Los_Angeles';
// Resolve a wall-clock choice explicitly. Reject both DST gaps and ambiguous folds.
export function pacificTimestamp(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error('Choose a valid date and time');
 const wall=Date.parse(date+'T'+time+':00Z');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const matches=[];
 for(const offset of [7,8]){const instant=new Date(wall+offset*3600000);if(!Number.isFinite(instant.getTime()))continue;const parts=formatter.formatToParts(instant);const v=t=>parts.find(p=>p.type===t)?.value;if(v('year')+'-'+v('month')+'-'+v('day')===date&&v('hour')+':'+v('minute')===time)matches.push(instant.toISOString());}
 if(matches.length!==1)throw Error(matches.length?'That time occurs twice during the Pacific daylight-saving change. Choose another time.':'That Pacific time does not exist. Choose another time.');
 return matches[0];
}
