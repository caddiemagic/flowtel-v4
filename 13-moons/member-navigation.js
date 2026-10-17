import {WOMB_WORK_MODULES} from '/shared/womb-work.js';
const view=document.getElementById('memberView');
const buttons=[...document.querySelectorAll('[data-room]')];
const rooms={opening:document.getElementById('openingRoom'),portals:document.getElementById('memberMoonPortals'),lessons:document.getElementById('lessonsRoom')};
const lessonSelect=document.getElementById('lessonSelect');
WOMB_WORK_MODULES.forEach(m=>{const o=document.createElement('option');o.value=String(m.index);o.textContent=String(m.index).padStart(2,'0')+' · '+m.title;lessonSelect.append(o);});
let lessonIndex=1;
function showLesson(n){lessonIndex=Math.max(1,Math.min(13,n));lessonSelect.value=String(lessonIndex);const cards=document.querySelectorAll('#initiationPath>.initiation-lesson-card');cards.forEach(card=>{card.hidden=card.id!=='initiation-'+lessonIndex;});document.getElementById('lessonPrev').disabled=lessonIndex===1;document.getElementById('lessonNext').disabled=lessonIndex===13;}
function room(name){Object.entries(rooms).forEach(([key,element])=>{element.hidden=key!==name;});buttons.forEach(button=>button.setAttribute('aria-current',String(button.dataset.room===name)));if(name==='lessons')showLesson(lessonIndex);}
buttons.forEach(button=>button.onclick=()=>room(button.dataset.room));
lessonSelect.addEventListener('change',()=>showLesson(Number(lessonSelect.value)));
document.getElementById('lessonPrev').onclick=()=>showLesson(lessonIndex-1);
document.getElementById('lessonNext').onclick=()=>showLesson(lessonIndex+1);
room('opening');
const watch=new MutationObserver(()=>{if(view.hidden)return;const openingAvailable=!document.getElementById('openingVortex').hidden;if(!openingAvailable&&rooms.opening.hidden===false)room('portals');showLesson(lessonIndex);});
watch.observe(view,{attributes:true,attributeFilter:['hidden']});
watch.observe(document.getElementById('openingVortex'),{attributes:true,attributeFilter:['hidden']});
watch.observe(document.getElementById('initiationPath'),{childList:true});

let vortexPosition=0;
const vortexContainer=document.getElementById('vortexMonths');
const vortexControls=document.createElement('nav');
vortexControls.className='ceremony-lesson-nav';
vortexControls.setAttribute('aria-label','Navigate your moon wishes');
const vortexPrevious=document.createElement('button');vortexPrevious.type='button';vortexPrevious.textContent='← Previous moon';
const vortexCount=document.createElement('span');vortexCount.setAttribute('aria-live','polite');
const vortexNext=document.createElement('button');vortexNext.type='button';vortexNext.textContent='Next moon →';
vortexControls.append(vortexPrevious,vortexCount,vortexNext);
vortexContainer.after(vortexControls);
function showVortexPosition(index){
 const cards=[...vortexContainer.querySelectorAll(':scope > section')];
 if(!cards.length){vortexControls.hidden=true;return;}
 vortexControls.hidden=false;
 vortexPosition=Math.max(0,Math.min(cards.length-1,index));
 cards.forEach((card,i)=>{card.hidden=i!==vortexPosition;});
 vortexPrevious.disabled=vortexPosition===0;
 vortexNext.disabled=vortexPosition===cards.length-1;
 vortexCount.textContent='Moon '+(vortexPosition+1)+' of '+cards.length;
}
vortexPrevious.onclick=()=>showVortexPosition(vortexPosition-1);
vortexNext.onclick=()=>showVortexPosition(vortexPosition+1);
const vortexObserver=new MutationObserver(()=>showVortexPosition(vortexPosition));
vortexObserver.observe(vortexContainer,{childList:true});
showVortexPosition(0);

const openingRoom=document.getElementById('openingRoom');
const profilePane=openingRoom.querySelector('.ceremony-pane');
const vortexPane=document.getElementById('openingVortex');
const openingControls=document.createElement('div');
openingControls.className='ceremony-lesson-nav';
const openingBack=document.createElement('button');openingBack.type='button';openingBack.textContent='← Profile';
const openingForward=document.createElement('button');openingForward.type='button';openingForward.textContent='Continue to wishes →';
openingControls.append(openingBack,openingForward);
openingRoom.append(openingControls);
let openingStep=0;
function showOpeningStep(index){
 const vortexAvailable=!vortexPane.hidden;
 openingStep=vortexAvailable?Math.max(0,Math.min(1,index)):0;
 profilePane.hidden=openingStep!==0;
 if(vortexAvailable)vortexPane.classList.toggle('ceremony-substep-hidden',openingStep===0);
 openingBack.hidden=openingStep===0;
 openingForward.hidden=openingStep===1||!vortexAvailable;
}
openingBack.onclick=()=>showOpeningStep(0);
openingForward.onclick=()=>showOpeningStep(1);
showOpeningStep(0);
const openingObserver=new MutationObserver(()=>showOpeningStep(openingStep));
openingObserver.observe(vortexPane,{attributes:true,attributeFilter:['hidden']});
