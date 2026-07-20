// Flowtel rollout switches.
// The wider 13-Moon curriculum remains sealed during the current beta, while
// the approved Hourly Flow Rate MVP is available to recognized Flow FM/Council
// members and owner/admin accounts.

import { normalizeMembership, rankForMembership } from './membership.js';

export const FLOWTEL_ROLLOUT = Object.freeze({
  enablePlanningRoomForGuests: false,
  enableFullFlowFmCurriculum: false,
  enableHourlyFlowRateMvp: true,
});

function normalized(value){
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function effectiveFlowFmRank(profile = {}){
  const membership = normalizeMembership(
    profile.membership_type || profile.membership || profile.membershipType
  );
  const explicitRank = Number(profile.membership_rank || profile.membershipRank || 0);
  const role = normalized(profile.role);
  const level = normalized(profile.practitioner_level || profile.practitionerLevel);
  const trustedSignal = [
    'practitioner', 'mentor', 'concierge', 'manager', 'admin', 'owner',
  ].includes(role)
    || ['initiate', 'moonpriestess', 'priestess', 'practitioner'].includes(level)
    || Boolean(profile.flowfm_started_at || profile.flow_fm_started_at || profile.is_initiated);

  return Math.max(explicitRank, rankForMembership(membership), trustedSignal ? 2 : 0);
}

export function canAccessFlowFmCurriculum(profile = {}){
  return FLOWTEL_ROLLOUT.enableFullFlowFmCurriculum && effectiveFlowFmRank(profile) >= 2;
}

export function canAccessHourlyFlowRate(profile = {}){
  return FLOWTEL_ROLLOUT.enableHourlyFlowRateMvp && effectiveFlowFmRank(profile) >= 2;
}
