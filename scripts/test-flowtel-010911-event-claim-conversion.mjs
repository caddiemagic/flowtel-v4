import fs from 'node:fs';
import assert from 'node:assert/strict';

const calendar=fs.readFileSync('queendom-calendar/app.js','utf8');
const client=fs.readFileSync('client/app.js','utf8');
const bridge=fs.readFileSync('api/squarespace-bridge.js','utf8');

// Public visitor path: one preview CTA, two explicit doors, no client-side seat grant.
assert.match(calendar,/data-preview-claim-doorway/);
assert.match(calendar,/openClaimDoorway/);
assert.match(calendar,/NOT YET A MEMBER\? JOIN THE QUEENDOM|QUEENDOM_JOIN_URL/);
assert.doesNotMatch(calendar,/supabase\.from\([^)]*registration/i,'Calendar preview must not write registrations directly.');

// Member path: enrollment continues through the canonical authenticated API.
assert.match(calendar,/await setQueendomEventRegistration\(/);
assert.match(calendar,/event\.event_format==='recurring'/);
assert.match(calendar,/activeOccurrence\(event\)\?\.occurrence_id/);

// Exact occurrence survives login and automatic provisioning.
assert.match(client,/eventDoorwayOccurrenceId/);
assert.match(client,/verifySquarespaceMember\(email,"provision",\{eventId:eventDoorwayEventId,occurrenceId:eventDoorwayOccurrenceId\}\)/);
assert.match(client,/setQueendomEventRegistration\(eventDoorwayEventId,true,eventDoorwayOccurrenceId\|\|null\)/);
assert.match(bridge,/safeFlowtelUuid\(occurrenceId\)/);
assert.match(bridge,/membershipProvisioned/);
assert.match(bridge,/saveEvent/);
assert.match(bridge,/occurrence/);

// Queendom signup remains the same canonical destination.
assert.match(calendar,/https:\/\/www\.theidyllcollective\.com\/queendomhome/);

console.log('✓ Flowtel v0.10.91.1 Event Claim Conversion behavior checks passed.');
