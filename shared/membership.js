// shared/membership.js
// Flowtel membership doorway helpers.
// Existing Supabase profiles always win; URL doorway is only used for first-time creation
// or for safe upgrades (never downgrades).

export const MEMBERSHIP_RANK = {
  queendom: 1,
  flowfm: 2,
  council: 3,
};

export const MEMBERSHIP_ROLE = {
  queendom: "client",
  flowfm: "practitioner",
  council: "practitioner",
};

export const MEMBERSHIP_LABEL = {
  queendom: "Queendom",
  flowfm: "Flow FM",
  council: "Council",
};

export function normalizeMembership(value) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned === "queen" || cleaned === "queendom") return "queendom";
  if (cleaned === "flow" || cleaned === "flowfm" || cleaned === "flowfmmember") return "flowfm";
  if (cleaned === "council") return "council";
  return null;
}

export function membershipFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  return (
    normalizeMembership(params.get("membership")) ||
    normalizeMembership(params.get("source")) ||
    normalizeMembership(params.get("doorway")) ||
    null
  );
}

export function rankForMembership(type) {
  return MEMBERSHIP_RANK[normalizeMembership(type)] || 0;
}

export function roleForMembership(type) {
  return MEMBERSHIP_ROLE[normalizeMembership(type)] || "client";
}

export function labelForMembership(type) {
  return MEMBERSHIP_LABEL[normalizeMembership(type)] || "Flowtel";
}

export function resolveMembership(existingType, incomingType) {
  const existing = normalizeMembership(existingType);
  const incoming = normalizeMembership(incomingType);

  if (!existing) return incoming;
  if (!incoming) return existing;

  return rankForMembership(incoming) > rankForMembership(existing)
    ? incoming
    : existing;
}

export function roleFromResolvedMembership(resolvedMembership, existingRole) {
  const resolvedRole = roleForMembership(resolvedMembership);

  // Never downgrade an existing practitioner/admin/owner to client.
  if (["practitioner", "admin", "owner"].includes(existingRole) && resolvedRole === "client") {
    return existingRole;
  }

  if (["admin", "owner"].includes(existingRole)) return existingRole;

  return resolvedRole;
}
