// shared/moon-calendars.js
// Practical moon-calendar planning assets for Flow FM.

export const MOON_PHASE_KEY = [
  { key: 'new', label: 'New Moon Phase · Inner Winter', copy: 'Turn inward, listen, simplify, and let the next cycle speak first.' },
  { key: 'half_full', label: 'Half Full Moon Phase · Inner Spring', copy: 'Begin moving, building, and taking practical action with what is ready.' },
  { key: 'full', label: 'Full Moon Phase · Inner Summer', copy: 'Visibility, celebration, witnessing, and honest reflection on what is ripening.' },
  { key: 'half_new', label: 'Half New Moon Phase · Inner Autumn', copy: 'Refine, review, release, and prepare the body for the next opening.' },
];

export const MOON_CALENDARS = [
  {
    slug: 'summer-waning-moon-2026',
    title: 'Summer Waning Moon 2026',
    rangeLabel: 'Jul / Aug 2026',
    newMoon: 'Jul 14 and Aug 12, 2026',
    fullMoon: 'Jul 29, 2026',
    portalOpens: 'Lion’s Gate opens Jul 26; 8/8 portal opens Aug 8',
    portalCloses: 'Lion’s Gate closes Aug 12; 8/8 portal closes Aug 18',
    summary: 'The current moon-to-moon planning calendar, including the Lion’s Gate and 8/8 portal windows, Saint Mary Magdalene’s feast day, and the four lunar phases.',
    assetPath: '/flow-fm/assets/planning/summer-waning-moon-2026.pdf',
    pdfAvailable: true,
    featured: true,
  },
  {
    slug: 'spring-equinox-moon-2026',
    title: 'Spring Equinox Moon 2026',
    rangeLabel: 'Mar / Apr 2026',
    portalOpens: 'Apr 4, 2026',
    portalCloses: 'Apr 14, 2026',
    summary: 'A lunar-month planning sheet that moves from New Moon through Full Moon and back to New Moon, with portal markers and planetary weekdays.',
    assetPath: '/flow-fm/assets/planning/month-view-calendar-mar-jun-2026.pdf',
    pdfAvailable: true,
    featured: false,
  },
  {
    slug: 'spring-waning-moon-2026',
    title: 'Spring Waning Moon 2026',
    rangeLabel: 'Apr / May 2026',
    portalOpens: 'May 5, 2026',
    portalCloses: 'May 15, 2026',
    summary: 'A printable planning month for tending the descent, reflection, and preparation between visible pushes.',
    assetPath: '/flow-fm/assets/planning/month-view-calendar-mar-jun-2026.pdf',
    pdfAvailable: true,
    featured: false,
  },
  {
    slug: 'summer-waxing-moon-2026',
    title: 'Summer Waxing Moon 2026',
    rangeLabel: 'May / Jun 2026',
    portalOpens: 'Jun 6, 2026',
    portalCloses: 'Jun 15, 2026',
    summary: 'A simple moon-to-moon business planner with phase shifts, portal windows, and daily space to stay in flow.',
    assetPath: '/flow-fm/assets/planning/month-view-calendar-may-jun-2026.pdf',
    pdfAvailable: true,
    featured: false,
  },
];

export const WEEKLY_PLANNING_PROMPTS = [
  'What feels simple, practical, and genuinely supportive this week?',
  'Where is my body asking for more space, softness, or containment?',
  'What one business action belongs to this phase of the moon?',
  'What wants to open, and what wants to close, before I move forward?',
];
