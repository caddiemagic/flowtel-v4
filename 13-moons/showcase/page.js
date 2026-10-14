import { WOMB_WORK_MODULES } from '/shared/womb-work.js';
const grid=document.getElementById('lessonGrid');
for(const module of WOMB_WORK_MODULES){
 const card=document.createElement('article');card.className='preview-lesson';
 const eyebrow=document.createElement('p');eyebrow.className='preview-label';eyebrow.textContent='Initiation '+String(module.index).padStart(2,'0')+' · '+module.arc;
 const h=document.createElement('h3');h.textContent=module.title;
 const summary=document.createElement('p');summary.textContent=module.description;
 const p=document.createElement('p');p.className='preview-practice';p.textContent='Practice: '+module.practice;
 const q=document.createElement('p');q.textContent='Reflection: '+module.prompt;
 const map=document.createElement('p');map.textContent='Moon close: Review cycle notes and your Flow Map.';
 card.append(eyebrow,h,summary,p,q,map);grid.append(card);
}
