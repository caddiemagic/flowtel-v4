// Flowtel v0.10.58 — optional owner-triggered Guest House invitation email.
// The recording is never attached. When email delivery is not configured, the
// Concierge can still copy and share the secure Replay Room link manually.

const {
  fetchJson,hashToken,publicOrigin,readRequestBody,requireOwner,sendError,serviceHeaders,setPublicCors,validToken,
}=require('../server/guest-house-server.js');

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

module.exports=async function handler(req,res){
  setPublicCors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Use POST to share a private Replay Room invitation.'});

  try{
    const owner=await requireOwner(req);
    const body=await readRequestBody(req);
    const requestId=String(body.requestId || '').trim();
    const token=String(body.token || '').trim();
    if(!requestId || !validToken(token)){const error=new Error('Prepare a fresh private Replay Room link first.');error.statusCode=400;throw error;}

    const tokenHash=hashToken(token);
    const requests=await fetchJson(
      `${owner.supabaseUrl}/rest/v1/flowtel_guest_house_requests?select=id,guest_id,status,access_expires_at,access_revoked_at&`+
      `id=eq.${encodeURIComponent(requestId)}&access_token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
      {method:'GET',headers:serviceHeaders(owner.serviceKey)}
    );
    const request=Array.isArray(requests) ? requests[0] : null;
    if(!request || request.access_revoked_at || !request.access_expires_at || new Date(request.access_expires_at)<=new Date()){
      const error=new Error('This private Replay Room link is no longer active.');error.statusCode=400;throw error;
    }

    const guests=await fetchJson(
      `${owner.supabaseUrl}/rest/v1/flowtel_guest_house_guests?select=first_name,last_name,email&id=eq.${encodeURIComponent(request.guest_id)}&limit=1`,
      {method:'GET',headers:serviceHeaders(owner.serviceKey)}
    );
    const guest=Array.isArray(guests) ? guests[0] : null;
    if(!guest?.email) throw new Error('The Guest House request has no delivery email.');

    const resendKey=String(process.env.RESEND_API_KEY || '').trim();
    const fromEmail=String(process.env.FLOWTEL_GUEST_HOUSE_FROM_EMAIL || '').trim();
    if(!resendKey || !fromEmail){
      const error=new Error('Email delivery is not configured yet. Copy the private Replay Room link and send the link through your preferred message instead.');
      error.statusCode=503;
      throw error;
    }

    const replayUrl=`${publicOrigin()}/guest-house/replay/?key=${encodeURIComponent(token)}`;
    const firstName=guest.first_name || 'Beautiful';
    const expiresLabel=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'}).format(new Date(request.access_expires_at));
    const replyTo=String(process.env.FLOWTEL_GUEST_HOUSE_REPLY_TO || '').trim();
    const payload={
      from:fromEmail,
      to:[guest.email],
      subject:'Your private Flowtel Replay Room is ready',
      text:`${firstName},\n\nYour private 1:1 call replay has been prepared inside the Flowtel Guest House. Open your Replay Room here:\n\n${replayUrl}\n\nThis private room key expires ${expiresLabel}. The recording is not attached to this email.\n\nYou are also warmly invited to enter the Queendom when you feel called: https://www.theidyllcollective.com/queendomhome`,
      html:`<div style="font-family:Georgia,serif;max-width:620px;margin:auto;padding:36px;color:#4b2d31;background:#fffaf3"><p style="letter-spacing:.16em;font-size:12px">THE FLOWTEL GUEST HOUSE</p><h1 style="font-weight:400">Your private Replay Room is ready.</h1><p>${escapeHtml(firstName)}, your 1:1 call replay has been prepared and is waiting safely for you.</p><p><a href="${escapeHtml(replayUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#6c3344;color:white;text-decoration:none">OPEN MY REPLAY ROOM</a></p><p style="font-size:13px">This private room key expires ${escapeHtml(expiresLabel)}. Your recording is not attached to this email.</p><hr style="border:0;border-top:1px solid #dfc9ae;margin:30px 0"><p>You are warmly invited to enter the Queendom when you feel called.</p><p><a href="https://www.theidyllcollective.com/queendomhome">Join the Queendom</a></p></div>`,
    };
    if(replyTo) payload.reply_to=replyTo;

    await fetchJson('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},
      body:JSON.stringify(payload),
    });

    const now=new Date().toISOString();
    await Promise.all([
      fetchJson(`${owner.supabaseUrl}/rest/v1/flowtel_guest_house_requests?id=eq.${encodeURIComponent(request.id)}`,{
        method:'PATCH',headers:serviceHeaders(owner.serviceKey,'return=minimal'),
        body:JSON.stringify({status:'delivered',delivered_at:now,updated_at:now}),
      }),
      fetchJson(`${owner.supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
        method:'POST',headers:serviceHeaders(owner.serviceKey,'return=minimal'),
        body:JSON.stringify({request_id:request.id,actor_id:owner.user.id,event_type:'invitation_sent',event_context:{channel:'email'}}),
      }),
    ]);

    return res.status(200).json({ok:true,email:guest.email,message:'Private Replay Room invitation emailed.'});
  }catch(error){return sendError(res,error,'The private invitation could not be shared.');}
};
