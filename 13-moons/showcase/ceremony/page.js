import {readWishPreview,writeWishPreview} from '/13-moons/showcase/wish-preview-store.js';
import {MOON_WISH_THEMES} from '/shared/13-moons-wish-themes.js';
import {generateBigVisionVortex,flowtelEntryMonth} from '/shared/13-moon-vortex.js';
import {thirteenMonthsAfter} from '/shared/13-moons-monthly-practices.js';
import {WOMB_WORK_MODULES} from '/shared/womb-work.js';
import {LESSON_TEACHING_DRAFTS} from '/13-moons/showcase/lesson/teaching-drafts.js';
import {MONTHLY_INITIATION_PRACTICES} from '/shared/13-moons-monthly-practices.js';
import {createMoonMagicMedicineWheel} from '/shared/moon-magic-medicine-wheel.js';
const jump=document.getElementById('jump');
for(const item of WOMB_WORK_MODULES){const opt=document.createElement('option');opt.value=String(item.index);opt.textContent=String(item.index).padStart(2,'0')+' · '+item.title;jump.append(opt);}
jump.addEventListener('change',()=>{const value=Number(jump.value);if(!value)return;location.href='/13-moons/showcase/ceremony/?lesson='+value;});
const params=new URLSearchParams(location.search);
const opening=Number(params.get('opening'));
const n=Math.min(13,Math.max(1,Number(params.get('lesson'))||1));
const module=WOMB_WORK_MODULES[n-1],teaching=LESSON_TEACHING_DRAFTS[n],daily=MONTHLY_INITIATION_PRACTICES[n];
const root=document.getElementById('scene'),progress=document.getElementById('progress');
document.getElementById('chapter').textContent=(opening===1||opening===2)?'BEFORE THE FIRST MOON · STEP '+opening:'INITIATION '+String(n).padStart(2,'0')+' · '+module.arc;
const scenes=opening===1?['profileArrival','profileCheck','profileCosmology','profileClose']:opening===2?['vortexArrival','vortexHow','vortexMonth','vortexClose']:['arrival','orientation',...teaching.paragraphs.map((_,i)=>'teaching'+i),...(n===2?['wheel','identify']:n===1?['checkin']:[]),'practice','reflection',...(n===3?['letter']:[]),'closing'];
let step=0;
const answers={season:'',checkin:'',reflection:'',letter:'',startDate:'',vortex:Array(13).fill(''),cosmology:'',profileReviewed:false,cosmologyReviewed:false};
const vortex=generateBigVisionVortex(flowtelEntryMonth());
let vortexIndex=0;
const previousWishes=readWishPreview();
if(opening===2&&previousWishes?.startMonth===vortex[0].month)answers.vortex=previousWishes.wishes.slice();
const add=(tag,text,parent=root)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;parent.append(el);return el;};
function heading(title,body){add('h1',title);if(body)add('p',body);}
function render(){
 root.replaceChildren();
 progress.replaceChildren(...scenes.map((_,i)=>{const span=document.createElement('span');if(i<=step)span.className='active';return span;}));
 const scene=scenes[step];
 if(scene==='profileArrival'){
  add('span','✧').className='moon-mark';heading('Your journey begins with you','Before the thirteen initiations, review the rooms that hold your personal information. These already exist in Flowtel.');
 }else if(scene==='profileCheck'){
  add('span','STEP 01 · YOUR GUEST PROFILE').className='label';heading('Confirm your Guest Profile','Check your name, display name, location, time zone, and hemisphere in the existing Flowtel Guest Profile.');
  const link=add('a','Open my Guest Profile →');link.href='/client/';link.target='_blank';link.rel='noopener noreferrer';
  const check=add('label');check.className='review-check';const tick=add('input',undefined,check);tick.type='checkbox';tick.checked=answers.profileReviewed;tick.addEventListener('change',()=>{answers.profileReviewed=tick.checked;});add('span','I have reviewed my Guest Profile',check);
  add('p','The checkbox is a personal preview reminder, not verified profile confirmation.');
 }else if(scene==='profileCosmology'){
  add('span','STEP 01 · PERSONAL COSMOLOGY').className='label';heading('Visit your Personal Cosmology','Review your existing private Personal Cosmology room, including any birth information you choose to maintain there.');
  const link=add('a','Open Personal Cosmology →');link.href='/personal-cosmology/';link.target='_blank';link.rel='noopener noreferrer';
  const check=add('label');check.className='review-check';const tick=add('input',undefined,check);tick.type='checkbox';tick.checked=answers.cosmologyReviewed;tick.addEventListener('change',()=>{answers.cosmologyReviewed=tick.checked;});add('span','I have reviewed my Personal Cosmology',check);
  add('p','This preview does not duplicate your birth details or save the checkbox.');
 }else if(scene==='profileClose'){
  add('span','✺').className='moon-mark';heading('The opening doorway','After reviewing both existing rooms, you are ready for the Big Vision Vortex.');
  const link=add('a','Enter Step 2 · Big Vision Vortex →');link.href='?opening=2';
 }else if(scene==='vortexArrival'){
  add('span','☾').className='moon-mark';heading('The Big Vision Vortex','A wish-making journey through the thirteen calendar moons ahead. The present moon is your starting point; your first wish belongs to the next moon.');
 }else if(scene==='vortexHow'){
  add('span','STEP 02 · THIRTEEN MOONS').className='label';heading('One wish on each future moon','Read each moon name and its initiation themes from Flow FM. Make a wish for that calendar month. Skip the present moon: it will return as Moon 13, one year from now, when you make a wish for its future version.');
  add('p','This no-login experience is only a prototype; nothing you write here will be saved.');
 }else if(scene==='vortexMonth'){
  const row=vortex[vortexIndex];
  const current=vortexIndex===0;
  const monthName=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.month+'-01T12:00:00Z'));
  const sameMoonNextYear=vortexIndex===12;
  add('span',(current?'CURRENT MOON · NO WISH YET':'WISH '+vortexIndex+' OF 12')+' · POSITION '+(vortexIndex+1)+' OF 13').className='label';
  const marker=add('div');marker.className='moon-progress';
  for(let i=0;i<13;i++){
   const dot=add('button',i===0?'○':String(i),marker);
   dot.type='button';dot.className=i===vortexIndex?'chosen':'';
   dot.setAttribute('aria-label',i===0?'Current moon introduction':'Go to wish '+i);
   dot.onclick=()=>{vortexIndex=i;render();};
  }
  add('span',monthName.toUpperCase()).className='label';
  heading(row.name,current?'This is the moon you are living in now. Observe it, but save its wish for next year.':sameMoonNextYear?'A full year has turned. Now make a wish for this moon in its future form.':'Read the name and themes of this moon, then make a wish for what you want to experience.');
  const theme=add('blockquote',MOON_WISH_THEMES[row.calendarMonth]);
  theme.className='moon-theme';
  add('p',row.wing+' · '+row.season);
  if(current){
   add('p','There is no wish to write for this current month. Move forward into your first future moon.');
  }else{
   const label=add('label','My wish for '+monthName+' · '+row.name);label.className='label';
   const field=add('textarea');field.id='wishText';field.maxLength=4000;
   field.value=answers.vortex[vortexIndex];field.placeholder='My wish for this moon is…';
   field.setAttribute('aria-label','My wish for '+monthName);
   field.addEventListener('input',()=>{answers.vortex[vortexIndex]=field.value;writeWishPreview(vortex[0].month,answers.vortex);});
   add('p','This wish remains here only while you are exploring this preview. It is not saved.');
  }
  const controls=add('div');controls.className='options';
  const previous=add('button','← Previous moon',controls);previous.className='option';previous.disabled=vortexIndex===0;
  previous.onclick=()=>{vortexIndex=Math.max(0,vortexIndex-1);render();};
  const next=add('button',vortexIndex===12?'Close the Vortex →':current?'Begin wishing →':'Next moon →',controls);next.className='option';
  next.onclick=()=>{if(vortexIndex<12){vortexIndex++;render();}else{step++;render();}};
 }else if(scene==='vortexClose'){
  add('span','✺').className='moon-mark';heading('Your twelve wishes across thirteen moons','The current month was your starting point, not a wish. You returned to it in the thirteenth position, one year later. In the future member experience, your wishes will be privately saved and sealed.');
  const returnLink=add('a','Return to the Wish & Witness room →');returnLink.href='/13-moons/showcase/#wishesPreview';
  add('p','Your preview wishes are stored only in this browser tab, not in Flowtel. You can clear them in the library.');
  const link=add('a','Enter Initiation 1 →');link.href='?lesson=1';
 }else if(scene==='arrival'){
  add('span','☾').className='moon-mark';
  heading(module.title,'One doorway at a time. There is nothing here to rush, finish perfectly, or prove.');
  add('p','A moment of stillness before you begin.');
 }else if(scene==='orientation'){
  heading('The invitation',module.description);
  add('p',n===1?'Begin by witnessing your cycle as it is, without trying to change it.': 'The Moon Magic framework brings the four inner seasons, phases of the moon, and cycle days into one medicine wheel.');
 }else if(scene.startsWith('teaching')){
  add('span','✧').className='moon-mark';
  add('span','THE TEACHING').className='label';
  heading('The teaching · '+(Number(scene.slice(8))+1)+' of '+teaching.paragraphs.length);
  add('p',teaching.paragraphs[Number(scene.slice(8))]);
 }else if(scene==='wheel'){
  add('span','THE MEDICINE WHEEL').className='label';
  add('h2','Four seasons. One turning wheel.');
  const holder=add('div');holder.className='wheel';holder.append(createMoonMagicMedicineWheel());
  const choices=add('div');choices.className='options';
  for(const value of ['Inner Winter','Inner Spring','Inner Summer','Inner Autumn']){const btn=add('button',value,choices);btn.type='button';btn.className='option';btn.setAttribute('aria-pressed',String(answers.season===value));btn.onclick=()=>{answers.season=value;render();};}
  if(answers.season)add('p','Selected: '+answers.season+'. Continue to reflect on this season.');
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
 }else if(scene==='letter'){
  add('span','YOUR FUTURE-SELF LETTER').className='label';heading('Write from thirteen months ahead','Imagine everything worked out. Write from the future, describing who you have become.');
  const label=add('label','Initiation start date · prototype calculator');label.className='label';
  const date=add('input');date.type='date';date.value=answers.startDate;
  const dateText=add('p',answers.startDate?'Date your letter: '+(thirteenMonthsAfter(answers.startDate)||'Choose a valid date'):'Choose a start date to calculate your future letter date.');
  date.addEventListener('change',()=>{answers.startDate=date.value;dateText.textContent='Date your letter: '+(thirteenMonthsAfter(date.value)||'Choose a valid date');});
  const textarea=add('textarea');textarea.placeholder='Dear future me…';textarea.value=answers.letter;textarea.addEventListener('input',()=>answers.letter=textarea.value);
  add('p','Preview only · Your letter will not be saved or sealed here.');
 }else if(scene==='closing'){
  add('span','✺').className='moon-mark';
  heading('Close this circle','Return to your cycle observations and your Flow Map. Notice what your experience is teaching you.');
  const a=add('a','Explore the existing Flow Map →');a.href='/flow-map/?cycle=previous&return=%2F13-moons%2F';
  add('p','This prototype does not complete a lesson or save progress.');
 }
 const back=document.getElementById('back'),forward=document.getElementById('forward');
 back.disabled=step===0;
 if(scene==='vortexMonth'&&vortexIndex>0){back.disabled=false;}
 forward.textContent=step===scenes.length-1?'Return to beginning ↺':'Continue →';
 if(scene==='vortexMonth')forward.hidden=true;else forward.hidden=false;
}
document.getElementById('back').addEventListener('click',()=>{if(scenes[step]==='vortexMonth'&&vortexIndex>0)vortexIndex--;else step=Math.max(0,step-1);render();window.scrollTo({top:0,behavior:'smooth'});});
document.getElementById('forward').addEventListener('click',()=>{step=(step+1)%scenes.length;render();window.scrollTo({top:0,behavior:'smooth'});});
render();
