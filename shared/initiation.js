// shared/initiation.js
// Flow FM 13 Moon initiation map.
// Source: FLOW FM Onboarding Guide pages 7–12.

import { WOMB_WORK_MODULES, getWombWorkModule } from './womb-work.js';
import { calendarDateParts, dateOnlyToLocalNoon } from './flowtel-date.js?v=0.10.75';

export const FLOW_FM_MOONS = [
  { index: 1, month: 'NOV', name: 'Temple Moon', wing: 'West Wing', season: 'Winter', theme: 'Shadow work, feminine arts, reflection, and radical self-honesty.' },
  { index: 2, month: 'DEC', name: 'Serpent Moon', wing: 'West Wing', season: 'Winter', theme: 'Death portals, shedding skin, release, rebirth, and the void.' },
  { index: 3, month: 'JAN', name: 'Rose Moon', wing: 'West Wing', season: 'Winter', theme: 'Womb-awareness, sacred spiral, inner union, and cyclical living.' },
  { index: 4, month: 'FEB', name: 'Honey Moon', wing: 'South Wing', season: 'Spring', theme: 'Softness, pleasure, receptivity, and feminine magnetism.' },
  { index: 5, month: 'MAR', name: 'Naked Moon', wing: 'South Wing', season: 'Spring', theme: 'Truth, voice, vulnerability, and authentic expression.' },
  { index: 6, month: 'APR', name: 'Creatrix Moon', wing: 'South Wing', season: 'Spring', theme: 'Manifestation, creation, and visionary leadership.' },
  { index: 7, month: 'MAY', name: 'Mother Moon', wing: 'East Wing', season: 'Summer', theme: 'Nourishment, nurturing, and sacred responsibility.' },
  { index: 8, month: 'JUN', name: 'Money Moon', wing: 'East Wing', season: 'Summer', theme: 'Material wealth, overflow, prosperity, and divine inheritance.' },
  { index: 9, month: 'JUL', name: 'Dragon Moon', wing: 'East Wing', season: 'Summer', theme: 'Courage, visibility, and embodied power.' },
  { index: 10, month: 'AUG', name: 'Wild Woman Moon', wing: 'North Wing', season: 'Autumn', theme: 'Primal feminine power and liberation.' },
  { index: 11, month: 'SEP', name: 'Lover Moon', wing: 'North Wing', season: 'Autumn', theme: 'Devotion, polarity, divine union, and sacred relationships.' },
  { index: 12, month: 'OCT', name: 'Blood Moon', wing: 'North Wing', season: 'Autumn', theme: 'Intuition, ceremony, ritual, and psychic gifts.' },
  { index: 13, month: '13TH', name: 'Ouroboros Moon', wing: '13th Wing', season: 'Final Initiation', theme: 'The ending and the beginning, integration, evolution, and higher-self embodiment.' },
];

export const FLOW_FM_BUSY_WORK = [
  { index: 1, title: 'Your Queendom', type: 'Profile Foundation', description: 'Choose the first public doorway for your Priestess Profile so your Queendom can begin taking shape without overthinking the bio.' },
  { index: 2, title: 'Record Womb Wealth Affirmation Audio', type: 'Audio Medicine', description: 'Create a short audio transmission your future clients can return to for womb wealth, receptivity, and overflow.' },
  { index: 3, title: 'Create Your Offerings', type: 'Offer Architecture', description: 'Name and shape the first offerings that your Queendom can actually book, buy, or receive.' },
  { index: 4, title: 'Design Business Cards + Flyers', type: 'Visibility Asset', description: 'Create simple, beautiful print assets that make your medicine easy to share in the physical world.' },
  { index: 5, title: 'Record How to Track Your Cycle Video', type: 'Teaching Asset', description: 'Teach the first doorway into the Flowtel: how to begin tracking your cycle with softness and accuracy.' },
  { index: 6, title: 'Record a Podcast', type: 'Voice + Transmission', description: 'Practice using your voice as a portal by recording a podcast episode that expresses your medicine.' },
  { index: 7, title: 'Meet 1:1 with 4 New Clients', type: 'Client Practice', description: 'Begin holding real women through the work while practicing clear boundaries and client care.' },
  { index: 8, title: 'Record Weekly Moon Phase Empowerments', type: 'Moon Content', description: 'Create recurring moon-phase support your Queendom can receive inside the rhythm of the month.' },
  { index: 9, title: 'Meet 1:1 with a Client for 4 Weeks', type: 'Continuity Practice', description: 'Practice holding one client through a longer arc so you can see pattern, rhythm, and transformation over time.' },
  { index: 10, title: 'Hold Ceremony in Person', type: 'Embodied Leadership', description: 'Host a simple in-person ceremony and practice tending the room from your body, not your performance.' },
  { index: 11, title: 'Hold Ceremony Online', type: 'Digital Temple', description: 'Translate your room-holding skills into an online experience women can safely enter from anywhere.' },
  { index: 12, title: 'Record 4 Inner Seasons Video', type: 'Framework Teaching', description: 'Create a teaching for Winter, Spring, Summer, and Autumn so clients can orient inside the Flowtel framework.' },
  { index: 13, title: 'Host a Live Masterclass + Launch', type: 'Queendom Launch', description: 'Open the Golden Gates: invite women into your Queendom and begin your next cycle of leadership.' },
];

// Historical/database compatibility: existing RPCs and stored records retain the assignment name.
export const FLOW_FM_ASSIGNMENTS = FLOW_FM_BUSY_WORK;

export const FLOW_FM_ARCS = [
  { label: 'Big Vision', range: 'Months 1–3', moons: [1,2,3], copy: 'Collect cycle data, study your inner seasons, and cultivate the vision that will become your medicine business.' },
  { label: 'Practice', range: 'Months 4–6', moons: [4,5,6], copy: 'Plan with your cycle, set energetic boundaries, and meet the unseen support that helps you hold others.' },
  { label: 'Get Visible', range: 'Months 7–9', moons: [7,8,9], copy: 'Expand your presence, embody your priestess identity, and magnetize the resources your work requires.' },
  { label: 'Launch', range: 'Months 10–12', moons: [10,11,12], copy: 'Unlock your creative genius, create your offerings, and launch the vision into the world.' },
  { label: 'Celebrate', range: 'Month 13', moons: [13], copy: 'Open the Golden Gates to your Queendom and step into the next spiral of leadership.' },
];

const GREGORIAN_MONTH_TO_CANONICAL = { 0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 1, 11: 2 };
const DEFAULT_FULL_MOON_THRESHOLD_DAY = 15;

const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_2026_NEW_MOONS = {
  0: '2026-01-18',
  1: '2026-02-17',
  2: '2026-03-18',
  3: '2026-04-17',
  4: '2026-05-16',
  5: '2026-06-14',
  6: '2026-07-14',
  7: '2026-08-12',
  8: '2026-09-10',
  9: '2026-10-10',
  10: '2026-11-08',
  11: '2026-12-08',
};

function isoFromUTC(year, monthIndex, day){
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0,10);
}

function utcDateFromISO(iso){
  const [year, month, day] = String(iso).slice(0,10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDaysISO(iso, days){
  return new Date(utcDateFromISO(iso) + days * 86400000).toISOString().slice(0,10);
}

function approximateNewMoonForMonth(year, monthIndex){
  if(Number(year) === 2026 && KNOWN_2026_NEW_MOONS[monthIndex]) return KNOWN_2026_NEW_MOONS[monthIndex];
  const monthCenter = Date.UTC(year, monthIndex, 15);
  const anchor = utcDateFromISO('2026-06-14');
  const cycles = Math.round((monthCenter - anchor) / (SYNODIC_MONTH_DAYS * 86400000));
  return new Date(anchor + cycles * SYNODIC_MONTH_DAYS * 86400000).toISOString().slice(0,10);
}

function displayMoonDate(iso){
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function monthIndexForMoon(portal){
  if(portal?.isOuroboros && portal?.returnMoon) return monthIndexForMoon(portal.returnMoon);
  const value = String(portal?.month || '').slice(0,3).toUpperCase();
  const labels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return Math.max(0, labels.indexOf(value));
}

export function getMoonDatesForPortal(portal = {}, nowDate = new Date()){
  const status = portal.status || {};
  const startParts = status.startedDateParts
    || calendarDateParts(status.startedDateISO || status.startedAt || nowDate);
  const nowParts = calendarDateParts(nowDate);
  const offset = Math.max(0, Number(portal.portalIndex || 1) - 1);
  const absoluteMonth = ((startParts?.year || nowParts?.year || 2026) * 12)
    + ((startParts?.month || nowParts?.month || 1) - 1)
    + offset;
  const workingYear = Math.floor(absoluteMonth / 12);
  const monthIndex = monthIndexForMoon(portal);
  const year = portal.isOuroboros
    ? workingYear
    : (Number.isFinite(monthIndex) ? workingYear : (nowParts?.year || 2026));
  const newMoonISO = approximateNewMoonForMonth(year, monthIndex);
  const fullMoonISO = addDaysISO(newMoonISO, 14);
  return {
    newMoonISO,
    fullMoonISO,
    newMoonLabel: displayMoonDate(newMoonISO),
    fullMoonLabel: displayMoonDate(fullMoonISO),
  };
}


export function getFlowFmBusyWorkForMoon(moonIndex){
  return FLOW_FM_BUSY_WORK.find(item => Number(item.index) === Number(moonIndex)) || null;
}

// Compatibility alias used by existing RPC-facing modules.
export function getFlowFmAssignmentForMoon(moonIndex){
  return getFlowFmBusyWorkForMoon(moonIndex);
}

export function getFlowFmArcForMoon(moonIndex){
  return FLOW_FM_ARCS.find(arc => arc.moons.includes(Number(moonIndex))) || FLOW_FM_ARCS[0];
}

function monthDiff(start, now) {
  const startParts = calendarDateParts(start);
  const nowParts = calendarDateParts(now);
  if (!startParts || !nowParts) return 0;
  return (nowParts.year - startParts.year) * 12 + (nowParts.month - startParts.month);
}

export function getFlowFmAnchorFromDate(startDate = new Date()) {
  const parts = calendarDateParts(startDate);
  if (!parts) throw new Error('A valid Flow FM start date is required.');
  const baseIndex = GREGORIAN_MONTH_TO_CANONICAL[parts.month - 1] || 1;
  const useNextMoon = parts.day > DEFAULT_FULL_MOON_THRESHOLD_DAY;
  const anchorIndex = useNextMoon ? ((baseIndex % 12) + 1) : baseIndex;
  const anchorMoon = FLOW_FM_MOONS.find(item => item.index === anchorIndex) || FLOW_FM_MOONS[0];
  return {
    anchorIndex,
    anchorMoon,
    usedNextMoonRule: useNextMoon,
    thresholdDay: DEFAULT_FULL_MOON_THRESHOLD_DAY,
    explanation: useNextMoon
      ? `Joined after the working full-moon threshold, so initiation opens with the next named moon.`
      : `Joined before the working full-moon threshold, so initiation opens with the current named moon.`,
  };
}

export function getFlowFmMoonForProgress(anchorIndex = 1, monthNumber = 1) {
  const safeAnchor = Math.min(12, Math.max(1, Number(anchorIndex) || 1));
  const safeMonth = Math.max(1, Number(monthNumber) || 1);
  if (safeMonth >= 13) {
    return {
      ...FLOW_FM_MOONS[12],
      returnMoon: FLOW_FM_MOONS[safeAnchor - 1],
    };
  }
  const rotated = ((safeAnchor - 1 + (safeMonth - 1)) % 12) + 1;
  return FLOW_FM_MOONS.find(item => item.index === rotated) || FLOW_FM_MOONS[0];
}

export function getFlowFmInitiationStatus(profile = {}, nowDate = new Date()) {
  const started = profile.flowfm_started_at || profile.flow_fm_started_at || profile.initiation_started_at || null;
  const startedDateParts = started ? calendarDateParts(started) : null;
  const startedAt = startedDateParts
    ? (dateOnlyToLocalNoon(startedDateParts.iso) || new Date(started))
    : null;

  if (!startedDateParts || !startedAt || Number.isNaN(startedAt.getTime())) {
    return {
      hasStartDate: false,
      moonIndex: 1,
      moon: FLOW_FM_MOONS[0],
      anchorMoon: FLOW_FM_MOONS[0],
      anchorIndex: 1,
      level: profile?.practitioner_level || 'Initiate',
      isInitiated: !!profile?.is_initiated,
      label: 'Initiate',
      line: 'Initiation moon not set yet.',
      monthLine: 'Previewing Temple Moon until a Flow FM start date is set.',
      explanation: 'Set or confirm flowfm_started_at to personalize the initiation path.',
      progressMonth: 1,
    };
  }

  const elapsed = Math.max(0, monthDiff(startedDateParts.iso, nowDate));
  const anchor = getFlowFmAnchorFromDate(startedDateParts.iso);
  const progressMonth = Math.min(13, elapsed + 1);
  const moon = getFlowFmMoonForProgress(anchor.anchorIndex, progressMonth);
  const isInitiated = progressMonth >= 13 || !!profile?.is_initiated;
  const level = isInitiated ? 'Moon Priestess' : (profile?.practitioner_level || 'Initiate');
  const monthLine = progressMonth >= 13
    ? `Month 13 of 13 · returning through ${anchor.anchorMoon.name}`
    : `Month ${progressMonth} of 13 · started in ${anchor.anchorMoon.name}`;

  return {
    hasStartDate: true,
    startedAt,
    startedDateISO: startedDateParts.iso,
    startedDateParts,
    elapsedMoons: elapsed,
    moonIndex: moon.index,
    moon,
    anchorIndex: anchor.anchorIndex,
    anchorMoon: anchor.anchorMoon,
    anchorExplanation: anchor.explanation,
    level,
    isInitiated,
    monthLine,
    label: `${level} · ${moon.name}`,
    line: `${level} · ${moon.name} · ${monthLine}`,
    progressMonth,
    thresholdDay: anchor.thresholdDay,
    joinedAfterThreshold: anchor.usedNextMoonRule,
  };
}


export function flowFmProgressPercent(statusOrMonth = 1, hasStartDate = null) {
  const status = typeof statusOrMonth === 'object' && statusOrMonth !== null ? statusOrMonth : null;
  const present = hasStartDate === null ? (status ? Boolean(status.hasStartDate) : true) : Boolean(hasStartDate);
  if (!present) return 0;
  const month = Math.min(13, Math.max(1, Number(status ? status.progressMonth : statusOrMonth) || 1));
  return ((month - 1) / 12) * 100;
}


export function getPersonalizedMoonPath(profile = {}, nowDate = new Date()) {
  const status = getFlowFmInitiationStatus(profile, nowDate);
  const anchorIndex = Math.min(12, Math.max(1, Number(status.anchorIndex) || 1));
  const firstTwelve = Array.from({ length: 12 }, (_, offset) => {
    const canonicalIndex = ((anchorIndex - 1 + offset) % 12) + 1;
    const moon = FLOW_FM_MOONS.find(item => item.index === canonicalIndex) || FLOW_FM_MOONS[0];
    const portalIndex = offset + 1;
    return {
      ...moon,
      portalIndex,
      canonicalIndex,
      isOuroboros: false,
      returnMoon: null,
      wombWorkModule: getWombWorkModule(portalIndex),
      busyWork: FLOW_FM_BUSY_WORK.find(item => item.index === portalIndex) || null,
      businessAssignment: FLOW_FM_BUSY_WORK.find(item => item.index === portalIndex) || null,
      isCurrent: Number(status.progressMonth || 1) === portalIndex,
      status,
    };
  });
  const returnMoon = FLOW_FM_MOONS.find(item => item.index === anchorIndex) || FLOW_FM_MOONS[0];
  const ouroboros = {
    ...FLOW_FM_MOONS[12],
    portalIndex: 13,
    canonicalIndex: 13,
    isOuroboros: true,
    returnMoon,
    wombWorkModule: getWombWorkModule(13),
    busyWork: FLOW_FM_BUSY_WORK.find(item => item.index === 13) || null,
    businessAssignment: FLOW_FM_BUSY_WORK.find(item => item.index === 13) || null,
    isCurrent: Number(status.progressMonth || 1) >= 13,
    status,
  };
  return [...firstTwelve, ouroboros];
}

export function getPersonalizedMoonPortal(profile = {}, portalIndex = null, nowDate = new Date()) {
  const status = getFlowFmInitiationStatus(profile, nowDate);
  const requested = Number(portalIndex || status.progressMonth || 1);
  const safeIndex = Math.min(13, Math.max(1, Number.isFinite(requested) ? requested : 1));
  return getPersonalizedMoonPath(profile, nowDate).find(item => item.portalIndex === safeIndex) || getPersonalizedMoonPath(profile, nowDate)[0];
}

export function monthNameToMoon(monthNameOrIndex) {
  if (typeof monthNameOrIndex === 'number') {
    const month = monthNameOrIndex;
    const labels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const label = labels[month] || '';
    return FLOW_FM_MOONS.find(item => item.month === label) || null;
  }

  const value = String(monthNameOrIndex || '').slice(0,3).toUpperCase();
  return FLOW_FM_MOONS.find(item => item.month === value) || null;
}

export { WOMB_WORK_MODULES, getWombWorkModule };
