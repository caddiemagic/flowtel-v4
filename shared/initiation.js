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

  return {
    hasStartDate: true,
    startedAt,
    elapsedMoons: elapsed,
    moonIndex,
    moon,
    level,
    isInitiated,
    label: `${level} · ${moon.name}`,
    line: `${level} · Moon ${moonIndex}: ${moon.name}`,
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
