import { normalizeClub, cardinalClubs } from './compass.js?v=0.8.0';
const $=id=>document.getElementById(id);
const form=$('clubForm'), input=$('clubInput');
const clubs=[];
function prompt(){
 const words=['first','second','third','fourth'];
 $('clubPrompt').textContent=clubs.length===0?'If you could only play with 4 clubs for the rest of your career, what 4 clubs would you choose? (Exclude your putter)':`What’s your ${words[clubs.length]} club?`;
 $('clubProgress').textContent=`${clubs.length+1} OF 4`;
 $('nextClub').textContent=clubs.length===3?'Reveal My Caddie Compass':'Next Club';
 input.value='';input.focus();
}
form.addEventListener('submit',event=>{
 event.preventDefault();
 if(clubs.length>=4)return;
 try{
  const club=normalizeClub(input.value);
  if(clubs.some(c=>c.toLowerCase().replace(/[\s-]/g,'')===club.toLowerCase().replace(/[\s-]/g,'')))throw new Error('Choose a different club—you already entered that one.');
  clubs.push(club);$('lobbyMessage').textContent='';
  if(clubs.length<4){prompt();return;}
  const compass=cardinalClubs(clubs);
  ['north','east','west','south'].forEach(dir=>$(`${dir}Club`).textContent=compass[dir]);
  $('selectionCard').classList.add('hidden');$('compassResult').classList.remove('hidden');
  $('compassResult').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('compassResult').focus({preventScroll:true});
 }catch(error){$('lobbyMessage').textContent=error.message;input.focus();}
});
$('chooseAgain').addEventListener('click',()=>{clubs.length=0;$('compassResult').classList.add('hidden');$('selectionCard').classList.remove('hidden');$('lobbyMessage').textContent='';prompt();form.scrollIntoView({block:'center'});});

let submissionId=crypto.randomUUID();
$('consecrationForm').addEventListener('submit',async event=>{
 event.preventDefault();if(clubs.length!==4)return;
 const button=$('submitCompass');if(button.disabled)return;button.disabled=true;
 try{
  const response=await fetch('/api/caddie-acuity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'public-compass-submit',submission_id:submissionId,name:$('submitterName').value,email:$('submitterEmail').value,clubs,consent:$('compassConsent').checked,website:$('compassWebsite').value})});
  const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Your compass could not be submitted. Try again shortly.');
  $('consecrationForm').classList.add('hidden');$('consecrationMessage').textContent='Your Caddie Compass has been submitted to the Golf Priestess. Awaiting Consecration.';
 }catch(error){$('consecrationMessage').textContent=error.message;button.disabled=false;}
});
$('chooseAgain').addEventListener('click',()=>{submissionId=crypto.randomUUID();$('consecrationForm').classList.remove('hidden');$('consecrationMessage').textContent='';$('submitCompass').disabled=false;});
