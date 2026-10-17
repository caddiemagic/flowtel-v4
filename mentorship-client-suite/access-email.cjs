// Owner-triggered welcome message. No account creation, login token, or membership grant.
const crypto=require('node:crypto');
const {fetchJson,serviceHeaders,publicOrigin,normalizeEmail}=require('../server/guest-house-server.js');
const {branding}=require('../server/branded-email.js');
const {failure}=require('./request.cjs');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function configured(){return Boolean(process.env.RESEND_API_KEY&&branding('flowtel').from);}
async function preview(ctx,{enrollmentId}){
 if(!ctx?.user?.id||!ctx?.serviceKey||!ctx?.supabaseUrl)throw failure('Verified owner context required',403);
 if(!UUID.test(String(enrollmentId||'')))throw failure('Valid enrollment ID required',400);
 const rows=await fetchJson(ctx.supabaseUrl+'/rest/v1/flowtel_mentorship_enrollments?select=id,invited_email,status,offering_snapshot&id=eq.'+enrollmentId+'&limit=1',{headers:serviceHeaders(ctx.serviceKey)});
 const row=rows?.[0];if(!row)throw failure('Enrollment not found',404);
 if(!['invited','active'].includes(row.status))throw failure('Prepare access before sending an email. Only prepared or active mentorships can receive access emails.',409);
 const email=normalizeEmail(row.invited_email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw failure('The enrollment needs a valid client email.',400);
 const title=String(row.offering_snapshot?.title||'Private mentorship').slice(0,200);
 const url=new URL('/mentorship-client-suite/my-mentorship/',publicOrigin());url.searchParams.set('enrollmentId',row.id);
 const setup=new URL('/client/',publicOrigin()).href;
 const subject='Your private mentorship suite is ready';
 const text=`Welcome, beautiful.\n\nYour ${title} mentorship suite is ready inside the Flowtel. This is your home for upcoming calls, private recordings, and your monthly focus.\n\nOpen my mentorship:\n${url.href}\n\nAlready have a Flowtel account? Sign in using ${email}. On your first visit, choose “Activate this mentorship” if prompted.\n\nNew to Flowtel? Open ${setup} to complete the existing Flowtel account or membership setup using ${email}. Then return to your mentorship link and sign in. If you need help with access, reply to this email.\n\nYour suite is private: this link requires your verified Flowtel account and does not grant access to anyone else.\n\nWith love,\nMegan Michele`;
 return {enrollmentId:row.id,email,subject,text,url:url.href,configured:configured()};
}
function html(message){return `<div style="max-width:600px;margin:auto;padding:36px;background:#fff9f0;color:#715144;font:16px/1.7 Georgia,serif"><p style="font:11px Arial;letter-spacing:3px;color:#aa8552">FLOWTEL · PRIVATE MENTORSHIP</p><h1 style="font-weight:400">Your suite is ready.</h1>${message.text.split('\n\n').map((p,i)=>i===2?`<p><a href="${escape(message.url)}" style="display:inline-block;padding:14px 24px;background:#906c5b;color:#fff9ef;text-decoration:none;border:1px solid #b49363;border-radius:8px">Open my mentorship</a></p>`:`<p>${escape(p).replaceAll('\n','<br>')}</p>`).join('')}</div>`;}
async function send(ctx,input){
 const message=await preview(ctx,input);
 if(!message.configured)throw failure('Flowtel email delivery is not configured. You can copy the access link below; no email was sent.',503);
 const b=branding('flowtel');
 const payload={from:b.from.includes('<')?b.from:`${b.name} <${b.from}>`,to:[message.email],subject:message.subject,text:message.text,html:html(message),...(process.env.FLOWTEL_EMAIL_REPLY_TO?{reply_to:process.env.FLOWTEL_EMAIL_REPLY_TO}:{})};
 // Same enrollment/message retries share a provider idempotency key (24-hour provider window).
 const key='mentorship-access-'+crypto.createHash('sha256').update(message.enrollmentId+JSON.stringify(payload)).digest('hex');
 let result;try{result=await fetchJson('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload)});}catch{throw failure('Email delivery could not be confirmed. Retry the same message safely; if this continues, check the Flowtel email sender configuration.',502);}
 if(!result?.id)throw failure('Email delivery could not be confirmed. Retry the same message safely.',502);
 return {email:message.email,status:'accepted',message:'Access email accepted for delivery. Inbox delivery is not yet confirmed.'};
}
module.exports={configured,preview,send,html};
