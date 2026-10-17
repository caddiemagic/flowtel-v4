import {flowtelTodayISO,formatDateOnly} from '../shared/flowtel-date.js';
export const kindLabel=kind=>({activation:'Womb Activation',empowerment:'Empowerment session',flexible:'Private session'}[kind]||'Private session');
export function dateLabel(day){return day?formatDateOnly(day,{month:'short',day:'numeric',year:'numeric'}):'Being prepared';}
export function timeLabel(instant){if(!instant||!Number.isFinite(Date.parse(instant)))return 'Time to be arranged';return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(instant));}
export function filterSessions(sessions,filter='all',now=new Date()){
 if(!['upcoming','history'].includes(filter))return [...sessions];
 return sessions.filter(session=>{
  const end=Date.parse(session.scheduled_at)+Number(session.duration_minutes)*60000;
  const history=['completed','cancelled','missed'].includes(session.status)||(Number.isFinite(end)&&end<now.getTime());
  return filter==='history'?history:!history;
 });
}
export function dashboardModel(suite,now=new Date()){
 const sessions=Array.isArray(suite.sessions)?[...suite.sessions].sort((a,b)=>a.session_number-b.session_number):[];
 const completed=sessions.filter(s=>s.status==='completed').length;
 const cancelled=sessions.filter(s=>s.status==='cancelled').length;
 const upcoming=sessions.filter(s=>s.status==='confirmed'&&Number.isFinite(Date.parse(s.scheduled_at))&&Date.parse(s.scheduled_at)+s.duration_minutes*60000>=now.getTime()).sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at));
 const pastPending=sessions.filter(s=>s.status==='confirmed'&&Number.isFinite(Date.parse(s.scheduled_at))&&Date.parse(s.scheduled_at)+s.duration_minutes*60000<now.getTime());
 const today=flowtelTodayISO(now),month=today.slice(0,7)+'-01';
 const focuses=Array.isArray(suite.monthlyFocus)?[...suite.monthlyFocus].sort((a,b)=>b.focus_month.localeCompare(a.focus_month)):[];
 return {sessions,completed,cancelled,total:sessions.length,remaining:sessions.filter(s=>!['completed','cancelled','missed'].includes(s.status)).length,percent:sessions.length?Math.round(100*completed/sessions.length):0,nextCall:upcoming[0]||null,pastPending,focus:focuses.find(f=>f.focus_month===month)||null,focuses,today};
}

export function replayLibrary(suite){
 const sessions=new Map((suite.sessions||[]).map(session=>[session.id,session]));
 return (suite.replays||[]).map(replay=>{
  const session=sessions.get(replay.sessionId),sessionTime=Date.parse(session?.scheduled_at),addedTime=Date.parse(replay.createdAt);
  const recorded=Number.isFinite(sessionTime),timestamp=recorded?sessionTime:Number.isFinite(addedTime)?addedTime:null;
  return {replay,session,recorded,date:timestamp===null?null:new Date(timestamp).toISOString(),timestamp};
 }).sort((a,b)=>(b.timestamp??-Infinity)-(a.timestamp??-Infinity)||String(a.replay.id).localeCompare(String(b.replay.id)));
}
