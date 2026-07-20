// Flowtel v0.10.63 — password-based Guest House account creation without email delivery.

const {
  fetchJson,normalizeEmail,readRequestBody,sendError,serverConfig,serviceHeaders,setPublicCors,trimTo,
}=require('../server/guest-house-server.js');

function validate(values={}){
  const firstName=trimTo(values.firstName || values.first_name,100);
  const lastName=trimTo(values.lastName || values.last_name,100);
  const email=normalizeEmail(values.email);
  const password=String(values.password || '');
  const website=String(values.website || '').trim();

  if(website){const error=new Error('This Guest House account could not be prepared.');error.statusCode=400;throw error;}
  if(!firstName){const error=new Error('Enter your first name.');error.statusCode=400;throw error;}
  if(!lastName){const error=new Error('Enter your last name.');error.statusCode=400;throw error;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>320){
    const error=new Error('Enter a valid email address.');error.statusCode=400;throw error;
  }
  if(password.length<8){const error=new Error('Create a password with at least 8 characters.');error.statusCode=400;throw error;}
  if(password.length>72){const error=new Error('Keep your Guest House password under 72 characters.');error.statusCode=400;throw error;}
  return {firstName,lastName,email,password};
}

function isExistingUserError(error){
  const message=String(error?.message || '').toLowerCase();
  return error?.statusCode===422 || /already.*registered|already exists|user.*exists|duplicate/.test(message);
}

module.exports=async function handler(req,res){
  setPublicCors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Use POST to create a Guest House account.'});

  try{
    const values=validate(await readRequestBody(req));
    const {supabaseUrl,serviceKey}=serverConfig();
    const created=await fetchJson(`${supabaseUrl}/auth/v1/admin/users`,{
      method:'POST',
      headers:serviceHeaders(serviceKey),
      body:JSON.stringify({
        email:values.email,
        password:values.password,
        email_confirm:true,
        user_metadata:{
          first_name:values.firstName,
          last_name:values.lastName,
          full_name:`${values.firstName} ${values.lastName}`.trim(),
          source:'flowtel_guest_house',
          guest_house_only:true,
        },
      }),
    });
    const user=created?.user || created;
    if(!user?.id) throw new Error('The Guest House could not finish preparing your account.');

    return res.status(201).json({
      ok:true,
      message:'Your private Guest House account is ready.',
    });
  }catch(error){
    if(isExistingUserError(error)){
      return res.status(409).json({
        ok:false,
        error:'An account already exists for this email. Choose Return to the Guest House and sign in with your existing password.',
        existingAccount:true,
      });
    }
    return sendError(res,error,'Your Guest House account could not be prepared just now.');
  }
};
