import {readWishPreview} from '/13-moons/showcase/wish-preview-store.js';
import {generateBigVisionVortex} from '/shared/13-moon-vortex.js';
import {MOON_WISH_THEMES} from '/shared/13-moons-wish-themes.js';
const box=document.getElementById('portal'),preview=readWishPreview(),position=Number(new URLSearchParams(location.search).get('position'));
const put=(tag,text,parent=box)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;parent.append(el);return el;};
if(!preview?.sealed||!Number.isInteger(position)||position<2||position>13){
 put('h1','Finish your opening ceremony first');
 put('p','Your private moon portals appear after you make and seal all twelve wishes.');
 const link=put('a','Enter the Big Vision Vortex →');link.href='/13-moons/showcase/ceremony/?opening=2';
}else{
 const row=generateBigVisionVortex(preview.startMonth)[position-1];
 const label=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.month+'-01T12:00:00Z'));
 put('p',label.toUpperCase()+' · '+row.wing+' / '+row.season).className='moon-label';
 put('h1',row.name);
 put('p',MOON_WISH_THEMES[row.calendarMonth]).className='moon-theme';
 put('h2','The wish you made');
 put('blockquote',preview.wishes[position-1]).className='original-wish';
 put('h2','What has changed since then?');
 put('p','How has your wish changed? Have you received it, or noticed it arriving in a different form?');
 const input=put('textarea');input.placeholder='Today I am witnessing…';input.maxLength=4000;
 const button=put('button','Add my reflection');button.type='button';
 const msg=put('p','').className='note';msg.setAttribute('role','status');
 const entries=put('div');
 button.onclick=()=>{if(!input.value.trim()){msg.textContent='Write your reflection before adding it.';return;}
   const entry=put('div',undefined,entries);entry.className='entry';
   const when=put('p',new Intl.DateTimeFormat('en-US',{dateStyle:'medium'}).format(new Date()),entry);when.className='moon-label';
   put('p',input.value.trim(),entry);input.value='';msg.textContent='Added for this preview visit only; not saved to Flowtel.';
 };
}
