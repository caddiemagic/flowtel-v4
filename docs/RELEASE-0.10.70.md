# Flowtel v0.10.70 — Caddie Master Command Center

Release date: 2026-07-22

Coordinated Caddie release: **Caddie Magic v0.5.2**

## Summary

This release reorganizes the owner Caddie Magic administration around three clear responsibilities:

- **Caddie Network** for Player access, invitations, Caddie lifecycle, profiles, courses, and network operations;
- **The Caddie Master** for unread private support and work requiring owner attention; and
- **Caddie Concierge Team** for a people-centered team directory and dedicated owner-only Caddie profiles.

It also adds Upcoming Golf acknowledgment through **The Caddie Force**, aligns Score Map controls with the Locker Room, and opens a separate private Caddie Team message chamber without exposing VIP Player conversations.

## Caddie Master Command Center

The new owner card summarizes:

- unread VIP Player messages;
- unread private Caddie Team messages;
- completed Assignments awaiting owner attention;
- pending course-verification requests; and
- submitted Caddie Profiles.

Unread Player and Caddie Team rows include the latest sender, latest timestamp, unread count, and a direct link to the appropriate private thread. Scorecard Review requests remain in their existing dedicated owner room.

## Caddie Network consolidation

The separate Caddie Players card has been removed. Its private-beta invitations, Player access, Caddie pathway invitation, and VIP messaging controls now live inside Caddie Network alongside:

- pending course verification;
- submitted professional profiles;
- active Caddies; and
- invited, draft, approved, paused, or declined Caddie records.

No Player identity, score history, invitation, or access record is deleted or replaced.

## Caddie Concierge Team

The owner directory defaults to **Active** and supports lifecycle and golf-course filters. Each card shows:

- Caddie name and professional title;
- approved courses;
- location and timezone;
- Calls/Caddying availability state;
- active Player count;
- upcoming consultation count;
- unread private team-message count;
- Caddie Profile status; and
- Compass status: Incomplete, Complete, or Consecrated.

Each Caddie opens a dedicated owner-only full-page profile with courses, Compass, availability, calendar blocks, Player requests, consultations, Assignments, private Caddie Team messages, and owner-granted Compass Consecration.

Consecration is never automatic. All four Cardinal Clubs must be complete, and The Caddie Master grants or removes Consecrated status.

## Private Caddie Team messages

Active Caddies receive a private message chamber inside the Caddie Desk. This thread is separate from VIP Player ↔ Caddie Master messages and never exposes Player conversations.

Caddies remain unable to create Assignments, enter VIP Player threads, leave Scorecard Review notes, edit Player records, or access the owner Concierge Desk.

## Upcoming Golf acknowledgment

New or materially edited upcoming rounds, tournaments, and trips remain in the owner alert count until acknowledged.

The owner action is **Send the Caddie Force**. After acknowledgment, the Player sees:

> **The Caddie Force is with you.**

Acknowledgment records who and when. Material edits reset acknowledgment. Past events leave the active alert count while remaining historical.

## Score Map controls

Current Moon, Last Moon, All, Thoughts + Scores, Scores Only, Locker Room, and Back to Player Profile now use the Locker Room control system consistently on desktop and mobile.

## Validation maintenance

This release also repairs a stale v0.10.69.2 validator reference to the retired standalone `shared/member-directory.js` module. The live Member Directory remains embedded inside the Concierge application; this is validation-only maintenance and does not change member data or access behavior.

## Migration

Run exactly once:

```text
database/migration-055-caddie-master-command-center.sql
```

Migration 055 is additive. It preserves all Players, Caddies, Compasses, Assignments, VIP messages, Scorecard Reviews, Upcoming Golf, courses, consultations, access, and history.

Do not rerun:

- migration 054;
- migration 053;
- either historical migration 052 file; or
- retired migration 037.

## First test checklist

1. Run migration 055 exactly once, then deploy the release.
2. Open the owner Concierge Desk and confirm Caddie Players is gone.
3. Open Caddie Network and create/copy a Player invitation.
4. Pause and restore a Player-only account without affecting Flowtel access.
5. Grant and revoke VIP Player messaging.
6. Open The Caddie Master and confirm the five alert categories.
7. Send a VIP Player message and confirm unread count, sender, time, and thread link.
8. Open the Player thread and confirm its unread alert clears.
9. Complete a Player Assignment and confirm it appears until Mark Noted is selected.
10. Request a new course and submit a Caddie Profile; confirm both Network alerts.
11. Open Caddie Concierge Team and confirm Active is the default filter.
12. Filter by lifecycle status and golf course.
13. Open a dedicated Caddie profile and review profile, courses, availability, Players, and calls.
14. Confirm an incomplete Compass cannot be consecrated.
15. Complete all four Clubs, grant Consecrated status, and confirm the directory updates.
16. Send a Caddie Team message from the Caddie Desk and reply from the owner profile.
17. Confirm neither side can see a VIP Player conversation through the Caddie Team chamber.
18. Add Upcoming Golf and confirm the owner alert.
19. Select Send the Caddie Force and confirm the Player sees the acknowledgment.
20. Materially edit the event and confirm it requires acknowledgment again.
21. Compare Score Map and Locker Room controls on desktop and mobile.
22. Confirm ordinary Players, Caddies, and Flowtel practitioners cannot open the owner Caddie Team page.
