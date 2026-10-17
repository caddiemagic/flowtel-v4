import { createMoonMagicMedicineWheel } from '/shared/moon-magic-medicine-wheel.js';
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
function section(title,hint,open=false,parent=root){
 const outer=document.createElement('details');outer.className='initiation-lesson-section';outer.open=open;
 const summary=document.createElement('summary');summary.className='initiation-section-summary';
 const strong=document.createElement('strong');strong.textContent=title;
 const small=document.createElement('span');small.textContent=hint;
 summary.append(strong,small);outer.append(summary);
 const body=document.createElement('div');body.className='initiation-section-body';outer.append(body);
 parent.append(outer);return {outer,body};
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
   const teach=section('01 · The Teaching','Read at your own pace',false);
   for(let i=0;i<draft.paragraphs.length;i+=2){
     const part=section('Part '+(Math.floor(i/2)+1),'A short moment to read',i===0,teach.body);
     for(const paragraph of draft.paragraphs.slice(i,i+2))add('p',paragraph,'',part.body);
   }
   if(index===2){
     const wheel=section('Moon Magic Medicine Wheel','See the phases, directions and cycle days',false,teach.body);
     wheel.body.append(createMoonMagicMedicineWheel());
   }
 }
 const daily=MONTHLY_INITIATION_PRACTICES[index];
 if(daily){
   const dailySection=section('02 · Daily Practice','Your daily rhythm',false);
   add('h3',daily.title,'',dailySection.body);
   add('p',daily.body,'',dailySection.body);
   if(daily.script){const script=add('blockquote',daily.script,'',dailySection.body);script.style.whiteSpace='pre-line';}
   if(daily.link){const a=document.createElement('a');a.href=daily.link;a.textContent=daily.linkLabel||'Open practice';a.target='_blank';a.rel='noopener noreferrer';dailySection.body.append(a);}
 }
 const work=section('03 · Your Womb Work','One intentional assignment',false);
 add('p',lesson.practice,'',work.body);
 if(index===3){
   add('h3','Letter to Your Future Self','',work.body);
   add('p','Write a letter dated exactly thirteen calendar months after your initiation start date. Write from that future day as though everything worked out. This preview calculates the date but does not store your letter.','',work.body);
   const label=document.createElement('label');label.textContent='Initiation start date (preview only): ';
   const input=document.createElement('input');input.type='date';label.append(input);work.body.append(label);
   const output=add('p','Select a start date to calculate your letter date.','',work.body);
   input.addEventListener('change',()=>{const value=thirteenMonthsAfter(input.value);output.textContent=value?'Date your letter: '+new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'Choose a valid start date.';});
 }
 const reflection=section('04 · Reflection','A question to sit with',false);
 add('p',lesson.prompt,'',reflection.body);
 const close=section('05 · Moon Close','Review and integrate',false);
 add('p',draft?.integration || 'Review your daily cycle notes through the four inner seasons.','',close.body);
 const mapLink=document.createElement('a');
 mapLink.href='/flow-map/?cycle=previous&return='+encodeURIComponent('/13-moons/showcase/lesson/?lesson='+index);
 mapLink.textContent='Review my Flow Map →';
 mapLink.className='lesson-back';
 close.body.append(mapLink);
 add('p','Your personal Flow Map requires a Flowtel login; this preview does not collect or save your reflections.','',close.body);
 if(index>1)link('← Lesson '+(index-1),'?lesson='+(index-1));
 if(index<13)link('Lesson '+(index+1)+' →','?lesson='+(index+1));
}
