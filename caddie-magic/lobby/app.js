import { CLUBS, cardinalClubs } from './compass.js?v=1';
const $ = id => document.getElementById(id);
const form = $('clubForm');
for (let i=0;i<4;i++) {
  const label=document.createElement('label');label.textContent=`Club ${i+1}`;
  const select=document.createElement('select');select.id=`choice${i}`;select.required=true;
  select.append(new Option('Choose a club',''));
  CLUBS.forEach(club=>select.append(new Option(club,club)));label.append(select);$('clubChoices').append(label);
}
form.addEventListener('change',()=>{
  const selected=[0,1,2,3].map(i=>$(`choice${i}`).value);
  selected.forEach((value,i)=>{for(const option of $(`choice${i}`).options)option.disabled=Boolean(option.value && option.value!==value && selected.includes(option.value));});
});
form.addEventListener('submit',event=>{
  event.preventDefault();
  try {
    const compass=cardinalClubs([0,1,2,3].map(i=>$(`choice${i}`).value));
    ['north','east','west','south'].forEach(dir=>$(`${dir}Club`).textContent=compass[dir]);
    $('lobbyMessage').textContent='';$('compassResult').classList.remove('hidden');
    $('compassResult').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('compassResult').focus({preventScroll:true});
  }catch(error){$('lobbyMessage').textContent=error.message;}
});
$('chooseAgain').addEventListener('click',()=>{ $('compassResult').classList.add('hidden');$('choice0').focus();form.scrollIntoView({block:'center'});});
