// 13 Moons Big Vision Vortex — pure calendar mapping, no member data writes.
export const VORTEX_MOONS=Object.freeze([
  ['Rose Moon','West Wing','Winter'],['Honey Moon','South Wing','Spring'],
  ['Naked Moon','South Wing','Spring'],['Creatrix Moon','South Wing','Spring'],
  ['Mother Moon','East Wing','Summer'],['Money Moon','East Wing','Summer'],
  ['Dragon Moon','East Wing','Summer'],['Wild Woman Moon','North Wing','Autumn'],
  ['Lover Moon','North Wing','Autumn'],['Blood Moon','North Wing','Autumn'],
  ['Temple Moon','West Wing','Winter'],['Serpent Moon','West Wing','Winter']
].map(([name,wing,season],index)=>Object.freeze({calendarMonth:index+1,name,wing,season})));
export function flowtelEntryMonth(date=new Date()){
  const instant=date instanceof Date?date:new Date(date);
  if(!Number.isFinite(instant.getTime()))throw new TypeError('Invalid date');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit'}).formatToParts(instant);
  return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;
}
export function generateBigVisionVortex(startMonth){
  const match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(startMonth||''));
  if(!match)throw new TypeError('Expected YYYY-MM starting month');
  const year=Number(match[1]),month=Number(match[2]);
  if(year<1900||year>9998)throw new RangeError('Invalid year');
  return Array.from({length:13},(_,index)=>{
    const absolute=year*12+month-1+index;
    const mappedMonth=absolute%12+1;
    return Object.freeze({position:index+1,month:`${Math.floor(absolute/12)}-${String(mappedMonth).padStart(2,'0')}`,...VORTEX_MOONS[mappedMonth-1]});
  });
}
export function isVortexComplete(reflections){
  // Position 1 is the present moon and intentionally receives no wish.\n  // Positions 2–13 must each contain one future-month wish before sealing.\n  return Array.isArray(reflections)&&reflections.length===13&&\n    reflections[0]===''&&reflections.slice(1).every(s=>typeof s==='string'&&s.trim().length>0&&s.length<=4000);
}
