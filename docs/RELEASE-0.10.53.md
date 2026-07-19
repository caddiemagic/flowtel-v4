# Flowtel v0.10.53 — Unread Concierge Notes + Profile Button Polish

Release date: 2026-07-18

## Summary

This release lets an unread Concierge note follow its guest across Flowtel Days until she marks it received, while keeping the note permanently attached to the original stay where it was written. It also polishes the Lounge Priestess Profile button and standardizes Team Map profile-link copy.

## Unread Concierge-note continuity

The Suite now loads authenticated note-bearing stays belonging only to the signed-in guest and surfaces unread notes from earlier Flowtel Days.

Behavior:

- historical notes remain on their original `flowtel_stays` row;
- notes are never copied or moved into today’s stay;
- multiple unread notes appear oldest-first;
- each previous stay is labeled with its original stay date;
- current-day notes and carried historical notes can appear together;
- today’s available/pending Turndown state remains visible when a historical note is waiting;
- marking a note **Received** updates `concierge_notes_read_signature` and `concierge_notes_read_at` on the original stay;
- a successfully received note stops following the guest but remains preserved in Previous Visits/history;
- the existing local read-signature fallback remains available for the current browser if a network save fails.

The current note payload remains compatible with both legacy plain-text `witness_note` values and the current JSON note-array format.

## Authenticated database boundary

Migration 041 adds two authenticated, member-owned RPCs:

- `flowtel_get_my_unread_concierge_notes()` returns only the signed-in guest’s own unread note-bearing stays;
- `flowtel_mark_concierge_note_received(p_stay_id, p_signature)` updates read state only when the original stay belongs to `auth.uid()`.

Neither RPC rewrites `witness_note`, changes stay ownership, creates a stay, or exposes another guest’s data.

## Lounge Priestess Profile button

The Lounge **Open Profile View** link now:

- spans the full usable width of the Priestess Profile card;
- uses the existing full-width `.suite-button-link` treatment;
- no longer has the previous `max-width: 320px` constraint;
- remains responsive on desktop and mobile.

## Team Map profile copy

External-profile buttons now read:

**VIEW PROFILE**

This applies to:

- the signed-in member’s authenticated Team Map card;
- other members’ authenticated Team Map cards;
- the public-safe Queendom embedded Team Map.

The signed-in member still sees **Add My Profile Link** when her external profile URL is missing. Other missing-link cards continue to show the non-actionable “Profile link coming soon” message.

## Preserved systems

This release does not change:

- one stay per Flowtel Day;
- append-only stay history;
- Flowtel Time (`America/Los_Angeles`);
- personal passwords or remembered Supabase sessions;
- canonical `display_name` identity;
- owner-only Concierge access for `mm.johnson@icloud.com`;
- owner all-wing Turndown routing;
- Team Map membership eligibility or public-safe data fields;
- mentor relationship logic;
- Powder Room anonymity/master sharing;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day behavior.

Migration 037 remains retired and must not be rerun.

## Supabase migration

Run, in order:

1. Confirm `database/migration-040-priestess-identity-display-name-sync.sql` has already been applied.
2. Run `database/migration-041-unread-concierge-note-continuity.sql` once.
3. Deploy the v0.10.53 project.

Do **not** rerun migration 037.

## Files changed

- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `database/migration-041-unread-concierge-note-continuity.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.53.md`
- `flow-fm/team-map/embed/index.html`
- `flow-fm/team-map/embed/page.js`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `shared/flowtel.js`
- `shared/stays.js`

## Validation performed

- `node --check client/app.js`
- `node --check shared/stays.js`
- `node --check shared/flowtel.js`
- `node --check flow-fm/team-map/page.js`
- `node --check flow-fm/team-map/embed/page.js`
- changed HTML duplicate-ID validation
- changed CSS brace/structure validation
- patch-file list comparison
- patch-only and complete ZIP integrity tests

## First test

1. Confirm migration 040 is already installed, then run migration 041.
2. Use a guest who has an unread Concierge note on a prior Flowtel Day.
3. Check the guest into a new Flowtel Day and open her Suite.
4. Confirm the Suite says a note from a previous stay is waiting.
5. Confirm the original stay date, author, and note text are correct.
6. Mark the note **Received**.
7. Confirm the original stay row receives `concierge_notes_read_signature` and `concierge_notes_read_at`.
8. Reload the Suite and confirm the note no longer follows the guest.
9. Confirm the note remains on the original stay and still appears in historical stay data.
10. Repeat with at least two unread historical notes and confirm oldest-first order.
11. Test a historical unread note while today’s Turndown request is pending; confirm both states appear.
12. Test a historical unread note and a current-day Concierge note together.
13. Confirm current-day Turndown request and completion still work.
14. Open the Lounge and confirm **Open Profile View** spans the full Priestess Profile card width and matches the Clock Into the Flowtel pill.
15. Confirm authenticated self and other-member Team Map buttons say **VIEW PROFILE**.
16. Confirm the Queendom embedded Team Map button says **VIEW PROFILE**.
17. Confirm **Add My Profile Link** still appears for the signed-in member with no external URL.
18. Confirm the public embed still exposes no email, UUID, cycle day, legal name, reflections, or stay history.
