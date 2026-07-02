// shared/moon.js

const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14));

export function getMoonMagic(date = new Date()) {
  let age = ((date - KNOWN_NEW_MOON) / 86400000) % SYNODIC_MONTH;

  if (age < 0) age += SYNODIC_MONTH;

  const moonDay = Math.floor(age) + 1;

  if (moonDay >= 27 || moonDay <= 5) {
    return {
      moonDay,
      phase: "New Moon Phase",
      innerSeason: "Inner Winter",
      emoji: "🌑",
      theme: "Rest and dream your new big vision.",
    };
  }

  if (moonDay <= 11) {
    return {
      moonDay,
      phase: "Half Full Moon Phase",
      innerSeason: "Inner Spring",
      emoji: "🌓",
      theme: "Create and scheme.",
    };
  }

  if (moonDay <= 19) {
    return {
      moonDay,
      phase: "Full Moon Phase",
      innerSeason: "Inner Summer",
      emoji: "🌕",
      theme: "Witness your magic and be seen.",
    };
  }

  return {
    moonDay,
    phase: "Half New Moon Phase",
    innerSeason: "Inner Autumn",
    emoji: "🌗",
    theme: "Audit, revise, and prepare for the next cycle.",
  };
}
