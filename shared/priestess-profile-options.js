// shared/priestess-profile-options.js
// Gentle, selection-based Priestess Profile Studio options.
// The first profile is a doorway, not a final identity.

export const PRIESTESS_TITLE_OPTIONS = [
  { value: 'rose-priestess', label: 'Rose Priestess' },
  { value: 'moon-priestess', label: 'Moon Priestess' },
  { value: 'womb-priestess', label: 'Womb Priestess' },
  { value: 'medicine-woman', label: 'Medicine Woman' },
];

export const PRIESTESS_BIO_TEMPLATES = [
  {
    value: 'rose-priestess-heart-opening',
    titleValue: 'rose-priestess',
    label: 'Rose Priestess · Heart Opening',
    copy: `As a Rose Priestess, I guide women through the path of the rose—a journey of opening the heart, deepening self-love, and embodying the sacred feminine. My work invites women to cultivate a life rooted in beauty, devotion, pleasure, and authentic expression. Through ceremony, embodiment practices, and heart-centered healing, I help women remember that they are worthy of receiving the love, abundance, and support they desire. My intention is to create spaces where women can soften into their truth, reconnect with their hearts, and bloom into the fullest expression of who they came here to be.`,
  },
  {
    value: 'rose-priestess-beauty-devotion',
    titleValue: 'rose-priestess',
    label: 'Rose Priestess · Beauty + Devotion',
    copy: `As a Rose Priestess, I hold spaces where women can return to their hearts, their softness, and the beauty of their own becoming. My work blends devotion, embodiment, ceremony, and feminine wisdom to help women remember their worth, open their capacity to receive, and live from a place of love, pleasure, and truth.`,
  },
  {
    value: 'moon-priestess-cyclical-rhythm',
    titleValue: 'moon-priestess',
    label: 'Moon Priestess · Cyclical Rhythm',
    copy: `As a Moon Priestess, I guide women back into rhythm with the moon, their bodies, and the quiet wisdom of their inner seasons. My work supports women in honoring their energy, listening to their intuition, and creating a life that moves with natural timing instead of constant pressure. Through moon work, reflection, and cyclical practices, I help women feel more connected, steady, and sovereign in their own flow.`,
  },
  {
    value: 'moon-priestess-intuition',
    titleValue: 'moon-priestess',
    label: 'Moon Priestess · Intuition + Timing',
    copy: `As a Moon Priestess, I help women work with lunar timing, intuition, and cyclical awareness so they can stop forcing and start flowing. My spaces are designed to help women hear themselves more clearly, honor the season they are in, and trust the timing of their becoming.`,
  },
  {
    value: 'womb-priestess-creative-power',
    titleValue: 'womb-priestess',
    label: 'Womb Priestess · Creative Power',
    copy: `As a Womb Priestess, I support women in reconnecting with the wisdom, creativity, and power that lives within their bodies. My work invites women to listen to their womb, honor their cycles, release what no longer belongs, and create from a place of rooted inner authority. Through womb work, embodiment, and feminine practice, I help women remember that their body is not a burden—it is a compass.`,
  },
  {
    value: 'womb-priestess-cycle-tracking',
    titleValue: 'womb-priestess',
    label: 'Womb Priestess · Cycle Wisdom',
    copy: `As a Womb Priestess, I guide women into deeper relationship with their cycles, their womb wisdom, and the creative intelligence of the body. My work helps women understand their inner seasons, make decisions with more self-trust, and build lives that honor their energy instead of overriding it.`,
  },
  {
    value: 'medicine-woman-ceremony',
    titleValue: 'medicine-woman',
    label: 'Medicine Woman · Ceremony + Healing',
    copy: `As a Medicine Woman, I create grounded, intuitive spaces for women to reconnect with their bodies, their truth, and the medicine they already carry. My work may weave ceremony, embodiment, breath, ritual, reflection, and feminine wisdom to support women through transformation, remembrance, and deeper self-trust.`,
  },
  {
    value: 'medicine-woman-embodiment',
    titleValue: 'medicine-woman',
    label: 'Medicine Woman · Embodiment + Remembrance',
    copy: `As a Medicine Woman, I walk with women as they remember their own inner medicine. I hold spaces for embodiment, emotional release, intuitive reflection, and sacred reconnection so women can feel more rooted in who they are and more resourced in how they move through the world.`,
  },
];

export const PRIESTESS_OFFERING_OPTIONS = [
  { value: 'one-to-one-mentorship', label: '1:1 Mentorship' },
  { value: 'womb-awakening-mentorship', label: 'Womb Awakening Mentorship' },
  { value: 'cycle-tracking-session', label: 'Cycle Tracking Session' },
  { value: 'moon-reading', label: 'Moon Reading' },
  { value: 'breathwork-journey', label: 'Breathwork Journey' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'inner-seasons-consultation', label: 'Inner Seasons Consultation' },
];

export const FLOWTEL_TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time — America/Los_Angeles' },
  { value: 'America/Denver', label: 'Mountain Time — America/Denver' },
  { value: 'America/Chicago', label: 'Central Time — America/Chicago' },
  { value: 'America/New_York', label: 'Eastern Time — America/New_York' },
  { value: 'America/Phoenix', label: 'Arizona — America/Phoenix' },
  { value: 'America/Anchorage', label: 'Alaska — America/Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii — Pacific/Honolulu' },
  { value: 'Europe/London', label: 'UK — Europe/London' },
  { value: 'Europe/Paris', label: 'Central Europe — Europe/Paris' },
  { value: 'Australia/Sydney', label: 'Sydney — Australia/Sydney' },
];

export function labelForPriestessTitle(valueOrLabel = '') {
  const value = String(valueOrLabel || '').trim();
  return PRIESTESS_TITLE_OPTIONS.find(item => item.value === value || item.label === value)?.label || value || 'Priestess';
}

export function bioTemplatesForTitle(titleValue = '') {
  return PRIESTESS_BIO_TEMPLATES.filter(item => !titleValue || item.titleValue === titleValue);
}

export function findBioTemplate(valueOrCopy = '') {
  const value = String(valueOrCopy || '').trim();
  return PRIESTESS_BIO_TEMPLATES.find(item => item.value === value || item.copy === value) || PRIESTESS_BIO_TEMPLATES[0];
}

export function offeringLabelsFromValues(values = []) {
  const list = Array.isArray(values) ? values : String(values || '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
  return list.map(value => PRIESTESS_OFFERING_OPTIONS.find(item => item.value === value || item.label === value)?.label || value).filter(Boolean);
}
