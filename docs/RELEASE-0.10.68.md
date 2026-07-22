# Flowtel v0.10.68 — Caddie Network Reintegration + Shared Scheduling Foundation

Release date: 2026-07-22

Coordinated Caddie release: **Caddie Magic v0.5.1**

## Summary

This release patches the v0.10.67 combined source in place and deliberately reconciles the preserved Caddie Magic v0.5.0 Network foundation with every approved v0.4.6 layout, Moon-data, mobile, quadrant, and valid-score repair.

It restores the functional Caddie Network, Caddie Desk, Find a Caddie directory, and Cardinal Club Rooms without rolling Flowtel back to the earlier Caddie commit. It also establishes the shared scheduling database framework that Flowtel Practitioners and Caddie Magic Caddies can later use with separate product experiences and permissions.

No Flowtel guest-profile or membership-directory work is included here. Those owner/member foundations remain reserved for the proposed v0.10.69 release.

## Permanent role boundary

### The Caddie Master

The Caddie Master is the owner/admin role. Caddie Master services remain active and owner-controlled:

- Player Assignments;
- VIP two-way Messages;
- Caddie Master Notes produced through Scorecard Reviews;
- owner Player access, Caddie invitations, course approvals, and Caddie Profile approvals.

### Caddies

Caddies are Players first and members of the golf-course Concierge Team. Their additional service capability opens the Caddie Desk. A Caddie may manage:

- a professional Caddie Profile;
- approved and pending courses served;
- Player requests;
- recurring Calls/Caddying availability;
- date/date-range blocks;
- consultations;
- consent-scoped, read-only Player preparation.

A Caddie cannot create Assignments, enter Caddie Master conversations, leave Caddie Master Notes, edit Player data, access the owner Concierge Desk, or inherit Flowtel access.

## Player Profile

The Player Profile card family is restored to:

- Assignments;
- Caddie Compass;
- Caddie Network;
- Calendar;
- Locker Room Sharing.

The Caddie service doorway is separate and lifecycle-aware:

- Invited / Draft / Submitted — **Complete Your Caddie Profile**;
- Approved / Active — **Enter the Caddie Desk**;
- Paused / Declined — status only, with Player identity and history preserved.

The user-facing version pill has been removed.

## Scorecard Review credits

Every 28 Caddie Magic round-log entries earns one Scorecard Review credit. A qualifying entry may contain a score, a swing thought, or both, and several historical entries may be added on the same date.

- one open request is allowed at a time;
- one credit is consumed when the Player submits the request;
- a cancelled or declined request restores the credit;
- a completed review permanently consumes the credit;
- progress and available credits are shown in the Player Profile;
- completed feedback remains a private Caddie Master Note.

## VIP Caddie Master Messages

VIP messaging now appears inside the existing Caddie Master Notes/Scorecard Review area rather than as another Player Profile section.

- access is granted manually by the owner;
- access remains active until the owner revokes it;
- Player and owner messages are labeled **You** and **The Caddie Master**;
- the database RPC enforces the VIP gate;
- paired Caddies cannot enter the conversation.

## Caddie Compass and Cardinal Club Rooms

The four direction cards are functional links again:

- North — Last Quarter Phase — Moon Days 20–26;
- East — Full Moon Phase — Moon Days 12–19;
- South — First Quarter Phase — Moon Days 6–11;
- West — New Moon Phase — Moon Days 27–5.

Legacy Assignment and Message panels are removed from the Compass itself. Assignments remain an owner-controlled Caddie Master service on the Player Profile.

The release preserves the v0.4.6 Score Map/Locker Room geometry, valid-score-only calculations, future-date protection, Moon event-versus-phase language, and mobile controls.

## Caddie Profile and course catalog

The active Caddie Profile is simplified to:

- Professional Display Name;
- Professional Title;
- City;
- Timezone;
- Courses Served.

Retired fields remain in historical database columns but are no longer changed by the interface.

The controlled course catalog begins with:

- Pebble Beach Golf Links;
- Spyglass Hill Golf Course;
- The Links at Spanish Bay;
- Cypress Point Club;
- Monterey Peninsula Country Club.

Caddies can select several approved courses or request another course. A request appears privately as **Pending Verification**. It is not included in Player discovery until the Caddie Master approves it.

## Shared scheduling foundation

Migration 053 adds one shared backend framework for future Flowtel Practitioner and Caddie Magic Caddie scheduling while keeping product access, relationships, records, and UI separate.

The Caddie Desk uses a simple seven-day recurring template:

- Morning — 9:00, 10:00, 11:00;
- Afternoon — 1:00, 2:00, 3:00;
- Evening — 5:00, 6:00, 7:00;
- each daypart may be available for Calls, Caddying, both, or neither;
- one-date and date-range blocks override the recurring template;
- call slots are materialized eight weeks ahead in the Caddie’s timezone;
- the first service type is **Caddie Consultation — 45 minutes**.

Existing exact slots and consultations remain preserved. Cancellation refreshes template-generated availability so only still-eligible future call times reopen.

### Acuity and Zoom status

The database includes future Acuity calendar, appointment-type, appointment, and Zoom-host mapping fields. External Acuity/Zoom booking is **not activated in this release**. No Acuity credentials are required for migration 053 or deployment.

## Owner Caddie Network operations

The owner Concierge Desk now includes a Caddie Network view for:

- inviting an existing Player as a Caddie;
- reviewing and changing Caddie Profile status;
- approving or declining course requests;
- granting or revoking VIP Caddie Master Messages;
- completing Scorecard Reviews with a Caddie Master Note;
- cancelling or declining a review and restoring its credit.

The owner Desk remains restricted by the existing owner/Concierge boundary.

## Tracker correction

`tracker/index.html` no longer contains duplicate static `cycleSnapshotCard` or `trackerDayDetail` IDs. The two mutually exclusive result templates now use shared classes, preserving styling, day-detail behavior, and printable snapshots.

## Migration instructions

The live fingerprint supplied for this release confirms that the unique tables/functions from **both historical migration 052 files are already present**.

Do not rerun or rename:

- `database/migration-052-caddie-magic-caddie-network-foundation.sql`
- `database/migration-052-combined-flowtel-caddie-updates.sql`

Run exactly once:

`database/migration-053-caddie-network-reintegration-shared-scheduling.sql`

Migration 053 is additive. It preserves existing Caddie Profiles, requests, exact availability slots, consultations, Player logs, Assignments, Messages, Notes, and review history.

**Migration 037 remains retired and must never be rerun.**

## Preservation guarantees

This release does not change:

- Flowtel Time (`America/Los_Angeles`);
- one stay per Flowtel Day;
- append-only stays, notes, Flow Map, Honors, or history;
- personal passwords and remembered sessions;
- canonical `display_name` and legal-name privacy;
- owner-only Concierge access for `mm.johnson@icloud.com`;
- owner all-wing Turndown routing and unread-note continuity;
- membership rank preservation;
- Team Map audience boundaries;
- mentor relationships and consent;
- Powder Room anonymity;
- Medicine Wheel geometry;
- actual-versus-recorded cycle logic;
- Moonbox beta hold;
- private Priestess Mailbox, Lounge video, Guest House files, or replay-note consent;
- Hourly Flow Rate fixed 480-hour/2x formula;
- Caddie Magic Player-Only access, invitation codes, historical records, or anonymous Locker Room boundary.

## First test checklist

1. Confirm the two historical migration 052 fingerprints remain present; do not rerun either file.
2. Run migration 053 once.
3. Deploy the complete v0.10.68 project.
4. Sign in as an ordinary Player and confirm the four Player Profile cards, Locker Room Sharing, and no Caddie Desk doorway.
5. Confirm valid-score average/best still ignore thought-only entries and future round dates remain blocked.
6. Open the Compass and confirm all four direction cards open the correct Cardinal Club Room.
7. Confirm Upcoming Golf displays styled Moon rows and a Caddie Magic Remove button.
8. As owner, invite an existing Player as a Caddie.
9. As that Player, confirm **Complete Your Caddie Profile** appears while Player history remains intact.
10. Save a draft, select several approved courses, request another course, and submit the profile.
11. As owner, approve the pending course and Caddie Profile, then activate the Caddie.
12. Confirm the active Caddie appears in Find a Caddie only after **Accepting Player Requests** is enabled.
13. Save all seven days of Calls/Caddying availability and add/remove a date block.
14. Send a Player request and confirm detailed call availability remains hidden before acceptance.
15. Accept the request, book a 45-minute consultation, and confirm consented preparation is read-only.
16. Grant VIP Messages to a Player; confirm the thread labels are **You** and **The Caddie Master**; revoke access and confirm the composer locks.
17. Add 28 Player entries, submit one Scorecard Review, and confirm no second request can remain pending.
18. Cancel or decline the request and confirm the credit restores; complete a later request and confirm the credit remains consumed.
19. Confirm a Caddie cannot access the owner Concierge Desk, Caddie Master Messages, Assignments creation, or Player edit actions.
20. Confirm Flowtel-only and Player-only accounts remain isolated from the wrong product.
