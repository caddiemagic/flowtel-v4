import { WOMB_WORK_MODULES } from '/shared/womb-work.js';
const grid=document.getElementById('lessonGrid');
const personal={
3:'Write your Big Vision for your life and the woman you are becoming.',
4:'Plan a week around your energy, with room for rest and pleasure.',
5:'Set three boundaries protecting time, space, purpose, and energy.',
6:'Create an altar or invitation to the support you feel around your life.',
8:'Name the identity you are becoming beyond any role or title.',
9:'Name the resources and support your vision can receive.',
10:'Make a small piece of art, writing, ritual, or experience.',
11:'Imagine something you wish to share or offer without needing to sell it.',
12:'Take one real-world step toward your Big Vision.',
13:'Review the previous moons and honor who you have become.'
};
for(const module of WOMB_WORK_MODULES){
 const card=document.createElement('article');card.className='preview-lesson';
 const eyebrow=document.createElement('p');eyebrow.className='preview-label';eyebrow.textContent='Initiation '+String(module.index).padStart(2,'0')+' · '+module.arc;
 const h=document.createElement('h3');h.textContent=module.title;
 const summary=document.createElement('p');summary.textContent=module.description;
 const p=document.createElement('p');p.className='preview-practice';p.textContent='Practice: '+(personal[module.index]||module.practice);
 const q=document.createElement('p');q.textContent='Reflection: '+module.prompt;
 const map=document.createElement('p');map.textContent='Moon close: Review cycle notes and your Flow Map.';
 card.append(eyebrow,h,summary,p,q,map);grid.append(card);
}
