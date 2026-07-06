// shared/womb-work.js
// Flow FM inner curriculum modules sourced from the onboarding guide.

export const WOMB_WORK_MODULES = [
  { index: 1, arc: 'Big Vision', months: 'Months 1–3', title: 'Collect cycle data', description: 'Begin observing the body, the bleed, the moon, and the patterns that will become your source material.' },
  { index: 2, arc: 'Big Vision', months: 'Months 1–3', title: 'Study your inner seasons', description: 'Learn the four inner seasons and how your body, energy, and emotions move through them.' },
  { index: 3, arc: 'Big Vision', months: 'Months 1–3', title: 'Cultivate your BIG VISION', description: 'Name the larger life and business vision that wants to be carried by your womb wisdom.' },
  { index: 4, arc: 'Practice', months: 'Months 4–6', title: 'Plan with your cycle', description: 'Use your cycle and the moon as a planning rhythm so your work supports your nervous system.' },
  { index: 5, arc: 'Practice', months: 'Months 4–6', title: 'Set energetic boundaries', description: 'Create cleaner containers, clearer choices, and stronger boundaries around your life force.' },
  { index: 6, arc: 'Practice', months: 'Months 4–6', title: 'Meet your Angelic Army', description: 'Build a relationship with unseen support and the spiritual architecture around your work.' },
  { index: 7, arc: 'Get Visible', months: 'Months 7–9', title: 'Expand your presence to be seen', description: 'Stretch your visibility with softness, steadiness, and greater truth in your expression.' },
  { index: 8, arc: 'Get Visible', months: 'Months 7–9', title: 'Embody your priestess identity', description: 'Move from learning the work to becoming the woman who naturally holds it.' },
  { index: 9, arc: 'Get Visible', months: 'Months 7–9', title: 'Magnetize your resources', description: 'Tend the energetics, practical pathways, and receptivity required for support and overflow.' },
  { index: 10, arc: 'Launch', months: 'Months 10–12', title: 'Unlock your creative genius', description: 'Open the inner current that wants to create, teach, and lead in your own way.' },
  { index: 11, arc: 'Launch', months: 'Months 10–12', title: 'Create your offerings', description: 'Shape your medicine into living offers that can be received, held, and exchanged.' },
  { index: 12, arc: 'Launch', months: 'Months 10–12', title: 'Launch your BIG VISION', description: 'Bring the vision out of the subtle realms and into real expression, invitation, and service.' },
  { index: 13, arc: 'Celebrate', months: 'Month 13', title: 'Open the Golden Gates to your Queendom', description: 'Integrate what you have become and step into the next spiral of leadership.' },
];

export function getWombWorkModule(index) {
  return WOMB_WORK_MODULES.find(item => Number(item.index) === Number(index)) || null;
}
