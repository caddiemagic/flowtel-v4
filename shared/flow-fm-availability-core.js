export const FLOW_FM_INNER_SEASONS = ['Inner Winter','Inner Spring','Inner Summer','Inner Autumn'];
export const FLOW_FM_WEEKDAYS = [
  { weekday:1, label:'Monday' },
  { weekday:2, label:'Tuesday' },
  { weekday:3, label:'Wednesday' },
  { weekday:4, label:'Thursday' },
  { weekday:5, label:'Friday' },
  { weekday:6, label:'Saturday' },
  { weekday:7, label:'Sunday' },
];

export function validateFlowFmAvailabilitySeason(innerSeason, days){
  if(!FLOW_FM_INNER_SEASONS.includes(innerSeason)) throw new Error('Choose a valid Inner Season.');
  if(!Array.isArray(days) || days.length !== 7) throw new Error('Include Monday through Sunday before saving.');
  const seen = new Set();
  const normalized = days.map(day=>{
    const weekday=Number(day?.weekday);
    if(!Number.isInteger(weekday) || weekday<1 || weekday>7 || seen.has(weekday)) throw new Error('Each weekday may appear once.');
    seen.add(weekday);
    const available=Boolean(day?.available);
    const windows=available ? (Array.isArray(day?.windows)?day.windows:[]) : [];
    if(available && windows.length===0) throw new Error('Add at least one time window for every available day.');
    if(windows.length > 8) throw new Error('A weekday may contain up to eight time windows.');
    return {
      weekday,
      available,
      windows: windows.map(window=>{
        const start=String(window?.start||'').slice(0,5);
        const end=String(window?.end||'').slice(0,5);
        if(!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start>=end) throw new Error('Each time window must end after it begins.');
        return {start,end};
      }),
    };
  });
  return normalized.sort((a,b)=>a.weekday-b.weekday);
}
