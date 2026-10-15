import {WOMB_WORK_MODULES} from '/shared/womb-work.js';
import {LESSON_TEACHING_DRAFTS} from '/13-moons/showcase/lesson/teaching-drafts.js';
import {MONTHLY_INITIATION_PRACTICES} from '/shared/13-moons-monthly-practices.js';
import {createMoonMagicMedicineWheel} from '/shared/moon-magic-medicine-wheel.js';
const jump=document.getElementById('jump');
for(const item of WOMB_WORK_MODULES){const opt=document.createElement('option');opt.value=String(item.index);opt.textContent=String(item.index).padStart(2,'0')+' · '+item.title;jump.append(opt);}
jump.addEventListener('change',()=>{const value=Number(jump.value);if(!value)return;location.href=value<=2?'/13-moons/showcase/ceremony/?lesson='+value:'/13-moons/showcase/lesson/?lesson='+value;});
const params=new URLSearchParams(location.search);
const n=params.get('lesson')==='2'?2:1;
const module=WOMB_WORK_MODULES[n-1],teaching=LESSON_TEACHING_DRAFTS[n],daily=MONTHLY_INITIATION_PRACTICES[n];
const root=document.getElementById('scene'),progress=document.getElementById('progress');
document.getElementById('chapter').textContent='INITIATION '+String(n).padStart(2,'0')+' · '+module.arc;
const scenes=['arrival','orientation','teaching',...(n===2?['wheel','identify']:['checkin']),'practice','reflection','closing'];
let step=0;
const answers={season:'',checkin:'',reflection:''};
const add=(tag,text,parent=root)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;parent.append(el);return el;};
function heading(title,body){add('h1',title);if(body)add('p',body);}
function render(){
 root.replaceChildren();
 progress.replaceChildren(...scenes.map((_,i)=>{const span=document.createElement('span');if(i<=step)span.className='active';return span;}));
 const scene=scenes[step];
 if(scene==='arrival'){
  add('span','☾').className='moon-mark';
  heading(module.title,'One doorway at a time. There is nothing here to rush, finish perfectly, or prove.');
  add('p','A moment of stillness before you begin.');
 }else if(scene==='orientation'){
  heading('The invitation',module.description);
  add('p',n===1?'Begin by witnessing your cycle as it is, without trying to change it.': 'The Moon Magic framework brings the four inner seasons, phases of the moon, and cycle days into one medicine wheel.');
 }else if(scene==='teaching'){
  add('span','✧').className='moon-mark';
  add('span','THE TEACHING').className='label';
  heading('Begin noticing');
  for(const p of teaching.paragraphs.slice(0,n===2?2:3))add('p',p);
  add('p','The full written teaching is preserved in the existing lesson. This screen demonstrates the ceremonial pacing.');
 }else if(scene==='wheel'){
  add('span','THE MEDICINE WHEEL').className='label';
  add('h2','Four seasons. One turning wheel.');
  const holder=add('div');holder.className='wheel';holder.append(createMoonMagicMedicineWheel());
 }else if(scene==='identify'){
  add('span','A MOMENT OF RECOGNITION').className='label';
  heading('What season are you observing?','You can choose your current inner season below. This is only an exploration; your answer will not be stored.');
  const options=add('div');options.className='options';
  for(const value of ['Inner Winter','Inner Spring','Inner Summer','Inner Autumn']){
   const btn=add('button',value,options);btn.className='option';btn.type='button';btn.setAttribute('aria-pressed',String(answers.season===value));
   btn.addEventListener('click',()=>{answers.season=value;render();});
  }
  if(answers.season)add('p','You selected '+answers.season+'. Observe what this season feels like for you.');
 }else if(scene==='checkin'){
  add('span','YOUR FIRST OBSERVATION').className='label';
  heading('What are you noticing today?','Try a gentle check-in. You can record your real observations in your private Flowtel Cycle Data later.');
  const label=add('label','A few words about your energy, mood or needs');label.className='label';
  const area=add('textarea');area.value=answers.checkin;area.placeholder='Today I notice…';
  area.addEventListener('input',()=>answers.checkin=area.value);
 }else if(scene==='practice'){
  add('span','DAILY PRACTICE').className='label';
  heading(daily.title,daily.body);
  if(daily.script){const quote=add('blockquote',daily.script);quote.style.cssText='padding:20px;border-left:3px solid #b58ca2;background:#fbf5f7;white-space:pre-wrap;line-height:1.8';}
  add('p','You can return to this practice each day as your initiation unfolds.');
 }else if(scene==='reflection'){
  add('span','YOUR WOMB WORK').className='label';
  heading('Make space for reflection',module.practice);
  const label=add('label',module.prompt);label.className='label';
  const area=add('textarea');area.value=answers.reflection;area.placeholder='Allow your answer to arrive…';
  area.addEventListener('input',()=>answers.reflection=area.value);
  add('p','Your writing is temporary in this design preview. The real member experience will use private saving.');
 }else if(scene==='closing'){
  add('span','✺').className='moon-mark';
  heading('Close this circle','Return to your cycle observations and your Flow Map. Notice what your experience is teaching you.');
  const a=add('a','Explore the existing Flow Map →');a.href='/flow-map/?cycle=previous&return=%2F13-moons%2F';
  add('p','This prototype does not complete a lesson or save progress.');
 }
 const back=document.getElementById('back'),forward=document.getElementById('forward');
 back.disabled=step===0;
 forward.textContent=step===scenes.length-1?'Begin again ↺':'Continue →';
}
document.getElementById('back').addEventListener('click',()=>{step=Math.max(0,step-1);render();window.scrollTo({top:0,behavior:'smooth'});});
document.getElementById('forward').addEventListener('click',()=>{step=(step+1)%scenes.length;render();window.scrollTo({top:0,behavior:'smooth'});});
render();
