import { WOMB_WORK_MODULES } from '/shared/womb-work.js';
import { LESSON_TEACHING_DRAFTS } from './teaching-drafts.js';
import { MONTHLY_INITIATION_PRACTICES, thirteenMonthsAfter } from '/shared/13-moons-monthly-practices.js';
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
 const draft=LESSON_TEACHING_DRAFTS[index];
 if(draft){
   add('h2','Written teaching · editorial draft for review');
   for(const paragraph of draft.paragraphs)add('p',paragraph);
 }
 if(index===3){
   add('h2','Letter to your future self · additional practice');
   add('p','Write a letter dated exactly thirteen calendar months after your initiation start date. Write from that future day as though everything worked out. Describe what has unfolded, who you have become, and what you are grateful for. Save the letter to read during Initiation 13.');
   const dateLabel=document.createElement('label');
   dateLabel.textContent='Initiation start date (preview calculator): ';
   const dateInput=document.createElement('input');
   dateInput.type='date';
   const result=document.createElement('p');
   result.setAttribute('aria-live','polite');
   dateInput.addEventListener('change',()=>{
     const date=thirteenMonthsAfter(dateInput.value);
     result.textContent=date?'Date your future-self letter: '+new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'Choose a valid start date.';
   });
   dateLabel.append(dateInput);
   root.append(dateLabel,result);
   add('p','This design-preview calculator does not store your start date or your letter. The member version will use your saved initiation start date.');
 }
 add('h2','Your Womb Work');
 add('p',lesson.practice);
 const extra=MONTHLY_INITIATION_PRACTICES[index];
 if(extra){
   add('h2','Additional monthly practice');
   add('h3',extra.title);
   add('p',extra.body);
   if(extra.script){
     const script=document.createElement('blockquote');
     script.textContent=extra.script;
     script.style.cssText='white-space:pre-line;border-left:3px solid #caa780;padding:12px 18px;margin:16px 0;background:#faf4ed;line-height:1.8';
     root.append(script);
   }
   if(extra.link){
     const ritual=document.createElement('a');
     ritual.href=extra.link;
     ritual.textContent=extra.linkLabel || 'Open ritual';
     ritual.target='_blank';
     ritual.rel='noopener noreferrer';
     ritual.className='lesson-back';
     root.append(ritual);
   }
   if(extra.asset)add('p',extra.asset);
 }
 add('h2','Reflection');
 add('p',lesson.prompt);
 add('h2','Daily Cycle Observation');
 add('p',draft?.daily || 'Continue observing your cycle in the existing Flowtel tracker and journal.');
 add('h2','Moon Close · Flow Map');
 add('p',draft?.integration || 'Review your daily cycle notes and record your observations across the four inner seasons using your existing Flow Map.');
 const mapLink=document.createElement('a');
 mapLink.href='/flow-map/?cycle=previous&return='+encodeURIComponent('/13-moons/showcase/lesson/?lesson='+index);
 mapLink.textContent='Review my previous cycle on the Flow Map →';
 mapLink.className='lesson-back';
 root.append(mapLink);
 add('p','In the Flow Map, use the cycle selector or previous-cycle navigation to review the cycle you have just completed. Your saved observations remain in your Flowtel account.');
 if(index>1)link('← Lesson '+(index-1),'?lesson='+(index-1));
 if(index<13)link('Lesson '+(index+1)+' →','?lesson='+(index+1));
}
