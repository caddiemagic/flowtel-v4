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
