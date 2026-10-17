import {createCycleDayExplorer} from '/13-moons/lesson-interactions.js';
import {showMemberMoonPortals} from '/13-moons/member-moon-portals.js';
import {MOON_WISH_THEMES} from '/shared/13-moons-wish-themes.js';
import { addFutureSelfLetterEditor, addFutureSelfLetterReflection } from '/13-moons/future-letter.js';
import { createMoonMagicMedicineWheel } from '/shared/moon-magic-medicine-wheel.js';
import { getCurrentProfile, profileNeedsConfirmation } from '/shared/profiles.js';
import { supabase } from '/shared/supabase.js';
import { WOMB_WORK_MODULES } from '/shared/womb-work.js';
import { flowtelEntryMonth, generateBigVisionVortex } from '/shared/13-moon-vortex.js';
import { LESSON_TEACHING_DRAFTS } from '/13-moons/showcase/lesson/teaching-drafts.js';
import { MONTHLY_INITIATION_PRACTICES } from '/shared/13-moons-monthly-practices.js';

const byId = (id) => document.getElementById(id);
const status = byId('status');
const detail = byId('detail');
const view = byId('memberView');
const months = byId('vortexMonths');
const notice = byId('saveStatus');
const save = byId('saveVortex');
let startMonth = '';
let sealed = false;
let entries = [];

function message(title, description) {
  status.textContent = title;
  detail.textContent = description;
}
function showNotice(text) {
  notice.textContent = text;
}
function stepStatus(id, text) {
  const element = byId(id);
  if (element) element.textContent = '· ' + text;
}
function flowFmMember(profile) {
  return Number(profile?.membership_rank || 0) >= 2 ||
    ['flowfm', 'council'].includes(String(profile?.membership_type || '').toLowerCase());
}
async function eligible(profile) {
  if (!profile) return false;
  if (flowFmMember(profile)) return true;
  const { data, error } = await supabase.from('flowtel_13_moons_entitlements')
    .select('access_granted').eq('user_id', profile.id).maybeSingle();
  if (error) throw error;
  return data?.access_granted === true;
}
let lessonProgress = null;
async function loadLessonProgress(profile) {
  const { data, error } = await supabase.from('flowtel_13_moons_lesson_progress')
    .select('current_lesson,completed_lessons').eq('user_id', profile.id).maybeSingle();
  // Migration 087 is only a draft. A missing table must not break onboarding.
  if (error) return null;
  // A first-time member has no row until completing Lesson 1. The RPC creates it.
  return data || { current_lesson: 1, completed_lessons: [] };
}
function lessonSection(label, hint, content, open=false) {
  const panel=document.createElement('details');
  panel.className='initiation-lesson-section';
  panel.open=open;
  const summary=document.createElement('summary');
  summary.className='initiation-section-summary';
  const title=document.createElement('strong');title.textContent=label;
  const description=document.createElement('span');description.textContent=hint;
  summary.append(title,description);
  const body=document.createElement('div');body.className='initiation-section-body';
  if(Array.isArray(content))body.append(...content);
  else if(content)body.append(content);
  panel.append(summary,body);
  return {panel,body};
}
function lessonText(tag,text){
  const node=document.createElement(tag);node.textContent=text;return node;
}
function makeCeremonialStages(card,moduleIndex){
 const disclosure=card.querySelector('.initiation-lesson-open');
 const contents=disclosure?.querySelector('.initiation-lesson-contents');
 if(!disclosure||!contents)return;
 const stages=[];
 const heading=card.querySelector('.initiation-lesson-intro');
 const welcome=document.createElement('section');
 welcome.className='moon-stage';
 const title=document.createElement('h4');title.textContent='The invitation';
 const description=document.createElement('p');description.textContent=heading?.textContent||'';
 welcome.append(title,description);stages.push(welcome);
 const sections=[...contents.querySelectorAll(':scope > .initiation-lesson-section')];
 for(const section of sections){
  const topLabel=section.querySelector(':scope > summary strong')?.textContent||'Your initiation';
  const body=section.querySelector(':scope > .initiation-section-body');
  if(!body)continue;
  const nested=[...body.querySelectorAll(':scope > .initiation-lesson-section')];
  if(nested.length){
   for(const child of nested){
    const panel=document.createElement('section');panel.className='moon-stage';
    const title=document.createElement('h4');
    title.textContent=child.querySelector(':scope > summary strong')?.textContent||topLabel;
    const inner=child.querySelector(':scope > .initiation-section-body');
    panel.append(title);
    if(inner)while(inner.firstChild)panel.append(inner.firstChild);
    stages.push(panel);
   }
  } else {
   const panel=document.createElement('section');panel.className='moon-stage';
   const title=document.createElement('h4');title.textContent=topLabel;
   panel.append(title);
   while(body.firstChild)panel.append(body.firstChild);
   stages.push(panel);
  }
  if(topLabel.startsWith('01') && (moduleIndex===1||moduleIndex===2)){
   const interactive=document.createElement('section');interactive.className='moon-stage';
   const h=document.createElement('h4');
   h.textContent=moduleIndex===1?'Explore your cycle day':'Explore your Inner Seasons';
   interactive.append(h,createCycleDayExplorer(moduleIndex===1?'track':'seasons'));
   stages.push(interactive);
  }
 }
 const reader=document.createElement('div');reader.className='moon-stage-reader';
 const progress=document.createElement('p');progress.className='moon-stage-progress';progress.setAttribute('aria-live','polite');
 const frame=document.createElement('div');frame.className='moon-stage-frame';
 const controls=document.createElement('nav');controls.className='moon-stage-controls';
 const previous=document.createElement('button');previous.type='button';previous.textContent='← Previous';
 const next=document.createElement('button');next.type='button';next.textContent='Continue →';
 controls.append(previous,next);
 reader.append(progress,frame,controls);
 let index=0;
 function show(n){
  index=Math.max(0,Math.min(stages.length-1,n));
  frame.replaceChildren(stages[index]);
  progress.textContent='STEP '+(index+1)+' OF '+stages.length;
  previous.disabled=index===0;next.disabled=index===stages.length-1;
  next.textContent=index===stages.length-1?'End of this initiation':'Continue →';
 }
 previous.onclick=()=>show(index-1);next.onclick=()=>show(index+1);
 disclosure.replaceWith(reader);
 show(0);
}
function renderInitiationPath(userId) {
  const root=byId('initiationPath');
  if(!root)return;
  root.replaceChildren();
  const progress=lessonProgress;
  const finished=Array.isArray(progress?.completed_lessons)?progress.completed_lessons:[];
  for(const module of WOMB_WORK_MODULES){
    const card=document.createElement('article');
    card.className='initiation-lesson-card';
    const completed=finished.includes(module.index);
    const current=Number(progress?.current_lesson||1)===module.index;
    const header=lessonText('p','INITIATION '+String(module.index).padStart(2,'0')+' · '+module.arc);
    header.className='initiation-lesson-eyebrow';
    const title=lessonText('h3',module.title);
    const intro=lessonText('p',module.description);
    intro.className='initiation-lesson-intro';
    const state=lessonText('span',completed?'Completed':current?'Current initiation':'On your path');
    state.className='initiation-lesson-state';
    const top=document.createElement('div');
    top.className='initiation-lesson-top';
    top.append(header,state);
    card.append(top,title,intro);
    const lesson=document.createElement('details');
    lesson.className='initiation-lesson-open';
    const label=document.createElement('summary');
    label.textContent='Enter this initiation';
    lesson.append(label);
    const contents=document.createElement('div');contents.className='initiation-lesson-contents';
    contents.append(lessonText('p','Move through one section at a time. Your teaching and practices will be here whenever you return.'));
    const teaching=LESSON_TEACHING_DRAFTS[module.index];
    if(teaching){
      const textPanel=lessonSection('01 · The Teaching','Read and take in the lesson');
      const paragraphs=teaching.paragraphs;
      for(let i=0;i<paragraphs.length;i+=2){
        const part=lessonSection('Part '+(Math.floor(i/2)+1),'A moment to read',paragraphs.slice(i,i+2).map(p=>lessonText('p',p)),i===0);
        textPanel.body.append(part.panel);
      }
      if(module.index===2){
        const visual=lessonSection('Moon Magic Medicine Wheel','Study the full 28-day wheel',createMoonMagicMedicineWheel());
        textPanel.body.append(visual.panel);
      }
      contents.append(textPanel.panel);
    }
    const daily=MONTHLY_INITIATION_PRACTICES[module.index];
    if(daily){
      const dailyContent=[lessonText('h5',daily.title),lessonText('p',daily.body)];
      if(daily.script){
        const script=lessonText('blockquote',daily.script);
        script.style.whiteSpace='pre-line';dailyContent.push(script);
      }
      if(daily.link){
        const anchor=document.createElement('a');
        anchor.href=daily.link;anchor.textContent=daily.linkLabel||'Open practice';
        anchor.target='_blank';anchor.rel='noopener noreferrer';
        dailyContent.push(anchor);
      }
      contents.append(lessonSection('02 · Daily Practice','A rhythm to carry into each day',dailyContent).panel);
    }
    const womb=lessonSection('03 · Your Womb Work','One intentional assignment',[lessonText('p',module.practice)]);
    if(module.index===3)void addFutureSelfLetterEditor(womb.body,userId);
    contents.append(womb.panel);
    const reflection=lessonSection('04 · Reflection','Let your experience speak',[lessonText('p',module.prompt)]);
    contents.append(reflection.panel);
    const closingContent=[
      lessonText('p',teaching?.integration||'At the end of this moon, review your existing cycle observations across your four inner seasons.')
    ];
    const flowLink=document.createElement('a');
    flowLink.href='/flow-map/?cycle=previous&return='+encodeURIComponent('/13-moons/');
    flowLink.textContent='Open my Flow Map →';
    const journalLink=document.createElement('a');
    journalLink.href='/cycle-data/';journalLink.textContent='Open my Cycle Data →';
    closingContent.push(flowLink,journalLink);
    const moonClose=lessonSection('05 · Moon Close','Return to your Flow Map',closingContent);
    if(module.index===13)void addFutureSelfLetterReflection(moonClose.body,userId);
    const completion=document.createElement('div');completion.className='initiation-completion';
    const completionStatus=lessonText('p',!progress?'Completion saving is not active yet. Your teaching is available for review.':completed?'This initiation is complete.':current?'When you have finished your Womb Work and reflection, mark this initiation complete.':'Complete earlier initiations in order first.');
    completionStatus.setAttribute('role','status');
    const button=document.createElement('button');
    button.type='button';button.textContent=completed?'Initiation completed':'Complete this initiation';
    button.disabled=!progress||completed||!current;
    button.addEventListener('click',async()=>{
      if(button.disabled)return;
      button.disabled=true;completionStatus.textContent='Saving your completion…';
      try{
        const {data,error}=await supabase.rpc('flowtel_complete_13_moons_lesson',{p_lesson:module.index});
        if(error||!data?.complete)throw error||new Error('Missing result');
        lessonProgress={current_lesson:data.current_lesson,completed_lessons:data.completed_lessons};
        renderInitiationPath(userId);
        const next=document.getElementById('initiation-'+Math.min(module.index+1,13));
        if(next&&module.index<13)next.scrollIntoView({block:'start',behavior:'smooth'});
      }catch(error){
        console.error('Could not save lesson completion',error);
        completionStatus.textContent='Completion could not be saved. Please try again.';
        button.disabled=false;
      }
    });
    completion.append(button,completionStatus);
    moonClose.body.append(completion);
    contents.append(moonClose.panel);
    lesson.append(contents);
    card.append(lesson);
    card.id='initiation-'+module.index;
    root.append(card);
    makeCeremonialStages(card,module.index);
  }
}
function renderRows(rows, reflections) {
  months.replaceChildren();
  entries = rows.map((row, i) => {
    const section = document.createElement('section');
    section.className = 'moon-path-card';
    section.style.cssText = 'padding:1.25rem;margin:1rem 0;';
    const heading = document.createElement('h3');
    heading.textContent = row.month + ' · ' + row.name;
    const wing = document.createElement('p');
    wing.textContent = row.wing + ' · ' + row.season;
    const theme=document.createElement('p');theme.textContent=MOON_WISH_THEMES[row.calendarMonth];
    const label = document.createElement('label');
    const fieldId = 'vortex-reflection-' + i;
    label.htmlFor = fieldId;
    label.textContent = i===0?'This is your current moon. You will wish on its return as Moon 13.':'My wish for '+row.name+' ('+row.month+')';
    label.style.cssText = 'display:block;margin:.75rem 0;';
    const input = document.createElement('textarea');
    input.id = fieldId;
    input.rows = 4;
    input.maxLength = 4000;
    input.value = i===0?'':typeof reflections[i] === 'string' ? reflections[i] : '';
    input.disabled = sealed || i===0;
    input.style.cssText = 'display:block;width:100%;box-sizing:border-box;padding:.75rem;font:inherit;';
    input.addEventListener('input', () => { if (!sealed) showNotice('Unsaved changes'); });
    section.append(heading, wing, theme, label, input);
    months.append(section);
    return input;
  });
  save.hidden = sealed;
  if (sealed) showNotice('Your original opening reflections are sealed and preserved.');
}
async function load() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      message('Please sign in', 'Your preview uses a separate browser session from live Flowtel. Sign in using your existing Flowtel account.');
      const link = document.createElement('a');
      link.href = '/client/';
      link.textContent = 'Sign in to the Flowtel preview';
      link.style.cssText = 'display:inline-block;margin-top:1rem;padding:.8rem 1.25rem;border:1px solid currentColor;border-radius:999px;';
      detail.append(document.createElement('br'), link);
      return;
    }
    if (!(await eligible(profile))) {
      message('13 Moons initiation access required',
        'Your account does not have an active 13 Moons or Flow FM entitlement.');
      return;
    }
    lessonProgress = await loadLessonProgress(profile);
    // Entitlement has been checked: keep the curriculum visible even while
    // the guest completes the opening onboarding requirements.
    byId('greeting').textContent = 'Welcome, ' + (profile.display_name || profile.first_name || 'Initiate') + '.';
    view.hidden = false;
    renderInitiationPath(profile.id);
    save.hidden = true;
    if (profileNeedsConfirmation(profile) || !String(profile.hemisphere || '').trim()) {
      stepStatus('profileStepStatus', 'Needs confirmation');
      stepStatus('vortexStepStatus', 'Waiting for profile');
      months.replaceChildren();
      message('First, confirm your Guest Profile',
        'Review your name, display name, location, time zone, and hemisphere in your existing Flowtel profile before beginning your Vortex.');
      const link = document.createElement('a');
      link.href = '/client/';
      link.textContent = 'Open my Flowtel Guest Profile';
      link.style.display = 'inline-block';
      detail.append(document.createTextNode(' '), link);
      return;
    }
    stepStatus('profileStepStatus', 'Confirmed');
    // Establish the actual initiation day once, before any later letter drafting.
    // Migration 091 remains unapplied in previews, so registration failure must
    // not masquerade as successful enrollment or block curriculum review.
    const { data: initiationDay, error: beginError } = await supabase.rpc('flowtel_begin_13_moons');
    if (!beginError && initiationDay) {
      const info = document.createElement('p');
      info.textContent = 'Your initiation began on ' + String(initiationDay) + '. Your future-self letter date is calculated from this day.';
      byId('greeting').after(info);
    } else {
      const info = document.createElement('p');
      info.textContent = 'Initiation start-date registration is not active in this development preview. Your start date has not been saved.';
      byId('greeting').after(info);
    }
    stepStatus('vortexStepStatus', 'Checking saved reflections');
    const { data: saved, error } = await supabase.from('flowtel_13_moons_vortices')
      .select('start_month,reflections,completed_at')
      .eq('user_id', profile.id).maybeSingle();
    if (error) {
      // Database migrations 085/086 are not installed. Permit only an existing
      // Flow FM member to view a non-editable calendar; never expose draft fields.
      if (!flowFmMember(profile)) throw error;
      const list = document.createElement('ol');
      for (const row of generateBigVisionVortex(flowtelEntryMonth())) {
        const item = document.createElement('li');
        item.textContent = row.month + ' · ' + row.name + ' · ' + row.wing;
        list.append(item);
      }
      months.replaceChildren(list);
      byId('greeting').textContent = 'Welcome, ' + (profile.display_name || profile.first_name || 'Initiate') + '.';
      view.hidden = false;
      renderInitiationPath(profile.id);
      save.hidden = true;
      message('Your thirteen moons — calendar preview', 'Private reflection storage is not installed yet, so saving is disabled. This view does not collect your writing.');
      stepStatus('vortexStepStatus', 'Storage not installed');
      showNotice('Read-only preview. Do not enter wishes here.');
      return;
    }
    startMonth = saved?.start_month
      ? String(saved.start_month).slice(0, 7)
      : flowtelEntryMonth();
    sealed = Boolean(saved?.completed_at);
    byId('openingVortex').hidden=sealed;
    byId('memberMoonPortals').hidden=!sealed;
    if(sealed)showMemberMoonPortals(byId('memberMoonPortals'),{userId:profile.id,startMonth,wishes:Array.isArray(saved?.reflections)?saved.reflections:[]});
    stepStatus('vortexStepStatus', sealed ? 'Complete' : 'In progress');
    const rows = generateBigVisionVortex(startMonth);
    renderRows(rows, Array.isArray(saved?.reflections) ? saved.reflections : []);
    byId('greeting').textContent = 'Welcome, ' +
      (profile.display_name || profile.first_name || 'Initiate') + '.';
    view.hidden = false;
    renderInitiationPath(profile.id);
    message('Your opening Big Vision Vortex',
      'Read each moon name and theme. Skip wishing on your current month and make one wish for each of the next twelve calendar months, including the return of your current moon as Moon 13. Save a draft anytime; all twelve future wishes seal your Vortex.');
    if (!sealed) showNotice('Not saved yet. Your writing stays in this browser until you save.');
  } catch (error) {
    console.error('13 Moons onboarding could not load', error);
    message('The Vortex is not ready yet',
      'Membership verification or private storage could not be loaded. No reflections were changed.');
  }
}
save.addEventListener('click', async () => {
  if (sealed || save.disabled) return;
  save.disabled = true;
  showNotice('Saving your wishes…');
  try {
    const reflections = entries.map((input) => input.value);
    const { data, error } = await supabase.rpc('flowtel_save_13_moons_vortex', {
      p_start_month: startMonth + '-01',
      p_reflections: reflections,
    });
    if (error) throw error;
    sealed = data?.complete === true;
    if (sealed) {
      stepStatus('vortexStepStatus', 'Complete');
      entries.forEach((input) => { input.disabled = true; });
      save.hidden = true;
      showNotice('Your Big Vision Vortex is complete. Your twelve future wishes are sealed.');
      byId('openingVortex').hidden=true;
      byId('memberMoonPortals').hidden=false;
      showMemberMoonPortals(byId('memberMoonPortals'),{userId:(await getCurrentProfile()).id,startMonth,wishes:reflections});
    } else {
      showNotice('Draft saved. Return whenever you are ready.');
    }
  } catch (error) {
    console.error('Unable to save the Vortex', error);
    showNotice('Could not save. Your writing remains on this page; please try again.');
  } finally {
    save.disabled = false;
  }
});
load();
