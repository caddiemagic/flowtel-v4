import { WOMB_WORK_MODULES } from '/shared/womb-work.js';
const root=document.getElementById('lesson');
const nav=document.getElementById('lessonNavigation');
const index=Number(new URLSearchParams(location.search).get('lesson'));
const lesson=WOMB_WORK_MODULES.find(item=>item.index===index);
function add(tag,value,className='',parent=root){
 const element=document.createElement(tag);
 if(className)element.className=className;
 element.textContent=value;
 parent.append(element);
 return element;
}
function link(label,href){
 const anchor=document.createElement('a');
 anchor.href=href;
 anchor.textContent=label;
 nav.append(anchor);
}
const jump=document.createElement('label');
jump.textContent='Browse Womb Magic lessons: ';
const picker=document.createElement('select');
picker.setAttribute('aria-label','Choose a Womb Magic lesson');
for(const item of WOMB_WORK_MODULES){
 const option=document.createElement('option');
 option.value=String(item.index);
 option.textContent=String(item.index).padStart(2,'0')+' · '+item.title;
 option.selected=item.index===index;
 picker.append(option);
}
picker.addEventListener('change',()=>{location.href='?lesson='+encodeURIComponent(picker.value);});
jump.append(picker);
nav.before(jump);
root.replaceChildren();
if(!lesson){
 add('h1','Choose a Womb Magic lesson','lesson-heading');
 add('p','The available lessons are numbered 1 through 13.');
}else{
 document.title=lesson.title+' · 13 Moons Design Preview';
 add('p','Initiation '+String(index).padStart(2,'0')+' · '+lesson.arc,'lesson-label');
 add('h1',lesson.title,'lesson-heading');
 add('p',lesson.description);
 add('p','This lesson follows the fixed Womb Magic curriculum sequence, independent of the calendar moon when you begin.');
 add('p','The lesson below is drawn from the existing Womb Magic curriculum. Calendar moon names and dates are separate from lesson order.');
 add('h2','Your Womb Work');
 add('p',lesson.practice);
 add('h2','Reflection');
 add('p',lesson.prompt);
 add('h2','Daily Cycle Observation');
 add('p','Continue observing your cycle in the existing Flowtel tracker and journal.');
 add('h2','Moon Close · Flow Map');
 add('p','Review your daily cycle notes and record your observations across the four inner seasons using your existing Flow Map.');
 if(index>1)link('← Lesson '+(index-1),'?lesson='+(index-1));
 if(index<13)link('Lesson '+(index+1)+' →','?lesson='+(index+1));
}
