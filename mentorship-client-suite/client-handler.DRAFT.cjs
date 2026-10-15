// DRAFT server endpoint only. Do not publish under api/ until schema and access review.
// Unlike owner concierge endpoints, this grants no owner or member-wide privileges.
const {requireUser,readRequestBody,sendError,setPublicCors}=require('../server/guest-house-server.js');
const {clientSuite,listMyMentorships,listPreparedMentorships,claimPreparedMentorship}=require('./client-repository.cjs');
module.exports=async function mentorshipClientHandler(req,res){
 setPublicCors(res,'GET, POST, OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'Method not allowed'});
 try{
  const ctx=await requireUser(req);
  if(req.method==='POST'){
   const body=await readRequestBody(req);
   if(body?.action!=='claim-prepared')return res.status(400).json({ok:false,error:'Unsupported action'});
   const enrollment=await claimPreparedMentorship(ctx,body.enrollmentId);
   return res.status(200).json({ok:true,enrollment});
  }
  if(req.query?.prepared==='1')return res.status(200).json({ok:true,prepared:await listPreparedMentorships(ctx)});
  const requested=req.query?.enrollmentId;
  if(requested===undefined)return res.status(200).json({ok:true,enrollments:await listMyMentorships(ctx)});
  if(typeof requested!=='string')return res.status(400).json({ok:false,error:'Enrollment ID required'});
  const suite=await clientSuite(ctx,requested);
  return res.status(200).json({ok:true,suite});
 }catch(error){
  if(error?.statusCode===401||error?.statusCode===403||error?.statusCode===404||error?.statusCode===409)return sendError(res,error,'Mentorship not available');
  console.error('Mentorship private suite request failed',error);
  return res.status(error?.message==='Invalid mentorship enrollment ID'?400:500).json({ok:false,error:'Could not open this mentorship suite.'});
 }
};
