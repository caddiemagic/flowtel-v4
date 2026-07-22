// Flowtel v0.10.72 — pure Time + Space presentation helpers.

export const TIME_SPACE_HEMISPHERE_LABELS = Object.freeze({
  northern: 'Northern Hemisphere',
  southern: 'Southern Hemisphere',
  equatorial: 'Equatorial / seasonal context varies',
});

export function normalizeTimeZone(value){
  const timezone = String(value || '').trim();
  if(!timezone) return null;
  try{
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  }catch(_error){
    return null;
  }
}

export function localDateParts(timezone, now = new Date()){
  const safeTimeZone = normalizeTimeZone(timezone);
  if(!safeTimeZone) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    weekday: 'short',
  }).formatToParts(now).reduce((output, part) => {
    if(part.type !== 'literal') output[part.type] = part.value;
    return output;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday || '',
    hour: parts.hour || '',
    minute: parts.minute || '',
    dayPeriod: parts.dayPeriod || '',
  };
}

export function outerSeasonForHemisphere(hemisphere, month){
  const normalized = String(hemisphere || '').trim().toLowerCase();
  const numericMonth = Number(month);
  if(normalized === 'equatorial') return 'Season varies locally';
  if(!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) return 'Seasonal context needed';

  let northernSeason;
  // Flowtel's established outer-season cadence: Winter Nov–Jan,
  // Spring Feb–Apr, Summer May–Jul, Autumn Aug–Oct.
  if([11,12,1].includes(numericMonth)) northernSeason = 'Winter';
  else if([2,3,4].includes(numericMonth)) northernSeason = 'Spring';
  else if([5,6,7].includes(numericMonth)) northernSeason = 'Summer';
  else northernSeason = 'Autumn';

  if(normalized === 'northern') return `Outer ${northernSeason}`;
  if(normalized === 'southern'){
    const opposite = { Winter: 'Summer', Spring: 'Autumn', Summer: 'Winter', Autumn: 'Spring' };
    return `Outer ${opposite[northernSeason]}`;
  }
  return 'Hemisphere needed';
}

export function timeAndSpacePresentation(member = {}, now = new Date()){
  const timezone = normalizeTimeZone(member.timezone);
  const parts = timezone ? localDateParts(timezone, now) : null;
  const localTime = timezone
    ? new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(now)
    : 'Time zone needed';
  const localDate = timezone
    ? new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }).format(now)
    : 'Local date unavailable';
  return {
    ...member,
    timezone,
    localTime,
    localDate,
    hemisphereLabel: TIME_SPACE_HEMISPHERE_LABELS[String(member.hemisphere || '').toLowerCase()] || 'Hemisphere needed',
    outerSeason: outerSeasonForHemisphere(member.hemisphere, parts?.month),
  };
}
