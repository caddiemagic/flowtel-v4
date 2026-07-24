import { WOMB_WORK_MODULES, getFlowFmAssignmentForMoon } from '/shared/flowtel.js';
import { renderTopNav, escapeHtml, safeHref } from '/flow-fm/ui.js?v=0.10.76';
import { isPractitionerLevel, replacePageWithPhaseTwoGate } from '/shared/beta-access.js';

const topNav = document.getElementById('topNav');
const moduleGrid = document.getElementById('moduleGrid');
const moduleDetail = document.getElementById('moduleDetail');

let activeModuleIndex = 1;

topNav.innerHTML = renderTopNav('womb-work');

function moduleLessonLink(module){
  const href = safeHref(module.squarespaceUrl || '');
  return href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open Squarespace Lesson</a>`
    : `<span class="lesson-placeholder">Squarespace lesson placeholder</span>`;
}

function renderModules(){
  moduleGrid.innerHTML = WOMB_WORK_MODULES.map(module => {
    const assignment = getFlowFmAssignmentForMoon(module.index);
    return `<article class="module-card ${module.index === activeModuleIndex ? 'active' : ''}">
      <p class="eyebrow">${escapeHtml(module.months)} · MODULE ${escapeHtml(module.index)}</p>
      <h3>${escapeHtml(module.title)}</h3>
      <p>${escapeHtml(module.description)}</p>
      <div class="module-meta"><span>${escapeHtml(module.arc)}</span><span>Pairs with: ${escapeHtml(assignment?.title || 'Integration')}</span></div>
      <div class="assignment-actions"><button type="button" data-module-index="${escapeHtml(module.index)}">Open Module</button></div>
    </article>`;
  }).join('');
  moduleGrid.querySelectorAll('[data-module-index]').forEach(button => {
    button.addEventListener('click', () => {
      activeModuleIndex = Number(button.dataset.moduleIndex) || 1;
      renderModules();
      renderModuleDetail();
      moduleDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderModuleDetail(){
  const module = WOMB_WORK_MODULES.find(item => item.index === activeModuleIndex) || WOMB_WORK_MODULES[0];
  const assignment = getFlowFmAssignmentForMoon(module.index);
  moduleDetail.innerHTML = `<p class="eyebrow">MODULE ${escapeHtml(module.index)} · ${escapeHtml(module.arc)}</p>
    <h3>${escapeHtml(module.title)}</h3>
    <p>${escapeHtml(module.description)}</p>
    <div class="module-detail-grid">
      <article><span>Practice</span><p>${escapeHtml(module.practice || 'A practice will be added here.')}</p></article>
      <article><span>Reflection Prompt</span><p>${escapeHtml(module.prompt || 'A prompt will be added here.')}</p></article>
      <article><span>Business Assignment Pairing</span><p>${escapeHtml(assignment?.title || 'Integration')}</p></article>
      <article><span>Course Content</span><p>${moduleLessonLink(module)}</p></article>
    </div>${Number(module.index)===1 ? '<div class="module-cta-row"><a class="pill-link" href="/tracker/">Track Your Cycle</a></div>' : ''}`;
}

renderModules();
renderModuleDetail();
