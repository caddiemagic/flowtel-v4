// Explicit fictional design preview. Never reads auth, calls an API, or grants access.
import {flowtelTodayISO} from '../shared/flowtel-date.js';
const today=flowtelTodayISO(),month=today.slice(0,7)+'-01';
const future=new Date(Date.now()+3*86400000).toISOString().slice(0,10)+'T19:00:00Z';
const past=new Date(Date.now()-14*86400000).toISOString();
const endDate=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1+3,1)).toISOString().slice(0,10);
const enrollment={id:'fictional-journey',programTitle:'Sacred Self-Study',status:'active',startsOn:today.slice(0,7)+'-01',endsOn:endDate};
const sessions=Array.from({length:7},(_,i)=>({id:'fictional-session-'+i,session_number:i+1,session_kind:i===0?'activation':'empowerment',duration_minutes:i===0?180:90,status:i<2?'completed':i===2?'confirmed':'unscheduled',scheduled_at:i<2?past:i===2?future:null}));
const suite={enrollment,sessions,monthlyFocus:[{focus_month:month,client_visible_focus:'Learning to receive support without feeling the need to earn it.\n\nNotice where a little more space allows something new to arrive.'}],replays:[{id:'fictional-replay',sessionId:sessions[0].id,title:'Opening Womb Activation'},{id:'fictional-replay-2',sessionId:sessions[1].id,title:'Integration & Receiving'}]};
export const demoAuth={auth:{getSession:async()=>({data:{session:{access_token:'fictional',user:{id:'fictional'}}}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}}};
export async function demoRequest(params,body){
 if(body)throw Error('This is a fictional preview. No changes are saved.');
 const query=new URLSearchParams(params.replace(/^&/,''));
 if(query.has('playbackReplayId'))throw Error('This is a fictional preview. Recordings are not connected.');
 if(query.get('context')==='1')return {context:{cycle:{day:22,season:'Inner Autumn',asOf:today}}};
 if(query.get('prepared')==='1')return {prepared:[]};
 if(query.has('enrollmentId'))return {suite};
 return {enrollments:[enrollment]};
}
