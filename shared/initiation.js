// shared/initiation.js
// Flow FM 13 Moon initiation map.
// Source: FLOW FM Onboarding Guide pages 7–12.

export const FLOW_FM_MOONS = [
  { index: 1, month: "NOV", name: "Temple Moon", wing: "West Wing", season: "Winter", theme: "Shadow work, feminine arts, reflection, and radical self-honesty." },
  { index: 2, month: "DEC", name: "Serpent Moon", wing: "West Wing", season: "Winter", theme: "Death portals, shedding skin, release, rebirth, and the void." },
  { index: 3, month: "JAN", name: "Rose Moon", wing: "West Wing", season: "Winter", theme: "Womb-awareness, sacred spiral, inner union, and cyclical living." },
  { index: 4, month: "FEB", name: "Honey Moon", wing: "South Wing", season: "Spring", theme: "Softness, pleasure, receptivity, and feminine magnetism." },
  { index: 5, month: "MAR", name: "Naked Moon", wing: "South Wing", season: "Spring", theme: "Truth, voice, vulnerability, and authentic expression." },
  { index: 6, month: "APR", name: "Creatrix Moon", wing: "South Wing", season: "Spring", theme: "Manifestation, creation, and visionary leadership." },
  { index: 7, month: "MAY", name: "Mother Moon", wing: "East Wing", season: "Summer", theme: "Nourishment, nurturing, and sacred responsibility." },
  { index: 8, month: "JUN", name: "Money Moon", wing: "East Wing", season: "Summer", theme: "Material wealth, overflow, prosperity, and divine inheritance." },
  { index: 9, month: "JUL", name: "Dragon Moon", wing: "East Wing", season: "Summer", theme: "Courage, visibility, and embodied power." },
  { index: 10, month: "AUG", name: "Wild Woman Moon", wing: "North Wing", season: "Autumn", theme: "Primal feminine power and liberation." },
  { index: 11, month: "SEP", name: "Lover Moon", wing: "North Wing", season: "Autumn", theme: "Devotion, polarity, divine union, and sacred relationships." },
  { index: 12, month: "OCT", name: "Blood Moon", wing: "North Wing", season: "Autumn", theme: "Intuition, ceremony, ritual, and psychic gifts." },
  { index: 13, month: "13TH", name: "Ouroboros Moon", wing: "13th Wing", season: "Final Initiation", theme: "The ending and the beginning, integration, evolution, and higher-self embodiment." },
];


export const FLOW_FM_ASSIGNMENTS = [
  { index: 1, title: "Create your Priestess Profile + About Me", type: "Profile Foundation", description: "Gather the words, photo, modalities, and offering language that will become your public Priestess Profile." },
  { index: 2, title: "Record Womb Wealth Affirmation Audio", type: "Audio Medicine", description: "Create a short audio transmission your future clients can return to for womb wealth, receptivity, and overflow." },
  { index: 3, title: "Create Your Offerings", type: "Offer Architecture", description: "Name and shape the first offerings that your Queendom can actually book, buy, or receive." },
  { index: 4, title: "Design Business Cards + Flyers", type: "Visibility Asset", description: "Create simple, beautiful print assets that make your medicine easy to share in the physical world." },
  { index: 5, title: "Record How to Track Your Cycle Video", type: "Teaching Asset", description: "Teach the first doorway into the Flowtel: how to begin tracking your cycle with softness and accuracy." },
  { index: 6, title: "Record a Podcast", type: "Voice + Transmission", description: "Practice using your voice as a portal by recording a podcast episode that expresses your medicine." },
  { index: 7, title: "Meet 1:1 with 4 New Clients", type: "Client Practice", description: "Begin holding real women through the work while practicing clear boundaries and client care." },
  { index: 8, title: "Record Weekly Moon Phase Empowerments", type: "Moon Content", description: "Create recurring moon-phase support your Queendom can receive inside the rhythm of the month." },
  { index: 9, title: "Meet 1:1 with a Client for 4 Weeks", type: "Continuity Practice", description: "Practice holding one client through a longer arc so you can see pattern, rhythm, and transformation over time." },
  { index: 10, title: "Hold Ceremony in Person", type: "Embodied Leadership", description: "Host a simple in-person ceremony and practice tending the room from your body, not your performance." },
  { index: 11, title: "Hold Ceremony Online", type: "Digital Temple", description: "Translate your room-holding skills into an online experience women can safely enter from anywhere." },
  { index: 12, title: "Record 4 Inner Seasons Video", type: "Framework Teaching", description: "Create a teaching for Winter, Spring, Summer, and Autumn so clients can orient inside the Flowtel framework." },
  { index: 13, title: "Host a Live Masterclass + Launch", type: "Queendom Launch", description: "Open the Golden Gates: invite women into your Queendom and begin your next cycle of leadership." },
];

export const FLOW_FM_ARCS = [
  { label: "Big Vision", range: "Months 1–3", moons: [1,2,3], copy: "Collect cycle data, study your inner seasons, and cultivate the vision that will become your medicine business." },
  { label: "Practice", range: "Months 4–6", moons: [4,5,6], copy: "Plan with your cycle, set energetic boundaries, and meet the unseen support that helps you hold others." },
  { label: "Get Visible", range: "Months 7–9", moons: [7,8,9], copy: "Expand your presence, embody your priestess identity, and magnetize the resources your work requires." },
  { label: "Launch", range: "Months 10–12", moons: [10,11,12], copy: "Unlock your creative genius, create your offerings, and launch the vision into the world." },
  { label: "Celebrate", range: "Month 13", moons: [13], copy: "Open the Golden Gates to your Queendom and step into the next spiral of leadership." },
];

export function getFlowFmAssignmentForMoon(moonIndex){
  return FLOW_FM_ASSIGNMENTS.find(item => Number(item.index) === Number(moonIndex)) || null;
}

export function getFlowFmArcForMoon(moonIndex){
  return FLOW_FM_ARCS.find(arc => arc.moons.includes(Number(moonIndex))) || FLOW_FM_ARCS[0];
}

function monthDiff(start, now) {
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

export function getFlowFmInitiationStatus(profile = {}, nowDate = new Date()) {
  const started = profile.flowfm_started_at || profile.flow_fm_started_at || profile.initiation_started_at || profile.created_at;
  const startedAt = started ? new Date(started) : null;

  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return {
      hasStartDate: false,
      moonIndex: null,
      moon: null,
      level: profile?.practitioner_level || "Initiate",
      isInitiated: !!profile?.is_initiated,
      label: "Initiate",
      line: "Initiation moon not set yet.",
    };
  }

  const elapsed = Math.max(0, monthDiff(startedAt, nowDate));
  const moonIndex = Math.min(13, elapsed + 1);
  const moon = FLOW_FM_MOONS[moonIndex - 1];
  const isInitiated = elapsed >= 13 || !!profile?.is_initiated;
  const level = isInitiated ? "Moon Priestess" : "Initiate";

  const monthLine = isInitiated
    ? "Initiated Moon Priestess"
    : `Month ${moonIndex} of 13`;

  return {
    hasStartDate: true,
    startedAt,
    elapsedMoons: elapsed,
    moonIndex,
    moon,
    level,
    isInitiated,
    monthLine,
    label: `${level} · ${moon.name}`,
    line: `${level} · ${moon.name} · ${monthLine}`,
  };
}

export function monthNameToMoon(monthNameOrIndex) {
  if (typeof monthNameOrIndex === "number") {
    const month = monthNameOrIndex;
    const labels = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const label = labels[month] || "";
    return FLOW_FM_MOONS.find(item => item.month === label) || null;
  }

  const value = String(monthNameOrIndex || "").slice(0,3).toUpperCase();
  return FLOW_FM_MOONS.find(item => item.month === value) || null;
}
