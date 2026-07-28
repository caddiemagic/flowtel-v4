// Flowtel v0.10.79 — recurring Inner Season availability validation + rhythm helpers.
export const FLOW_FM_INNER_SEASONS = ['Inner Winter','Inner Spring','Inner Summer','Inner Autumn'];
export const FLOW_FM_WEEKDAYS = [
  { weekday:1, label:'Monday', shortLabel:'Mon' },
  { weekday:2, label:'Tuesday', shortLabel:'Tue' },
  { weekday:3, label:'Wednesday', shortLabel:'Wed' },
  { weekday:4, label:'Thursday', shortLabel:'Thu' },
  { weekday:5, label:'Friday', shortLabel:'Fri' },
  { weekday:6, label:'Saturday', shortLabel:'Sat' },
  { weekday:7, label:'Sunday', shortLabel:'Sun' },
];
export const FLOW_FM_AVAILABILITY_PRESETS = [
  { key:'morning', label:'Morning', start:'09:00', end:'12:00' },
  { key:'afternoon', label:'Afternoon', start:'12:00', end:'16:00' },
  { key:'evening', label:'Evening', start:'17:00', end:'20:00' },
];

export function normalizeFlowFmAvailabilityWindows(windows, fallback=[{start:'09:00',end:'12:00'}]){
  const normalized=(Array.isArray(windows)?windows:[]).map(window=>({
    start:String(window?.start??window?.starts_at??'').slice(0,5),
    end:String(window?.end??window?.ends_at??'').slice(0,5),
  })).filter(window=>/^\d{2}:\d{2}$/.test(window.start)&&/^\d{2}:\d{2}$/.test(window.end));
  return normalized.length?normalized:fallback.map(window=>({...window}));
}
export function flowFmAvailabilityWindowsEqual(left,right){
  return JSON.stringify(normalizeFlowFmAvailabilityWindows(left,[]))===JSON.stringify(normalizeFlowFmAvailabilityWindows(right,[]));
}
export function matchingFlowFmAvailabilityPreset(windows){
  const normalized=normalizeFlowFmAvailabilityWindows(windows,[]);
  if(normalized.length!==1) return 'exact';
  const match=FLOW_FM_AVAILABILITY_PRESETS.find(preset=>preset.start===normalized[0].start&&preset.end===normalized[0].end);
  return match?.key||'exact';
}
export function formatFlowFmAvailabilityTime(value){
  const [hourText,minute='00']=String(value||'').slice(0,5).split(':');
  const hour=Number(hourText);
  if(!Number.isInteger(hour)||hour<0||hour>23) return '';
  const suffix=hour>=12?'PM':'AM';
  const displayHour=hour%12||12;
  return `${displayHour}:${minute} ${suffix}`;
}
export function formatFlowFmAvailabilityDayList(weekdays){
  const values=[...new Set((Array.isArray(weekdays)?weekdays:[]).map(Number).filter(day=>day>=1&&day<=7))].sort((a,b)=>a-b);
  if(!values.length) return '';
  const label=day=>FLOW_FM_WEEKDAYS.find(item=>item.weekday===day)?.shortLabel||String(day);
  const ranges=[];
  let start=values[0];
  let previous=values[0];
  for(let index=1;index<=values.length;index+=1){
    const current=values[index];
    if(current===previous+1){previous=current;continue;}
    const length=previous-start+1;
    ranges.push(length>=3?`${label(start)}–${label(previous)}`:length===2?`${label(start)} + ${label(previous)}`:label(start));
    start=current;previous=current;
  }
  return ranges.join(' · ');
}
export function summarizeFlowFmAvailabilityDays(days){
  const available=(Array.isArray(days)?days:[]).filter(day=>day?.available);
  if(!available.length) return {status:'Resting this season',detail:'No client calls'};
  const dayText=formatFlowFmAvailabilityDayList(available.map(day=>day.weekday));
  const firstWindows=normalizeFlowFmAvailabilityWindows(available[0]?.windows,[]);
  const shared=available.every(day=>flowFmAvailabilityWindowsEqual(day.windows,firstWindows));
  if(shared&&firstWindows.length===1){
    return {status:dayText,detail:`${formatFlowFmAvailabilityTime(firstWindows[0].start)}–${formatFlowFmAvailabilityTime(firstWindows[0].end)}`};
  }
  if(shared){return {status:dayText,detail:`${firstWindows.length} time windows`};}
  return {status:`${available.length} available ${available.length===1?'day':'days'}`,detail:'Custom hours'};
}

export function validateFlowFmAvailabilitySeason(innerSeason, days){
  if(!FLOW_FM_INNER_SEASONS.includes(innerSeason)) throw new Error('Choose a valid Inner Season.');
  if(!Array.isArray(days) || days.length !== 7) throw new Error('Include Monday through Sunday before saving.');
  const seen = new Set();
  const normalized = days.map(day=>{
    const weekday=Number(day?.weekday);
    if(!Number.isInteger(weekday) || weekday<1 || weekday>7 || seen.has(weekday)) throw new Error('Each weekday may appear once.');
    seen.add(weekday);
    const available=Boolean(day?.available);
    const windows=Array.isArray(day?.windows)?day.windows:[];
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
