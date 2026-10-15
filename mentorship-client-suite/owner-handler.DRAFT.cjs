// Draft Vercel handler; intentionally lives INSIDE mentorship-client-suite/
// and is not published as a /api route until schema + authorization tests pass.
const {requireOwner,readRequestBody,sendError,setPublicCors}=require('../server/guest-house-server.js');
const {listOfferings,createDraftEnrollment,saveClientFocus,listEnrollments,updateDraftEnrollment}=require('./owner-repository.cjs');
module.exports=async function ownerMentorshipHandler(req,res){
 setPublicCors(res,'GET, POST, OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'Method not allowed'});
 try{
  // Real owner verification uses existing Flowtel concierge authorization.
  const ctx=await requireOwner(req);
  if(req.method==='GET')return res.status(200).json({ok:true,offerings:await listOfferings(ctx),enrollments:await listEnrollments(ctx)});
  const body=await readRequestBody(req);
  if(body?.action==='create-draft'){
   let enrollment=await createDraftEnrollment(ctx,{email:body.email,offeringId:body.offeringId});
   if(body.startsOn)enrollment=await updateDraftEnrollment(ctx,{enrollmentId:enrollment.id,startsOn:body.startsOn});
   return res.status(201).json({ok:true,enrollment});
  }
  if(body?.action==='update-draft'){
   const enrollment=await updateDraftEnrollment(ctx,{enrollmentId:body.enrollmentId,startsOn:body.startsOn});
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
    return res.status(500).json({ok:false,error:'Mentorship Concierge is not available yet.'});
  }
  return sendError(res,error,'Mentorship Concierge request failed.');
 }
};
