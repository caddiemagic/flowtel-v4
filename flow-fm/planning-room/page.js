import { MOON_CALENDARS, MOON_PHASE_KEY, WEEKLY_PLANNING_PROMPTS } from '/shared/flowtel.js';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js';

const topNav = document.getElementById('topNav');
const calendarGrid = document.getElementById('calendarGrid');
const phaseKeyCard = document.getElementById('phaseKeyCard');
const weeklyPromptCard = document.getElementById('weeklyPromptCard');

topNav.innerHTML = renderTopNav('planning-room');
calendarGrid.innerHTML = MOON_CALENDARS.map(item => `<article class="calendar-card"><p class="eyebrow">${escapeHtml(item.rangeLabel)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><div class="calendar-meta"><span>Portal opens: ${escapeHtml(item.portalOpens)}</span><span>Portal closes: ${escapeHtml(item.portalCloses)}</span></div><div class="assignment-actions"><a class="pill-link muted" href="${escapeHtml(item.assetPath)}" target="_blank" rel="noreferrer">Open calendar PDF</a></div></article>`).join('');
phaseKeyCard.innerHTML = `<p class="eyebrow">MOON PHASE KEY</p><h3>Work with the phase you are in.</h3><div class="phase-list">${MOON_PHASE_KEY.map(item => `<div class="phase-row"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.copy)}</p></div>`).join('')}</div><div class="phase-row"><strong>Portal opens / closes</strong><p>Portal opens marks the stretch where action, invitation, and visibility can move forward. Portal closes is the place to soften, complete, and prepare for the next room.</p></div>`;
weeklyPromptCard.innerHTML = `<p class="eyebrow">WEEKLY PLANNING PROMPTS</p><h3>Keep the business practical.</h3><ul class="prompt-list">${WEEKLY_PLANNING_PROMPTS.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="phase-row"><strong>Eventually</strong><p>Archive calendars and a Squarespace-linked teaching video can live here for each moon cycle.</p></div>`;
