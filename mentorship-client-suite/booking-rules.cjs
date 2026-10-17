// Canonical Acuity class names supplied by the owner. No fuzzy class matching.
const COACHING='1:1 Intuitive Coaching + Energy Reading';
const EMPOWERMENT='Madly In Love Mentorship Call';
function expectedClass(session,snapshot={}){
 if(session.session_kind==='flexible'&&snapshot?.offering_key==='four_sessions')return COACHING;
 if(session.session_kind==='empowerment')return EMPOWERMENT;
 return null;
}
const normalized=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').toLowerCase():'';
function matchesClass(appointment,expected){return Boolean(expected)&&normalized(appointment.external_payload?.type)===normalized(expected);}
module.exports={expectedClass,matchesClass,COACHING,EMPOWERMENT};
