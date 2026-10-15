// Pure mentorship enrollment preparation. No database writes, emails, or bookings.
// All date arithmetic here is calendar-based. Appointments still require server-side
// timezone/DST resolution and live Acuity conflict checking before confirmation.
export const OFFERINGS = Object.freeze({
 womb_activation: Object.freeze({name:"Womb Activation",priceCents:77700,months:null,days:14,activationMinutes:180,empowermentCount:0,empowermentMinutes:0,intervalDays:null,flexibleCount:0,flexibleMinutes:0,telegram:true}),
 sacred_self_study: Object.freeze({name:"Sacred Self-Study",priceCents:377700,months:3,days:null,activationMinutes:180,empowermentCount:6,empowermentMinutes:90,intervalDays:14,flexibleCount:0,flexibleMinutes:0,telegram:true}),
 kundalini_creatrix: Object.freeze({name:"The Kundalini Creatrix",priceCents:577700,months:9,days:null,activationMinutes:180,empowermentCount:18,empowermentMinutes:90,intervalDays:14,flexibleCount:0,flexibleMinutes:0,telegram:true}),
 four_sessions: Object.freeze({name:"Four 45-Minute Sessions",priceCents:39900,months:null,days:null,activationMinutes:0,empowermentCount:0,empowermentMinutes:0,intervalDays:null,flexibleCount:4,flexibleMinutes:45,telegram:false})
});
function parseISO(date) {
 if (typeof date!=="string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) throw Error("Valid ISO start date required");
 const d=new Date(date+"T12:00:00Z");
 if (!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date) throw Error("Invalid calendar date");
 return d;
}
function fmt(d){return d.toISOString().slice(0,10);}
function addDays(day,n){const d=parseISO(day);d.setUTCDate(d.getUTCDate()+n);return fmt(d);}
function addMonthsClamped(day,months) {
 const d=parseISO(day), targetMonth=d.getUTCMonth()+months, sourceDay=d.getUTCDate();
 const target=new Date(Date.UTC(d.getUTCFullYear(),targetMonth,1,12));
 const max=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate();
 target.setUTCDate(Math.min(sourceDay,max));return fmt(target);
}
export function prepareEnrollment({offeringKey,startDate=null,activationDate=null,firstEmpowermentDate=null,localTime="11:00",timezone="America/Los_Angeles"}) {
 const o=OFFERINGS[offeringKey];if(!o) throw Error("Unknown offering");
 if(!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(localTime)) throw Error("Invalid local time");
 if(timezone!=="America/Los_Angeles") throw Error("Flowtel Time is required for this preview");
 if(startDate) parseISO(startDate);
 let endDate=null;
 if(startDate&&o.days!==null)endDate=addDays(startDate,o.days);
 if(startDate&&o.months!==null)endDate=addMonthsClamped(startDate,o.months);
 const sessions=[];
 if(o.activationMinutes){
  if(!activationDate)throw Error("Activation date required");
  parseISO(activationDate);
  sessions.push({sessionNumber:1,kind:"activation",durationMinutes:o.activationMinutes,localDate:activationDate,localTime,timezone,status:"proposed"});
 }
 if(o.empowermentCount){
  if(!firstEmpowermentDate)throw Error("First empowerment date required");
  parseISO(firstEmpowermentDate);
  for(let i=0;i<o.empowermentCount;i++)sessions.push({sessionNumber:sessions.length+1,kind:"empowerment",durationMinutes:o.empowermentMinutes,localDate:addDays(firstEmpowermentDate,i*o.intervalDays),localTime,timezone,status:"proposed"});
 }
 for(let i=0;i<o.flexibleCount;i++)sessions.push({sessionNumber:sessions.length+1,kind:"flexible",durationMinutes:o.flexibleMinutes,localDate:null,localTime:null,timezone,status:"unscheduled"});
 const warnings=[];
 if(!startDate)warnings.push("Program start and end dates must be set before activation.");
 if(startDate && sessions.some(s=>s.localDate&&s.localDate<startDate)) warnings.push("Some proposed calls predate the mentorship start.");
 if(endDate && sessions.some(s=>s.localDate&&s.localDate>=endDate)) warnings.push("Some proposed calls fall outside the program window.");
 if(!endDate)warnings.push("No package expiry is assumed; clarify terms before activation.");
 warnings.push("No real calendar conflicts or timezone offsets have been checked.");
 return {offeringKey,offeringSnapshot:{...o},startDate,endDate,supportStart:o.telegram?startDate:null,supportEnd:o.telegram?endDate:null,sessions,warnings,approvalRequired:true};
}
