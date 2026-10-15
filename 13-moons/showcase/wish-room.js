import {generateBigVisionVortex,flowtelEntryMonth} from '/shared/13-moon-vortex.js';
import {MOON_WISH_THEMES} from '/shared/13-moons-wish-themes.js';
const area=document.getElementById('wishesPreview');
const rows=generateBigVisionVortex(flowtelEntryMonth());
const wishes=Array(13).fill('');
const journals=Array.from({length:13},()=>[]);
let active=1;
function node(tag,value,parent,cls){
 const el=document.createElement(tag);if(value!==undefined)el.textContent=value;
 if(cls)el.className=cls;if(parent)parent.append(el);return el;
}
function render(){
 area.replaceChildren();
 node('p','WISH & WITNESS · DESIGN PREVIEW',area,'wish-kicker');
 node('h2','The Wishes of Your Moons',area);
 node('p','Each moon holds the wish you made at the beginning. Return as the year unfolds to witness what has shifted, arrived, or surprised you. The opening wish stays unchanged.',area);
 const navigation=node('div',undefined,area,'wish-nav');
 rows.forEach((row,i)=>{
  const b=node('button',String(i+1).padStart(2,'0'),navigation);
  b.type='button';b.className=i===active?'selected':'';
  b.title=row.name+' · '+row.month;
  b.setAttribute('aria-label','View '+row.name+' '+row.month);
  b.onclick=()=>{active=i;render();};
 });
 const row=rows[active];
 const month=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.month+'-01T12:00:00Z'));
 const card=node('article',undefined,area,'wish-room');
 node('p',month.toUpperCase()+' · '+row.wing+' / '+row.season,card,'wish-kicker');
 node('h3',row.name,card);
 node('p',MOON_WISH_THEMES[row.calendarMonth],card,'wish-theme');
 if(active===0){
  node('p','The current moon is a witnessing doorway. You skip its wish now and return to this moon in position 13 to wish for the future version.',card);
 }else{
  node('h4','The wish I made',card);
  const wish=node('textarea',undefined,card);
  wish.value=wishes[active];wish.placeholder='My opening wish for '+row.name+'…';wish.maxLength=4000;
  wish.setAttribute('aria-label','Opening wish for '+month);wish.oninput=()=>wishes[active]=wish.value;
  node('p','In the real member experience, the opening wish will be sealed and read-only. This editable field is for trying the preview.',card,'wish-small');
  node('h4','What I am witnessing now',card);
  node('p','Has your wish changed? Have you received it, or noticed something arriving in another form?',card);
  const writing=node('textarea',undefined,card);writing.placeholder='What I notice today…';writing.maxLength=4000;
  writing.setAttribute('aria-label','New witness journal entry');
  const add=node('button','Add journal entry',card,'wish-action');
  const status=node('p','',card,'wish-small');status.setAttribute('role','status');
  const list=node('div',undefined,card,'wish-entries');
  const draw=()=>{list.replaceChildren();for(const entry of journals[active]){const item=node('section',undefined,list,'wish-entry');node('p',entry.date,item,'wish-kicker');node('p',entry.text,item);}};
  add.onclick=()=>{const value=writing.value.trim();if(!value){status.textContent='Write a few words before adding your entry.';return;}journals[active].unshift({date:'Preview entry',text:value});writing.value='';status.textContent='Added to this preview only; nothing was saved.';draw();};
  draw();
 }
 const footer=node('p','No login · No personal data saved · Entries disappear when you leave or refresh this preview.',area,'wish-small');
}
render();
