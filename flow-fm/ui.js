import {
  toneForAssignmentStatus,
  labelForAssignmentStatus,
  toneForPriestessProfileStatus,
  labelForPriestessProfileStatus,
} from '/shared/flowtel.js';

export function params(){ return new URLSearchParams(window.location.search); }
export function requestedMemberId(){ return params().get('member') || params().get('client') || null; }
export function isMentorRole(profile){ return ['practitioner','mentor','concierge','manager','admin','owner'].includes(String(profile?.role || '').toLowerCase()); }
export function isAdminRole(profile){ return ['admin','owner'].includes(String(profile?.role || '').toLowerCase()); }
export function isViewingAnotherMember(profile){ return !!requestedMemberId() && requestedMemberId() !== profile?.id; }
export function normalizeMembership(value){ return String(value || '').toLowerCase().replace(/[^a-z]/g, ''); }
export function canTendOwnAssignments(profile){
  // v0.10.3 repair: do not hide Flow FM forms from an authenticated user
  // just because one membership/role field is named differently in Supabase.
  // The database still enforces ownership/consent on save and review actions.
  if(!profile?.id) return false;

  const membership = normalizeMembership(profile?.membership_type || profile?.membership_rank || profile?.membership);
  const level = normalizeMembership(profile?.practitioner_level);
  const role = normalizeMembership(profile?.role);

  return (
    isMentorRole(profile) ||
    ['flowfm','flowfmmember','flowfminitiate','flowfmpractitioner','council','flowfmfoundingmotherscircle','member'].includes(membership) ||
    ['initiate','moonpriestess','priestess','practitioner'].includes(level) ||
    ['client','guest','member'].includes(role) ||
    !!profile.flowfm_started_at ||
    !!profile.flow_fm_started_at ||
    !!profile.is_initiated ||
    true
  );
}
export function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
export function safeHref(value){
  const raw = String(value || '').trim();
  if(!raw) return '';
  try{
    const url = new URL(raw, window.location.origin);
    if(['http:','https:','mailto:'].includes(url.protocol)) return url.href;
  }catch(error){ console.warn('Ignoring unsafe URL', error); }
  return '';
}
export function formatDate(value){
  if(!value) return '—';
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return String(value).slice(0,10);
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date);
}
export function setMessage(node, text=''){
  if(node) node.textContent = text;
}
export function seasonClass(season){
  return String(season || '').toLowerCase().replace(/[^a-z0-9]+/g,'-');
}
export function statusPill(status){
  return `<span class="status-pill tone-${escapeHtml(toneForAssignmentStatus(status))}">${escapeHtml(labelForAssignmentStatus(status))}</span>`;
}
export function profileStatusPill(status){
  return `<span class="status-pill tone-${escapeHtml(toneForPriestessProfileStatus(status))}">${escapeHtml(labelForPriestessProfileStatus(status))}</span>`;
}
export function csvToPills(value){
  return String(value || '')
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map(item => `<span>${escapeHtml(item)}</span>`)
    .join('');
}
export function boolAttr(value){ return value ? 'checked' : ''; }

const NAV_ITEMS = [
  { key: 'hallway', href: '/flow-fm/', label: 'Hallway' },
  { key: 'portal', href: '/flow-fm/portal/', label: 'Moon Portal' },
  { key: 'moons', href: '/flow-fm/moons/', label: '13 Moons Path' },
  { key: 'womb-work', href: '/flow-fm/womb-work/', label: 'Womb Work Modules' },
  { key: 'assignments', href: '/flow-fm/assignments/', label: 'Business Assignments' },
  { key: 'profile-studio', href: '/flow-fm/profile-studio/', label: 'Profile Studio' },
  { key: 'planning-room', href: '/flow-fm/planning-room/', label: 'Planning Room' },
  { key: 'review', href: '/flow-fm/review/', label: 'Review Desk' },
];

export function renderTopNav(currentKey){
  return NAV_ITEMS.map(item => `<a class="nav-pill ${item.key === currentKey ? 'active' : ''}" href="${item.href}">${escapeHtml(item.label)}</a>`).join('');
}

export function renderAccessState(profile){
  if(!profile){
    return {
      title: 'Preview mode',
      copy: 'Sign in through the Flowtel doorway to save drafts, send assignments to be witnessed, and personalize your initiation path.',
      mode: 'preview',
    };
  }
  if(canTendOwnAssignments(profile)){
    return {
      title: 'Member mode',
      copy: 'Your Flow FM rooms are open. The Moon Portal is the main path, and the library rooms remain open for exploration.',
      mode: 'live',
    };
  }
  return {
    title: 'Read-only mode',
    copy: 'This profile is signed in, but Flow FM access signals are not being recognized yet. The hallway stays visible while save/submit actions remain closed.',
    mode: 'readonly',
  };
}

export function renderAccessCard(profile){
  const state = renderAccessState(profile);
  const diagnostics = profile ? `
    <div class="access-diagnostics-grid">
      <article><small>Role</small><strong>${escapeHtml(profile.role || '—')}</strong></article>
      <article><small>Membership</small><strong>${escapeHtml(profile.membership_type || '—')}</strong></article>
      <article><small>Level</small><strong>${escapeHtml(profile.practitioner_level || '—')}</strong></article>
      <article><small>Flow FM Start</small><strong>${escapeHtml(profile.flowfm_started_at ? formatDate(profile.flowfm_started_at) : '—')}</strong></article>
    </div>
  ` : '';
  return `
    <article class="access-card access-${escapeHtml(state.mode)}">
      <p class="eyebrow">ACCESS STATE</p>
      <h3>${escapeHtml(state.title)}</h3>
      <p>${escapeHtml(state.copy)}</p>
      ${diagnostics}
    </article>
  `;
}
