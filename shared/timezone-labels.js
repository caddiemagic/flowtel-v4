const DEFAULT_TIMEZONE='America/Los_Angeles';

export function normalizeTimezone(value,{fallback=DEFAULT_TIMEZONE,allowBlank=false}={}){
  const raw=String(value||'').trim();
  if(!raw) return allowBlank?'':fallback;
  try{
    new Intl.DateTimeFormat('en-US',{timeZone:raw}).format(new Date());
    return raw;
  }catch(error){
    return allowBlank?'':fallback;
  }
}

function zonePart(timeZone,date,timeZoneName){
  const zone=normalizeTimezone(timeZone,{allowBlank:true});
  if(!zone) return '';
  try{
    return new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName})
      .formatToParts(date instanceof Date?date:new Date(date))
      .find(part=>part.type==='timeZoneName')?.value||'';
  }catch(error){
    return '';
  }
}

export function timezoneDisplayName(timeZone,date=new Date()){
  const zone=normalizeTimezone(timeZone,{allowBlank:true});
  if(!zone) return '';
  const longName=zonePart(zone,date,'long');
  const shortName=zonePart(zone,date,'short');
  const readable=longName&&longName!==zone?longName:zone.replaceAll('_',' ').replace('/',' · ');
  if(shortName && shortName!==readable && shortName!==zone && !/^GMT[+-]/i.test(shortName)) return `${readable} (${shortName})`;
  return readable;
}

export function timezoneShortName(timeZone,date=new Date()){
  const zone=normalizeTimezone(timeZone,{allowBlank:true});
  if(!zone) return '';
  return zonePart(zone,date,'short')||zone;
}

export function browserTimezone(){
  return normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}
