import { getCurrentProfile, profileNeedsConfirmation } from '/shared/profiles.js';
import { supabase } from '/shared/supabase.js';
import { flowtelEntryMonth, generateBigVisionVortex } from '/shared/13-moon-vortex.js';

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
    if (profileNeedsConfirmation(profile) || !String(profile.hemisphere || '').trim()) {
      message('First, confirm your Guest Profile',
        'Review your name, display name, location, time zone, and hemisphere in your existing Flowtel profile before beginning your Vortex.');
      const link = document.createElement('a');
      link.href = '/client/';
      link.textContent = 'Open my Flowtel Guest Profile';
      link.style.display = 'inline-block';
      detail.append(document.createTextNode(' '), link);
      return;
    }
    const { data: saved, error } = await supabase.from('flowtel_13_moons_vortices')
      .select('start_month,reflections,completed_at')
      .eq('user_id', profile.id).maybeSingle();
    if (error) throw error;
    startMonth = saved?.start_month
      ? String(saved.start_month).slice(0, 7)
      : flowtelEntryMonth();
    sealed = Boolean(saved?.completed_at);
    const rows = generateBigVisionVortex(startMonth);
    renderRows(rows, Array.isArray(saved?.reflections) ? saved.reflections : []);
    byId('greeting').textContent = 'Welcome, ' +
      (profile.display_name || profile.first_name || 'Initiate') + '.';
    view.hidden = false;
    message('Your Big Vision Vortex',
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
