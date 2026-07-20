// Flowtel v0.10.58 — public Guest House call replay request doorway.
// Creates a minimal Guest House identity only. It never creates an Auth user,
// profile, membership, password, Flowtel stay, or product-access row.

const {
  fetchJson,normalizeEmail,readRequestBody,sendError,serverConfig,serviceHeaders,setPublicCors,trimTo,
}=require('../server/guest-house-server.js');

function validate(body={}){
  const firstName=trimTo(body.firstName || body.first_name,100);
  const lastName=trimTo(body.lastName || body.last_name,100);
  const email=normalizeEmail(body.email);
  const callDateHint=trimTo(body.callDateHint || body.call_date_hint,160);
  const callTopic=trimTo(body.callTopic || body.call_topic,240);
  const requesterNote=trimTo(body.requesterNote || body.requester_note,2000);
  const confirmed=body.confirmed===true || body.requester_confirmed_ownership===true;
  const honeypot=trimTo(body.website,200);

  if(honeypot){
    const error=new Error('Your request could not be received.');error.statusCode=400;throw error;
  }
  if(!firstName || !lastName){const error=new Error('Enter your first and last name.');error.statusCode=400;throw error;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>320){
    const error=new Error('Enter the email address you used for your 1:1 call.');error.statusCode=400;throw error;
  }
  if(!confirmed){const error=new Error('Confirm that you are requesting your own private call replay.');error.statusCode=400;throw error;}
  return {firstName,lastName,email,callDateHint,callTopic,requesterNote};
}

module.exports=async function handler(req,res){
  setPublicCors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Use POST to request a call replay.'});

  try{
    const body=await readRequestBody(req);
    const values=validate(body);
    const {supabaseUrl,serviceKey}=serverConfig();
    const headers=serviceHeaders(serviceKey);

    const [profiles,existingGuests]=await Promise.all([
      fetchJson(
        `${supabaseUrl}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(values.email)}&limit=1`,
        {method:'GET',headers}
      ),
      fetchJson(
        `${supabaseUrl}/rest/v1/flowtel_guest_house_guests?select=id,member_id&email=eq.${encodeURIComponent(values.email)}&limit=1`,
        {method:'GET',headers}
      ),
    ]);
    const existingGuest=Array.isArray(existingGuests) ? existingGuests[0] || null : null;
    const memberId=(Array.isArray(profiles) ? profiles[0]?.id : null) || existingGuest?.member_id || null;

    const guests=await fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_guests?on_conflict=email`,{
      method:'POST',
      headers:serviceHeaders(serviceKey,'resolution=merge-duplicates,return=representation'),
      body:JSON.stringify({
        first_name:values.firstName,
        last_name:values.lastName,
        email:values.email,
        member_id:memberId,
        updated_at:new Date().toISOString(),
      }),
    });
    const guest=Array.isArray(guests) ? guests[0] : guests;
    if(!guest?.id) throw new Error('The Guest House could not prepare your request identity.');

    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const recent=await fetchJson(
      `${supabaseUrl}/rest/v1/flowtel_guest_house_requests?select=id&guest_id=eq.${encodeURIComponent(guest.id)}&created_at=gte.${encodeURIComponent(since)}`,
      {method:'GET',headers}
    );
    if(Array.isArray(recent) && recent.length>=3){
      const error=new Error('Your recent requests are already waiting safely with the Concierge.');
      error.statusCode=429;
      throw error;
    }

    const inserted=await fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_requests`,{
      method:'POST',
      headers:serviceHeaders(serviceKey,'return=representation'),
      body:JSON.stringify({
        guest_id:guest.id,
        call_date_hint:values.callDateHint || null,
        call_topic:values.callTopic || null,
        requester_note:values.requesterNote || null,
        requester_confirmed_ownership:true,
        request_source:'guest_house_public',
        status:'requested',
      }),
    });
    const request=Array.isArray(inserted) ? inserted[0] : inserted;
    if(!request?.id) throw new Error('The Guest House could not preserve your request.');

    await fetchJson(`${supabaseUrl}/rest/v1/flowtel_guest_house_events`,{
      method:'POST',
      headers:serviceHeaders(serviceKey,'return=minimal'),
      body:JSON.stringify({
        request_id:request.id,
        event_type:'request_created',
        event_context:{source:'guest_house_public'},
      }),
    });

    return res.status(201).json({
      ok:true,
      requestReference:String(request.id).slice(0,8).toUpperCase(),
      message:'Your request is waiting safely with the Guest House Concierge.',
    });
  }catch(error){return sendError(res,error,'Your replay request could not be received just now.');}
};
