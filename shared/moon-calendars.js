// shared/moon-calendars.js
// Practical moon-calendar planning assets for Flow FM.

export const MOON_PHASE_KEY = [
  { key: 'new', label: 'New Moon Phase', copy: 'Turn inward, listen, simplify, and let the next cycle speak first.' },
  { key: 'half_full', label: 'Half Full Moon Phase', copy: 'Begin moving, building, and taking practical action with what is ready.' },
  { key: 'full', label: 'Full Moon Phase', copy: 'Visibility, celebration, witnessing, and honest reflection on what is ripening.' },
  { key: 'half_new', label: 'Half New Moon Phase', copy: 'Refine, review, release, and prepare the body for the next opening.' },
];

export const MOON_CALENDARS = [
  {
    slug: 'spring-equinox-moon-2026',
    title: 'Spring Equinox Moon 2026',
    rangeLabel: 'Mar / Apr 2026',
    portalOpens: 'Apr 4, 2026',
    portalCloses: 'Apr 14, 2026',
    summary: 'A lunar-month planning sheet that moves from New Moon through Full Moon and back to New Moon, with portal markers and planetary weekdays.',
    assetPath: '../assets/planning/month-view-calendar-mar-jun-2026.pdf',
    featured: true,
  },
  {
    slug: 'spring-waning-moon-2026',
    title: 'Spring Waning Moon 2026',
    rangeLabel: 'Apr / May 2026',
    portalOpens: 'May 5, 2026',
    portalCloses: 'May 15, 2026',
    summary: 'A printable planning month for tending the descent, reflection, and preparation between visible pushes.',
    assetPath: '../assets/planning/month-view-calendar-mar-jun-2026.pdf',
    featured: false,
  },
  {
    slug: 'summer-waxing-moon-2026',
    title: 'Summer Waxing Moon 2026',
    rangeLabel: 'May / Jun 2026',
    portalOpens: 'Jun 6, 2026',
    portalCloses: 'Jun 15, 2026',
    summary: 'A simple moon-to-moon business planner with phase shifts, portal windows, and daily space to stay in flow.',
    assetPath: '../assets/planning/month-view-calendar-may-jun-2026.pdf',
    featured: false,
  },
];

export const WEEKLY_PLANNING_PROMPTS = [
  'What feels simple, practical, and genuinely supportive this week?',
  'Where is my body asking for more space, softness, or containment?',
  'What one business action belongs to this phase of the moon?',
  'What wants to open, and what wants to close, before I move forward?',
];
