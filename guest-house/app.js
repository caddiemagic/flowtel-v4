import { validateGuestHouseRequest } from '../shared/guest-house-core.js?v=0.10.58';

const form=document.getElementById('guestHouseRequestForm');
const status=document.getElementById('guestHouseRequestStatus');
const requestCard=document.getElementById('requestCard');

function valuesFromForm(){
  const data=new FormData(form);
  return {
    firstName:data.get('first_name'),
    lastName:data.get('last_name'),
    email:data.get('email'),
    callDateHint:data.get('call_date_hint'),
    callTopic:data.get('call_topic'),
    requesterNote:data.get('requester_note'),
    confirmed:data.get('confirmed')==='on',
    website:data.get('website'),
  };
}

function successMarkup(payload){
  return `<div class="request-success" role="status">
    <img src="/assets/flowtel-rose.png" alt="" />
    <p class="eyebrow">YOUR REQUEST HAS ARRIVED</p>
    <h2>The Concierge will begin looking for your conversation.</h2>
    <p>Your request is waiting safely inside the Guest House. Once the recording has been located and prepared, Megan can share a private Replay Room key with you.</p>
    <p class="reference">Guest House reference: <strong>${String(payload.requestReference || '')}</strong></p>
    <p>No Flowtel membership or password was created by this request.</p>
    <a class="secondary-button" href="https://www.theidyllcollective.com/queendomhome">ENTER THE QUEENDOM WHEN CALLED</a>
  </div>`;
}

form?.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type="submit"]');
  const original=button.textContent;
  button.disabled=true;
  button.textContent='RECEIVING YOUR REQUEST…';
  status.textContent='';
  try{
    const values=validateGuestHouseRequest(valuesFromForm());
    const response=await fetch('/api/guest-house-request',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...values,website:valuesFromForm().website}),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.error || 'Your request could not be received just now.');
    requestCard.innerHTML=successMarkup(payload);
    requestCard.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){
    status.textContent=error?.message || 'Your request could not be received just now.';
    button.disabled=false;
    button.textContent=original;
  }
});
