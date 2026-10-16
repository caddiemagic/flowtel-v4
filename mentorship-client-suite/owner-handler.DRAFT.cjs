const controls=require('./session-controls.cjs');
const recordings=require('./replay-owner.cjs');
const guards=require('./request.cjs');
// Owner handler routed through the existing caddie-acuity mentorship dispatcher.
const {requireOwner,readRequestBody,sendError,setPublicCors}=require('../server/guest-house-server.js');
const {listOfferings,createDraftEnrollment,saveClientFocus,listEnrollments,updateDraftEnrollment,prepareInvitation,prepareSessions,listSessions,setSessionTime}=require('./owner-repository.cjs');
module.exports=async function ownerMentorshipHandler(req,res){
 setPublicCors(res,'GET, POST, OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'Method not allowed'});
 try{
  // Real owner verification uses existing Flowtel concierge authorization.
  guards.authenticated(req);
  const ctx=await requireOwner(req);
  if(req.method==='GET'){
   if(req.query?.replaysFor)return res.status(200).json({ok:true,replays:await recordings.listReplays(ctx,{enrollmentId:req.query.enrollmentId,sessionId:req.query.replaysFor})});
   if(req.query?.sessionsFor)return res.status(200).json({ok:true,sessions:await listSessions(ctx,{enrollmentId:req.query.sessionsFor})});
   return res.status(200).json({ok:true,offerings:await listOfferings(ctx),enrollments:await listEnrollments(ctx)});
  }
  const body=await guards.body(req);
  if(body?.action==='session-transition')return res.status(200).json({ok:true,session:await controls.transition(ctx,body)});
  if(body?.action==='begin-upload')return res.status(200).json({ok:true,upload:await recordings.beginUpload(ctx,body)});
  if(body?.action==='finish-upload')return res.status(201).json({ok:true,replay:await recordings.finishUpload(ctx,body)});
  if(body?.action==='replay-visibility')return res.status(200).json({ok:true,replay:await recordings.visibility(ctx,body)});
  if(body?.action==='create-draft'){
   const enrollment=await createDraftEnrollment(ctx,{email:body.email,offeringId:body.offeringId,startsOn:body.startsOn});
   return res.status(201).json({ok:true,enrollment});
  }
  if(body?.action==='update-draft'){
   const enrollment=await updateDraftEnrollment(ctx,{enrollmentId:body.enrollmentId,startsOn:body.startsOn});
   return res.status(200).json({ok:true,enrollment});
  }
  if(body?.action==='set-session-time'){
   const session=await setSessionTime(ctx,{enrollmentId:body.enrollmentId,sessionId:body.sessionId,scheduledAt:body.scheduledAt});
   return res.status(200).json({ok:true,session});
  }
  if(body?.action==='prepare-sessions'){
   const plan=await prepareSessions(ctx,{enrollmentId:body.enrollmentId});
   return res.status(200).json({ok:true,...plan});
  }
  if(body?.action==='prepare-access'){
   const enrollment=await prepareInvitation(ctx,{enrollmentId:body.enrollmentId});
   return res.status(200).json({ok:true,enrollment});
  }
  if(body?.action==='save-focus'){
   const record=await saveClientFocus(ctx,{enrollmentId:body.enrollmentId,month:body.month,focus:body.focus});
   return res.status(200).json({ok:true,focus:record});
  }
  return res.status(400).json({ok:false,error:'Unsupported action'});
 }catch(error){
  // Avoid reflecting database internals in browser for 5xx failures.
  if(!error?.statusCode || Number(error.statusCode)>=500){
    console.error('Mentorship owner request failed',error);
    return res.status(500).json({ok:false,error:'This mentorship action could not be saved. Please try again; if it repeats, tell us which button you clicked.'});
  }
  return sendError(res,error,'Mentorship Concierge request failed.');
 }
};
