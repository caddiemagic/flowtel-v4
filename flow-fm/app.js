import { getCurrentProfile, getFlowFmInitiationStatus } from '/shared/flowtel.js';
import { renderTopNav, renderAccessCard, renderAccessState, escapeHtml, setMessage } from '/flow-fm/ui.js';

const topNav = document.getElementById('topNav');
const heroCopy = document.getElementById('heroCopy');
const currentMoonTitle = document.getElementById('currentMoonTitle');
const currentMoonMeta = document.getElementById('currentMoonMeta');
const thresholdTitle = document.getElementById('thresholdTitle');
const thresholdCopy = document.getElementById('thresholdCopy');
const accessState = document.getElementById('accessState');
const doorGrid = document.getElementById('doorGrid');
const message = document.getElementById('message');

const DOORS = [
  { href: '/flow-fm/moons/', eyebrow: '13 MOONS PATH', title: 'See the initiation map', copy: 'Follow the named moon path, arcs, and threshold logic that determines where a practitioner enters the spiral.' },
  { href: '/flow-fm/womb-work/', eyebrow: 'WOMB WORK MODULES', title: 'Open the inner curriculum', copy: 'The 13 inner teachings live here and will hold future Squarespace-hosted video lessons.' },
  { href: '/flow-fm/assignments/', eyebrow: 'BUSINESS ASSIGNMENTS', title: 'Tend the outer build track', copy: 'Save drafts, submit work to be witnessed, and build the practical bones of the Flow Factory.' },
  { href: '/flow-fm/profile-studio/', eyebrow: 'PROFILE STUDIO', title: 'Shape Assignment 1', copy: 'Create the Priestess Profile, preview it, and send it into the review flow.' },
  { href: '/flow-fm/planning-room/', eyebrow: 'PLANNING ROOM', title: 'Use the moon calendars', copy: 'Print the current moon calendar, learn the phase key, and plan business in a way that steadies the nervous system.' },
  { href: '/flow-fm/review/', eyebrow: 'REVIEW DESK', title: 'Witness submitted work', copy: 'Mentors and admins can keep review queues out of the student hallway and tend assignments in one room.' },
];

function renderDoors(){
  doorGrid.innerHTML = DOORS.map(item => `
    <a class="door-card" href="${item.href}">
      <p class="eyebrow">${escapeHtml(item.eyebrow)}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.copy)}</p>
      <span class="door-link">Open door</span>
    </a>
  `).join('');
}

function renderStatus(profile){
  const status = getFlowFmInitiationStatus(profile || {});
  currentMoonTitle.textContent = status.hasStartDate ? status.moon.name : 'Temple Moon preview';
  currentMoonMeta.textContent = status.monthLine;
  thresholdTitle.textContent = status.anchorMoon ? `Entered through ${status.anchorMoon.name}` : 'Moon timing matters.';
  thresholdCopy.textContent = status.hasStartDate
    ? `${status.anchorExplanation} The working threshold day is ${status.thresholdDay}.`
    : 'When a practitioner joins before the full moon threshold, she begins with the current named moon. After the threshold, Flow FM prepares her for the next named moon.';
}

async function init(){
  topNav.innerHTML = renderTopNav('hallway');
  renderDoors();
  try{
    const profile = await getCurrentProfile();
    renderStatus(profile);
    accessState.innerHTML = renderAccessCard(profile);
    const state = renderAccessState(profile);
    heroCopy.textContent = profile
      ? 'A calmer hallway of doors for the 13 Moons path, womb work curriculum, business assignments, planning tools, and review spaces.'
      : 'Preview the Flow FM hallway, then sign in to open your assignments, profile studio, and initiation timeline.';
    setMessage(message, state.mode === 'readonly' ? 'Flow FM access signals are not fully recognized yet. The hallway remains visible while you verify profile data.' : '');
  }catch(error){
    console.error(error);
    renderStatus(null);
    accessState.innerHTML = renderAccessCard(null);
    setMessage(message, 'The hallway is visible, but your profile could not be loaded just now.');
  }
}

init();
