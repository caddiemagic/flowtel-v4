import { addFutureSelfLetterEditor } from '/13-moons/future-letter.js';
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
  return data;
}
function renderInitiationPath(userId) {
  const root = byId('initiationPath');
  if (!root) return;
  root.replaceChildren();
  for (const module of WOMB_WORK_MODULES) {
    const card = document.createElement('article');
    card.className = 'moon-path-card';
    card.style.cssText = 'margin:1rem 0;padding:1.2rem;';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'INITIATION ' + String(module.index).padStart(2, '0') + ' · ' + module.arc;
    const heading = document.createElement('h3');
    heading.textContent = module.title;
    if (lessonProgress) {
      const completed = Array.isArray(lessonProgress.completed_lessons) && lessonProgress.completed_lessons.includes(module.index);
      const current = Number(lessonProgress.current_lesson) === module.index;
      const state = document.createElement('p');
      state.textContent = completed ? 'Completed' : current ? 'Current lesson' : 'Not yet completed';
      card.append(state);
    }
    const description = document.createElement('p');
    description.textContent = module.description;
    const practiceHeading = document.createElement('h4');
    practiceHeading.textContent = 'Your Womb Work';
    const practice = document.createElement('p');
    practice.textContent = module.practice;
    const reflectionHeading = document.createElement('h4');
    reflectionHeading.textContent = 'Reflection';
    const reflection = document.createElement('p');
    reflection.textContent = module.prompt;
    const integration = document.createElement('p');
    integration.textContent = 'At the end of this moon, review your daily journal and your four inner seasons. Record what you notice on your existing Flow Map.';
    const flowLink = document.createElement('a');
    flowLink.href = '/flow-map/?cycle=previous&return='+encodeURIComponent('/13-moons/');
    flowLink.textContent = 'Open my Flow Map';
    const journalLink = document.createElement('a');
    journalLink.href = '/cycle-data/';
    journalLink.textContent = 'Open my Cycle Data';
    const links = document.createElement('p');
    links.append(flowLink, document.createTextNode(' · '), journalLink);
    const note = document.createElement('small');
    note.textContent = 'Early lesson preview. Written teaching expansions and private monthly submissions are still in development.';
    const expanded = document.createElement('details');
    const toggle = document.createElement('summary');
    toggle.textContent = 'Open written teaching and Daily Practice';
    toggle.style.cssText = 'cursor:pointer;font-weight:700;padding:.8rem 0';
    expanded.append(toggle);
    const teaching = LESSON_TEACHING_DRAFTS[module.index];
    if (teaching) {
      const title = document.createElement('h4'); title.textContent = 'Written Teaching · Draft';
      expanded.append(title);
      for (const paragraph of teaching.paragraphs) {
        const p=document.createElement('p'); p.textContent=paragraph; expanded.append(p);
      }
      if(module.index===2)expanded.append(createMoonMagicMedicineWheel());
    }
    const daily = MONTHLY_INITIATION_PRACTICES[module.index];
    if (daily) {
      const title=document.createElement('h4');title.textContent='Daily Practice';expanded.append(title);
      const name=document.createElement('strong');name.textContent=daily.title;expanded.append(name);
      const body=document.createElement('p');body.textContent=daily.body;expanded.append(body);
      if(daily.script){const script=document.createElement('blockquote');script.textContent=daily.script;script.style.whiteSpace='pre-line';expanded.append(script);}
      if(daily.link){const a=document.createElement('a');a.href=daily.link;a.textContent=daily.linkLabel||'Open practice';a.target='_blank';a.rel='noopener noreferrer';expanded.append(a);}
    }
    const original=document.createElement('div');original.append(practiceHeading,practice,reflectionHeading,reflection,integration,links,note);
    expanded.append(original);
    if(module.index===3)void addFutureSelfLetterEditor(expanded,userId);
    card.append(eyebrow, heading, description, expanded);
    root.append(card);
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
    const label = document.createElement('label');
    const fieldId = 'vortex-reflection-' + i;
    label.htmlFor = fieldId;
    label.textContent = 'What do you sense about this moon?';
    label.style.cssText = 'display:block;margin:.75rem 0;';
    const input = document.createElement('textarea');
    input.id = fieldId;
    input.rows = 4;
    input.maxLength = 4000;
    input.value = typeof reflections[i] === 'string' ? reflections[i] : '';
    input.disabled = sealed;
    input.style.cssText = 'display:block;width:100%;box-sizing:border-box;padding:.75rem;font:inherit;';
    input.addEventListener('input', () => { if (!sealed) showNotice('Unsaved changes'); });
    section.append(heading, wing, label, input);
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
      showNotice('Read-only preview. Do not enter reflections here.');
      return;
    }
    startMonth = saved?.start_month
      ? String(saved.start_month).slice(0, 7)
      : flowtelEntryMonth();
    sealed = Boolean(saved?.completed_at);
    stepStatus('vortexStepStatus', sealed ? 'Complete' : 'In progress');
    const rows = generateBigVisionVortex(startMonth);
    renderRows(rows, Array.isArray(saved?.reflections) ? saved.reflections : []);
    byId('greeting').textContent = 'Welcome, ' +
      (profile.display_name || profile.first_name || 'Initiate') + '.';
    view.hidden = false;
    renderInitiationPath(profile.id);
    message('Your opening Big Vision Vortex',
      'Write the impressions that arise for all thirteen moons. Save a draft anytime. Filling every moon seals your opening reflections.');
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
  showNotice('Saving your reflections…');
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
      showNotice('Your Big Vision Vortex is complete. Your opening reflections are sealed.');
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
