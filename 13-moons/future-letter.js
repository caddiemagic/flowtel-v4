// Private member-only Lesson 3 editor. Never stores text in browser storage.
import { supabase } from '/shared/supabase.js';
import { thirteenMonthsAfter } from '/shared/13-moons-monthly-practices.js';

function element(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;}
export async function addFutureSelfLetterEditor(container,userId){
 const section=element('section');
 section.style.cssText='border:1px solid currentColor;border-radius:12px;padding:1rem;margin:1rem 0';
 section.append(element('h4','Letter to Your Future Self'));
 section.append(element('p','Write from the day thirteen calendar months after your initiation began, as though everything worked out. Describe what unfolded and who you have become. Save a draft until you are ready to seal your letter. Return to read it in Lesson 13.'));
 const date=element('p','Checking your saved initiation date…');section.append(date);
 const input=element('textarea');
 input.rows=10;input.maxLength=20000;input.style.cssText='width:100%;box-sizing:border-box;padding:.8rem;font:inherit';
 input.setAttribute('aria-label','My future-self letter');
 input.disabled=true;
 section.append(input);
 const actions=element('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:.6rem;margin:.8rem 0';
 const draft=element('button','Save draft'),seal=element('button','Seal my letter');
 for(const button of [draft,seal]){button.type='button';button.disabled=true;button.style.cssText='padding:.65rem 1rem;cursor:pointer';actions.append(button);}
 section.append(actions);
 const status=element('p','Private saving is not available until the future-letter database migration is installed and tested.');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');section.append(status);
 container.append(section);
 let savedSealed=false,ready=false;
 try{
  const [startResult,letterResult]=await Promise.all([
   supabase.from('flowtel_13_moons_starts').select('initiation_start_date').eq('user_id',userId).maybeSingle(),
   supabase.from('flowtel_13_moons_future_letters').select('initiation_start_date,letter_date,letter_text,sealed_at').eq('user_id',userId).maybeSingle()
  ]);
  if(startResult.error||letterResult.error){date.textContent='The private start-date and letter storage are not active in this preview.';return;}
  const start=startResult.data?.initiation_start_date;
  if(!start){date.textContent='Your initiation start date has not been registered. Letter saving is unavailable.';return;}
  const due=thirteenMonthsAfter(start);
  if(!due){date.textContent='Your saved start date could not be validated.';return;}
  const stored=letterResult.data;
  if(stored && (stored.initiation_start_date!==start || stored.letter_date!==due)){
   date.textContent='The letter date does not match your initiation start date. Please contact the Flowtel team before writing.';
   return;
  }
  const format=(value)=>new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
  date.textContent='Initiation began: '+format(start)+' · Date your letter: '+format(due);
  input.value=stored?.letter_text||'';
  savedSealed=Boolean(stored?.sealed_at);
  ready=!savedSealed;
  input.disabled=savedSealed;
  draft.disabled=savedSealed;
  seal.disabled=savedSealed;
  status.textContent=savedSealed?'Your letter is sealed and preserved. Revisit it in Initiation 13.':'Your letter is private. Save as a draft, then explicitly seal it when ready.';
 }catch(error){console.error('Unable to load private future letter',error);date.textContent='Unable to check private letter storage.';return;}
 async function persist(shouldSeal){
  if(!ready)return;
  if(shouldSeal){
   if(!input.value.trim()){status.textContent='Write your letter before sealing it.';return;}
   if(!window.confirm('Seal your future-self letter? You will not be able to edit it afterward.'))return;
  }
  draft.disabled=true;seal.disabled=true;
  status.textContent='Saving your letter…';
  try{
   const {data,error}=await supabase.rpc('flowtel_save_13_moons_future_letter',{p_text:input.value,p_seal:shouldSeal});
   if(error)throw error;
   savedSealed=Boolean(data?.sealed);
   ready=!savedSealed;
   input.disabled=savedSealed;
   draft.disabled=savedSealed;
   seal.disabled=savedSealed;
   status.textContent=savedSealed?'Your future-self letter is sealed. Return to it in Lesson 13.':'Draft saved privately.';
  }catch(error){
   console.error('Unable to save future letter',error);
   status.textContent='Your letter was not saved. Keep this page open and try again. You can copy your writing before leaving.';
   draft.disabled=false;seal.disabled=false;
  }
 }
 draft.addEventListener('click',()=>persist(false));
 seal.addEventListener('click',()=>persist(true));
 input.addEventListener('input',()=>{if(ready)status.textContent='Unsaved changes';});
}

export async function addFutureSelfLetterReflection(container,userId){
 const section=element('section');
 section.style.cssText='border:1px solid currentColor;border-radius:12px;padding:1rem;margin:1rem 0';
 section.append(element('h4','Return to Your Future-Self Letter'));
 section.append(element('p','Read the letter you wrote at the beginning of your initiation. Then review your Flow Maps from across the thirteen moons and create a new integration Flow Map reflecting on each inner season.'));
 const details=element('details'),summary=element('summary','Open my original letter');
 summary.style.cssText='cursor:pointer;font-weight:700;padding:.75rem 0';
 details.append(summary);
 const notice=element('p','Checking your private letter…');
 notice.setAttribute('aria-live','polite');details.append(notice);section.append(details);
 const link=element('a','Review my Flow Maps →');
 link.href='/flow-map/?cycle=previous&return='+encodeURIComponent('/13-moons/');
 section.append(link);container.append(section);
 try{
  const {data,error}=await supabase.from('flowtel_13_moons_future_letters')
   .select('initiation_start_date,letter_date,letter_text,sealed_at').eq('user_id',userId).maybeSingle();
  if(error){notice.textContent='Your private letter is not available in this development preview. Letter storage has not been activated.';return;}
  if(!data){notice.textContent='No future-self letter has been saved yet.';return;}
  const due=thirteenMonthsAfter(data.initiation_start_date);
  if(due!==data.letter_date){notice.textContent='Your letter date needs verification before it can be displayed.';return;}
  const formatted=new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(due+'T12:00:00Z'));
  notice.textContent='Written for '+formatted+(data.sealed_at?' · Sealed letter':' · Unsealed draft');
  const text=element('p',data.letter_text||'Your letter is still blank.');
  text.style.whiteSpace='pre-wrap';details.append(text);
 }catch(error){console.error('Unable to retrieve future letter',error);notice.textContent='Unable to load your future-self letter.';}
}
