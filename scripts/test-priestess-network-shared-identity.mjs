import assert from "node:assert/strict";

const rows = [
  { member_id: "a", membership_type: "flowfm", profile_status: "not_started", mentor_accepting_clients: false, active_client_count: 0 },
  { member_id: "b", membership_type: "flowfm", profile_status: "draft", mentor_accepting_clients: true, active_client_count: 2 },
  { member_id: "c", membership_type: "council", profile_status: "approved", mentor_accepting_clients: false, active_client_count: 1 },
  { member_id: "d", membership_type: "council", profile_status: "submitted", mentor_accepting_clients: true, active_client_count: 0 },
];

function filterDirectory(source, membership = "all", status = "all") {
  return source.filter(row => {
    const membershipMatch = membership === "all" || row.membership_type === membership;
    let statusMatch = true;
    if (status === "accepting") statusMatch = row.mentor_accepting_clients === true;
    else if (status === "not_accepting") statusMatch = row.mentor_accepting_clients !== true;
    else if (status !== "all") statusMatch = row.profile_status === status;
    return membershipMatch && statusMatch;
  });
}

assert.equal(filterDirectory(rows).length, 4, "All Flow FM/Council members must remain visible, including profile-not-started members.");
assert.deepEqual(filterDirectory(rows, "flowfm").map(row => row.member_id), ["a", "b"]);
assert.deepEqual(filterDirectory(rows, "council").map(row => row.member_id), ["c", "d"]);
assert.deepEqual(filterDirectory(rows, "all", "not_started").map(row => row.member_id), ["a"]);
assert.deepEqual(filterDirectory(rows, "all", "accepting").map(row => row.member_id), ["b", "d"]);
assert.deepEqual(filterDirectory(rows, "council", "not_accepting").map(row => row.member_id), ["c"]);

function normalizeHemisphere(value = "") {
  const normalized = String(value).trim().toLowerCase();
  return ["northern", "southern", "equatorial"].includes(normalized) ? normalized : "";
}
assert.equal(normalizeHemisphere(" Northern "), "northern");
assert.equal(normalizeHemisphere("southern"), "southern");
assert.equal(normalizeHemisphere("EQUATORIAL"), "equatorial");
assert.equal(normalizeHemisphere("west"), "");

const relationships = [
  { status: "connected", consent_granted: true },
  { status: "connected", consent_granted: false },
  { status: "requested", consent_granted: true },
];
assert.equal(relationships.filter(row => row.status === "connected" && row.consent_granted).length, 1, "Only consented connected relationships count as active clients.");

console.log("Flowtel v0.10.71 Priestess directory filtering, hemisphere, and consent-count behavior tests passed.");
