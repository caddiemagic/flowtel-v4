// Flowtel Mentorship Concierge: proposal-only schedule generator.
// No Acuity calls. Store times as local wall-clock values until a server-side
// time zone / DST conversion and availability validation occurs.
const templates = Object.freeze({
  womb_activation: { activation: 180, recurring: 0, cadenceDays: null },
  sacred_self_study: { activation: 180, recurring: 6, recurringMinutes: 90, cadenceDays: 14 },
  kundalini_creatrix: { activation: 180, recurring: 18, recurringMinutes: 90, cadenceDays: 14 },
  four_sessions: { activation: 0, recurring: 0, flexible: 4, flexibleMinutes: 45 }
});
function plusDays(isoDate, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error("Use YYYY-MM-DD");
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== isoDate) throw new Error("Invalid date");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function previewSchedule({ offeringKey, activationDate, firstEmpowermentDate, localTime, timezone = "America/Los_Angeles" }) {
  const template = templates[offeringKey];
  if (!template) throw new Error("Unknown offering");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) throw new Error("Use HH:MM");
  const sessions = [];
  if (template.activation) {
    if (!activationDate) throw new Error("Activation date required");
    sessions.push({ number: 1, kind: "activation", date: plusDays(activationDate, 0),
      time: localTime, durationMinutes: template.activation, status: "proposed", timezone });
  }
  for (let i = 0; i < template.recurring; i++) {
    if (!firstEmpowermentDate) throw new Error("First empowerment date required");
    sessions.push({ number: i + 1 + (template.activation ? 1 : 0), kind: "empowerment",
      date: plusDays(firstEmpowermentDate, i * template.cadenceDays), time: localTime,
      durationMinutes: template.recurringMinutes, status: "proposed", timezone });
  }
  for (let i = 0; i < (template.flexible || 0); i++) {
    sessions.push({ number: i + 1, kind: "flexible", date: null, time: null,
      durationMinutes: template.flexibleMinutes, status: "unscheduled", timezone });
  }
  return sessions;
}
