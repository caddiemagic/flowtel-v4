import { supabase } from '../../shared/supabase.js';
import { signInWithEmail } from '../../shared/auth.js?v=0.10.49';

const params=new URLSearchParams(window.location.search);
const connection=String(params.get('connection') || '').trim();
const form=document.getElementById('connectForm');
const copy=document.getElementById('connectCopy');
const status=document.getElementById('connectStatus');
const submit=document.getElementById('connectSubmit');
const closeButton=document.getElementById('closeConnect');

function canReturnSession(){return Boolean(connection && window.opener && !window.opener.closed);}
async function returnSession(session){
  if(!session?.access_token || !session?.refresh_token) throw new Error('Your remembered Flowtel room key could not be read.');
  if(!canReturnSession()) throw new Error('Return to the workshop and choose Open My Notes again.');
  window.opener.postMessage({
    type:'flowtel:replay-notes-session',
    connection,
    accessToken:session.access_token,
    refreshToken:session.refresh_token,
  },window.location.origin);
  copy.textContent='Your Flowtel room is open.';
  status.textContent='Returning you to the workshop notes…';
  form.hidden=true;
  closeButton.disabled=true;
  setTimeout(()=>window.close(),650);
}
async function boot(){
  if(!canReturnSession()){
    copy.textContent='Open this room from the replay notes beneath your workshop.';
    status.textContent='This window does not contain a workshop connection.';
    form.hidden=true;
    return;
  }
  try{
    const {data,error}=await supabase.auth.getSession();
    if(error) throw error;
    if(data?.session){await returnSession(data.session);return;}
  }catch(error){
    console.warn('Remembered Flowtel session could not be read.',error);
  }
  copy.textContent='Sign in once here. Your workshop notes will open automatically when you return.';
  form.hidden=false;
}
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  const email=document.getElementById('connectEmail').value.trim().toLowerCase();
  const password=document.getElementById('connectPassword').value;
  submit.disabled=true;
  submit.textContent='OPENING…';
  status.textContent='';
  try{
    await signInWithEmail(email,password);
    const {data,error}=await supabase.auth.getSession();
    if(error) throw error;
    await returnSession(data.session);
  }catch(error){
    status.textContent=error?.message || 'The Flowtel could not open with those details.';
    submit.disabled=false;
    submit.textContent='ENTER THE FLOWTEL';
  }
});
closeButton?.addEventListener('click',()=>window.close());
boot();
