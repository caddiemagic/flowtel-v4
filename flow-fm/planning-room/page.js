import { MOON_CALENDARS, MOON_PHASE_KEY, WEEKLY_PLANNING_PROMPTS } from '/shared/moon-calendars.js?v=0.10.38';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js?v=0.10.76';
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';

const topNav = document.getElementById('topNav');
const calendarGrid = document.getElementById('calendarGrid');
const phaseKeyCard = document.getElementById('phaseKeyCard');
const weeklyPromptCard = document.getElementById('weeklyPromptCard');

topNav.innerHTML = renderTopNav('planning-room');

calendarGrid.innerHTML = MOON_CALENDARS.map(item => {
  const pdfNote = item.pdfAvailable
    ? ''
    : `<p class="calendar-placeholder-note">Placeholder path reserved. Final custom calendar PDF has not been installed yet.</p>`;
  const moonLines = item.newMoon || item.fullMoon
    ? `<div class="calendar-moon-lines">
        ${item.newMoon ? `<span><strong>New Moon</strong>${escapeHtml(item.newMoon)}</span>` : ''}
        ${item.fullMoon ? `<span><strong>Full Moon</strong>${escapeHtml(item.fullMoon)}</span>` : ''}
      </div>`
    : '';
  const currentBadge = item.featured ? `<span class="calendar-current-badge">Current Moon</span>` : '';

  return `<article class="calendar-card calendar-card--lunar ${item.featured ? 'current-moon-calendar' : ''}">
    ${currentBadge}
    <p class="eyebrow">${escapeHtml(item.rangeLabel)}</p>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.summary)}</p>
    ${moonLines}
    <div class="assignment-actions"><a class="pill-link muted calendar-pdf-link" href="${escapeHtml(item.assetPath)}" target="_blank" rel="noreferrer">Open Calendar PDF</a></div>
    ${pdfNote}
  </article>`;
}).join('');


phaseKeyCard.innerHTML = `<p class="eyebrow">MOON PHASE KEY</p>
  <h3>Let the phase choose the pace.</h3>
  <div class="phase-teaching-list">${MOON_PHASE_KEY.map(item => `<article class="phase-teaching-row"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.copy)}</p></article>`).join('')}</div>`;

weeklyPromptCard.innerHTML = `<p class="eyebrow">WEEKLY PLANNING PROMPTS</p>
  <h3>One prompt at a time.</h3>
  <div class="prompt-note-list">${WEEKLY_PLANNING_PROMPTS.map((item,index) => `<article class="prompt-note"><span>Prompt ${String(index + 1).padStart(2,'0')}</span><p>${escapeHtml(item)}</p></article>`).join('')}</div>
  <div class="phase-teaching-row phase-teaching-row--soft"><strong>Coming Soon</strong><p>Archive calendars and a Squarespace-linked teaching video can live here for each moon cycle when the final calendar files are provided.</p></div>`;
