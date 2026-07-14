// Flowtel v0.10.28 — Phase 2 beta access gates.

export const PRACTITIONER_LEVEL_ROLES = ['practitioner', 'admin', 'owner'];
export const QUEENDOM_HOME_URL = 'https://www.theidyllcollective.com/queendomhome';

export function normalizedRole(profile){
  return String(profile?.role || '').toLowerCase();
}

export function isPractitionerLevel(profile){
  return PRACTITIONER_LEVEL_ROLES.includes(normalizedRole(profile));
}

export function ensurePhaseTwoGateStyles(){
  if(document.getElementById('flowtelPhaseTwoGateStyles')) return;
  const style=document.createElement('style');
  style.id='flowtelPhaseTwoGateStyles';
  style.textContent=`
    .phase-two-gated-page{background:#fbf7f0;color:#705244;}
    .phase-two-gate-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:clamp(2rem,6vw,5rem) 1.25rem;box-sizing:border-box;background:radial-gradient(circle at top,rgba(231,214,177,.34),transparent 42%),#fbf7f0;}
    .phase-two-gate-card{width:min(780px,100%);border:1px solid rgba(214,178,95,.34);border-radius:34px;background:rgba(255,253,248,.9);box-shadow:0 28px 80px rgba(117,77,57,.08);padding:clamp(2rem,6vw,4.5rem);text-align:center;}
    .phase-two-gate-card .eyebrow{margin:0 0 1rem;letter-spacing:.34em;text-transform:uppercase;color:#c87574;font-size:.78rem;font-weight:700;}
    .phase-two-gate-card h1{margin:0;color:#745347;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:clamp(3rem,8vw,5.4rem);line-height:.96;}
    .phase-two-gate-card p{margin:1.35rem auto 0;max-width:58ch;color:#9f7465;font-size:1.12rem;line-height:1.7;}
    .phase-two-gate-actions{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center;margin-top:2rem;}
    .phase-two-gate-actions a{display:inline-flex;align-items:center;justify-content:center;min-width:220px;padding:1rem 1.35rem;border-radius:999px;border:1px solid rgba(116,83,71,.18);text-decoration:none;text-transform:uppercase;letter-spacing:.22em;font-weight:800;font-size:.76rem;color:#745347;background:#fffaf4;}
    .phase-two-gate-actions a.primary{background:#f5dfdb;border-color:#e7c2be;}
    .phase-two-gate-note{font-style:italic;font-size:.98rem!important;color:#a68578!important;}
    @media(max-width:640px){.phase-two-gate-card{border-radius:26px;padding:2rem 1.15rem}.phase-two-gate-actions a{width:100%;min-width:0}.phase-two-gate-card h1{font-size:2.75rem}}
  `;
  document.head.appendChild(style);
}

export function renderPhaseTwoGate({
  featureName='This room',
  title='Opening in Phase 2',
  copy='',
  returnHref='/client/?suite=1',
  returnLabel='Return to the Flowtel',
  showQueendomLink=true,
}={}){
  ensurePhaseTwoGateStyles();
  const finalCopy=copy || `${featureName} will open in Phase 2 of beta testing. For now, the guest check-in flow is the path we are testing most deeply.`;
  const queendomLink=showQueendomLink ? `<a href="${QUEENDOM_HOME_URL}">Return to the Queendom</a>` : '';
  return `
    <section class="phase-two-gate-shell">
      <article class="phase-two-gate-card">
        <p class="eyebrow">PHASE 2 BETA</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(finalCopy)}</p>
        <div class="phase-two-gate-actions">
          <a class="primary" href="${returnHref}">${escapeHtml(returnLabel)}</a>
          ${queendomLink}
        </div>
        <p class="phase-two-gate-note">It’s always sunny on the moon.</p>
      </article>
    </section>
  `;
}

export function replacePageWithPhaseTwoGate(options={}){
  ensurePhaseTwoGateStyles();
  document.body.classList.add('phase-two-gated-page');
  const main=document.querySelector('main') || document.body;
  main.innerHTML=renderPhaseTwoGate(options);
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
