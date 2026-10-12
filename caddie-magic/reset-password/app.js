import { supabase } from '../../shared/supabase.js';
import { sendPasswordResetEmail, updateCurrentPassword } from '../../shared/auth.js';
const $=id=>document.getElementById(id);
let recoveryAuthorized=false;
let sending=false;
const returnedRecovery=new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery'||new URLSearchParams(window.location.hash.slice(1)).get('type')==='invite';
function message(text){$('recoveryMessage').textContent=text;}
function showPassword(){recoveryAuthorized=true;$('requestPanel').classList.add('hidden');$('passwordPanel').classList.remove('hidden');message('Your recovery link is verified. Choose a password with at least eight characters.');$('newPassword').focus();}
// No async Supabase call inside an auth callback: avoid client lock deadlocks.
supabase.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY' && session?.user)showPassword();});
async function initialize(){
  const fragment=new URLSearchParams(window.location.hash.slice(1));
  if(fragment.has('error') || fragment.has('error_description')){message('This recovery link could not be opened. Request a fresh link below.');history.replaceState(null,'',window.location.pathname);return;}
  if(returnedRecovery){
    const {data,error}=await supabase.auth.getUser();
    if(!error && data?.user){showPassword();history.replaceState(null,'',window.location.pathname);}
    else message('This link has expired or could not be verified. Request a fresh reset link.');
  }
}
$('requestForm').addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;
  sending=true;$('requestButton').disabled=true;message('Requesting your reset link…');
  try{
    await sendPasswordResetEmail($('resetEmail').value.trim().toLowerCase(),new URL('/caddie-magic/reset-password/',window.location.origin).href);
    message('If this email has an account, a reset link will arrive shortly. Check your inbox and spam folder.');
    // Reduce accidental repeat requests without implying that an account exists.
    setTimeout(()=>{$('requestButton').disabled=false;sending=false;},30000);
  }catch(error){message(error?.status===429?'Please wait a moment before requesting another link.':'The reset email could not be requested. Please try again shortly.');$('requestButton').disabled=false;sending=false;}
});
$('passwordForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!recoveryAuthorized){message('Open the reset link from your email first.');return;}
  const password=$('newPassword').value;
  if(password.length<8 || password!==$('confirmPassword').value){message('Use at least eight characters and make sure both passwords match.');return;}
  $('saveButton').disabled=true;
  try{
    await updateCurrentPassword(password);recoveryAuthorized=false;
    $('newPassword').value='';$('confirmPassword').value='';$('passwordPanel').classList.add('hidden');
    message('Your password is updated. Return to Player Login and enter with your new password.');
  }catch(error){message(error?.message || 'Your password could not be updated. Request a fresh recovery link if this one has expired.');}
  finally{$('saveButton').disabled=false;}
});
initialize().catch(()=>message('This recovery link could not be verified. Request a fresh link.'));
