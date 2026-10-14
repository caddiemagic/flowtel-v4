import { getCurrentProfile } from '/shared/profiles.js';
import { flowtelEntryMonth, generateBigVisionVortex } from '/shared/13-moon-vortex.js';

const status = document.getElementById('status');
const detail = document.getElementById('detail');
const memberView = document.getElementById('memberView');
const greeting = document.getElementById('greeting');
const months = document.getElementById('vortexMonths');

function hasExistingFlowFmAccess(profile) {
  return Boolean(profile && (
    Number(profile.membership_rank || 0) >= 2 ||
    ['flowfm', 'council'].includes(String(profile.membership_type || '').toLowerCase())
  ));
}

async function showCalendarPreview() {
  try {
    const profile = await getCurrentProfile();
    if (!hasExistingFlowFmAccess(profile)) {
      status.textContent = 'Your initiation is not available yet';
      detail.textContent = 'This preview is currently for existing Flow FM members. The separate 13 Moons purchase verification is not yet activated.';
      return;
    }
    const rows = generateBigVisionVortex(flowtelEntryMonth());
    const list = document.createElement('ol');
    for (const row of rows) {
      const item = document.createElement('li');
      item.textContent = row.month + ' · ' + row.name + ' · ' + row.wing;
      list.appendChild(item);
    }
    greeting.textContent = 'Welcome, ' + (profile.display_name || profile.first_name || 'Initiate') + '.';
    months.replaceChildren(list);
    memberView.hidden = false;
    status.textContent = 'Your thirteen moons';
    detail.textContent = 'Read-only preview: no reflections are being collected or saved.';
  } catch (error) {
    console.error('Could not verify the Vortex preview membership.', error);
    status.textContent = 'We could not verify your membership';
    detail.textContent = 'Please return to your existing Flowtel entrance and try again.';
  }
}

showCalendarPreview();
