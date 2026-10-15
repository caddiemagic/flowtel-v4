// Safe view-model projector for the private Client Suite.
// Call ONLY on server-authorized records scoped to the authenticated client.
// Does not perform authorization itself, fetch data, or expose mentor notes.
export function toClientSuite({enrollment,offering,sessions=[],focus=null,replays=[],cycle=null}) {
 if (!enrollment || !offering) throw new Error("Enrollment and offering are required");
 const safeSessions = sessions
   .filter(s=>s.enrollment_id===enrollment.id)
   .map(s=>({id:s.id,number:s.session_number,kind:s.session_kind,
      durationMinutes:s.duration_minutes,startsAt:s.scheduled_at||null,
      status:s.status}))
   .sort((a,b)=>a.number-b.number);
 const visibleReplays = replays
   .filter(r=>r.visible_to_client===true && safeSessions.some(s=>s.id===r.session_id))
   .map(r=>({id:r.id,sessionId:r.session_id,title:r.title}));
 const completed=safeSessions.filter(s=>s.status==="completed").length;
 const upcoming=safeSessions.filter(s=>s.status==="confirmed"&&s.startsAt)
   .sort((a,b)=>a.startsAt.localeCompare(b.startsAt))[0]||null;
 return {
   offering:{name:offering.title,priceCents:offering.price_cents},
   program:{status:enrollment.status,startDate:enrollment.starts_on,endDate:enrollment.ends_on,
     supportEnd:enrollment.support_ends_on},
   progress:{completed,total:safeSessions.length,remaining:safeSessions.length-completed},
   nextCall:upcoming,
   sessions:safeSessions,
   monthlyFocus:focus?.client_visible_focus||null,
   replays:visibleReplays,
   cycle:cycle?{day:cycle.day??null,season:cycle.season??null,asOf:cycle.asOf??null}:null
 };
}
