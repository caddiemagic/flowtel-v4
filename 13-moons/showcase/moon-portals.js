import {readWishPreview,clearWishPreview} from '/13-moons/showcase/wish-preview-store.js';
import {generateBigVisionVortex,flowtelEntryMonth} from '/shared/13-moon-vortex.js';
import {MOON_WISH_THEMES} from '/shared/13-moons-wish-themes.js';
const root=document.getElementById('calendarPortals'),opening=document.querySelector('[data-vortex-opening]');
const preview=readWishPreview(),sealed=preview?.sealed===true;
if(opening)opening.hidden=sealed;
const rows=generateBigVisionVortex(preview?.startMonth||flowtelEntryMonth());
const monthLabel=m=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T12:00:00Z'));
const item=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e;};
item('p','THE CALENDAR MOONS',root).className='preview-label';
item('h2','Your Moon Portals',root);
item('p',sealed?'Your opening ceremony is complete. Visit a moon portal to see its original wish and journal only for that moon.':'The Big Vision Vortex comes first. Once you seal your twelve wishes, the opening tool disappears and each moon receives its own wish-and-reflection portal.',root);
const grid=item('div',undefined,root);grid.className='preview-grid';
rows.forEach((row,i)=>{
 const card=item('article',undefined,grid);card.className='preview-lesson';
 item('p',monthLabel(row.month).toUpperCase(),card).className='preview-label';
 item('h3',row.name,card);
 item('p',MOON_WISH_THEMES[row.calendarMonth],card);
 if(i===0)item('p','Present moon · No wish made',card);
 else if(!sealed)item('p','Wish portal opens after the Vortex is sealed',card);
 else{const link=item('a','Enter this moon →',card);link.href='/13-moons/showcase/moon/?position='+(i+1); }
});
if(sealed){const reset=item('button','Reset this preview ceremony',root);reset.type='button';reset.className='wish-action';reset.onclick=()=>{clearWishPreview();location.reload();};item('p','Preview reset only. This control will not exist in the live member portal.',root);}
