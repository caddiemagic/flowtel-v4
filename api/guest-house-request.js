// Flowtel v0.10.63 — legacy public replay-request endpoint retired.
// Requests now begin only after the former client signs into her Guest House account.

const { setPublicCors }=require('../server/guest-house-server.js');

module.exports=async function handler(req,res){
  setPublicCors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  return res.status(410).json({
    ok:false,
    error:'Guest House replay requests now begin inside a private Guest House account. Return to /guest-house/ to create an account or sign in.',
    accountRequired:true,
  });
};
