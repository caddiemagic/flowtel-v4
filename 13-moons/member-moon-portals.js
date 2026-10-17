// Authenticated member moon portals. No second cycle journal is created.
// Vortex wishes are read-only after sealing; reflections append through a gated RPC.
import {supabase} from '/shared/supabase.js';
import {generateBigVisionVortex} from '/shared/13-moon-vortex.js';
import {MOON_WISH_THEMES} from '/shared/13-moons-wish-themes.js';
const el=(tag,text,into)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(into)into.append(n);return n;};
const monthLabel=value=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z'));
export function showMemberMoonPortals(container,{userId,startMonth,wishes}){
 container.replaceChildren();
 const rows=generateBigVisionVortex(startMonth);
 el('h2','Your Calendar Moon Portals',container);
 el('p','Your twelve original wishes are sealed. Enter one calendar moon at a time to witness what has changed.',container);
 const grid=el('div',undefined,container);grid.className='moon-portal-grid';
 rows.forEach((row,i)=>{
  const article=el('article',undefined,grid);article.className='moon-portal-card';
  el('small',monthLabel(row.month),article);
  el('h3',row.name,article);
  if(i===0){el('p','Your opening moon · no wish was made.',article);return;}
  const btn=el('button','Enter this moon',article);btn.type='button';
  btn.onclick=()=>renderPortal(container,{userId,row,position:i+1,wish:wishes[i],returnTo:()=>showMemberMoonPortals(container,{userId,startMonth,wishes})});
 });
}
async function renderPortal(container,{userId,row,position,wish,returnTo}){
 container.replaceChildren();
 const back=el('button','← All moon portals',container);back.type='button';back.onclick=returnTo;
 const article=el('article',undefined,container);article.className='moon-portal-detail';
 el('small',monthLabel(row.month)+' · '+row.wing+' / '+row.season,article);
 el('h2',row.name,article);
 el('p',MOON_WISH_THEMES[row.calendarMonth],article);
 el('h3','The wish you made',article);
 const quoted=el('blockquote',wish||'Your original wish could not be displayed.',article);quoted.className='moon-sealed-wish';
 el('h3','What has changed since then?',article);
 el('p','How has your wish changed? Have you received it, or seen it arrive in another form?',article);
 const input=el('textarea',undefined,article);input.maxLength=4000;input.rows=5;input.placeholder='What I am witnessing…';input.setAttribute('aria-label','My reflection for '+row.name);
 const button=el('button','Save this reflection',article);button.type='button';button.disabled=true;
 const state=el('p','Checking private journal availability…',article);state.setAttribute('role','status');
 const history=el('div',undefined,article);
 const {data,error}=await supabase.from('flowtel_13_moons_wish_journal').select('entry_text,created_at').eq('user_id',userId).eq('moon_position',position).order('created_at',{ascending:false});
 if(!container.contains(article))return;
 if(error){state.textContent='Private wish journaling is not active yet. Do not write anything you need saved here.';input.disabled=true;return;}
 function draw(entries){history.replaceChildren();for(const entry of entries){const section=el('section',undefined,history);section.className='moon-witness-entry';el('small',new Date(entry.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),section);el('p',entry.entry_text,section);}}
 const entries=Array.isArray(data)?data:[];draw(entries);
 button.disabled=false;state.textContent='Your reflection will be private and added without changing the sealed wish.';
 button.onclick=async()=>{
  const text=input.value.trim();if(!text){state.textContent='Write a reflection before saving.';return;}
  button.disabled=true;state.textContent='Saving your reflection…';
  const {data:result,error:saveError}=await supabase.rpc('flowtel_append_13_moons_wish_journal',{p_moon_position:position,p_entry_text:text});
  if(!container.contains(article))return;
  if(saveError||!result?.saved){state.textContent='Could not save this reflection. Your writing remains here; please try again.';button.disabled=false;return;}
  const {data:fresh,error:readError}=await supabase.from('flowtel_13_moons_wish_journal').select('entry_text,created_at').eq('user_id',userId).eq('moon_position',position).order('created_at',{ascending:false});
  if(!readError){draw(fresh||[]);input.value='';state.textContent='Reflection saved privately.';}else state.textContent='Saved, but the journal could not refresh.';
  button.disabled=false;
 };
}
