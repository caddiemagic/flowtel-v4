import { WOMB_WORK_MODULES, getFlowFmAssignmentForMoon } from '/shared/flowtel.js';
import { renderTopNav, escapeHtml } from '/flow-fm/ui.js';

const topNav = document.getElementById('topNav');
const moduleGrid = document.getElementById('moduleGrid');

topNav.innerHTML = renderTopNav('womb-work');
moduleGrid.innerHTML = WOMB_WORK_MODULES.map(module => {
  const assignment = getFlowFmAssignmentForMoon(module.index);
  return `<article class="module-card"><p class="eyebrow">${escapeHtml(module.months)} · MODULE ${escapeHtml(module.index)}</p><h3>${escapeHtml(module.title)}</h3><p>${escapeHtml(module.description)}</p><div class="module-meta"><span>${escapeHtml(module.arc)}</span><span>Pairs with: ${escapeHtml(assignment?.title || 'Integration')}</span></div><div class="assignment-links"><a href="#">Squarespace lesson placeholder</a></div></article>`;
}).join('');
