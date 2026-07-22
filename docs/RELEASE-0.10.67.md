# Flowtel v0.10.67 — Combined Flowtel + Caddie Magic Experience Update

Release date: 2026-07-21

## Summary

This coordinated release combines the newest Flowtel and Caddie Magic update batch into one deployable project. It adds a private Flow FM availability room, brings seasonal workshop inputs into the existing Hourly Flow Rate plan, turns the mentor Cycle Data view into a practical guest chart, repairs the Flow Map timestamp mismatch, opens owner-to-Priestess private file delivery, polishes Guest House and Concierge surfaces, and ships Caddie Magic v0.4.6 layout and score-calculation repairs.

The release patches the existing combined project in place. It does not recreate Flowtel, reset passwords, downgrade memberships, rewrite stays, or alter historical Caddie Magic records.

## Flow FM Lounge workshop planning

The private **Four Seasons Flowtel Workshop** now includes four independently saved seasonal planning cards beneath the Lounge video. Each card belongs to the member’s existing Hourly Flow Rate plan and restores on return.

A member can record:

- city;
- state, province, or region;
- country;
- a lodging idea;
- a private seasonal note.

The cards preserve the one future seasonal cycle created by Hourly Flow Rate. They do not create a competing planning record or alter the fixed 480-hour and 2x receiving formula.

## Four-week Availability Map

New private Flow FM route:

`/flow-fm/availability/`

The room presents one 28-day calendar as four seven-day availability rows. Each day shows:

- cycle day;
- actual calendar date;
- Moon day and Moon phase;
- the planet traditionally associated with that weekday;
- an **Open to clients** choice;
- an optional private note.

Each day saves independently and restores on return. The availability rows are a planning layer only; they do not change the actual Inner Season calculation used by stays, the Medicine Wheel, Flow Map, or mentor data.

## Guest House polish

- The full account-explanation banner has been removed from account creation.
- The invitation now reads: **“Your replay will be shared here soon. When you feel called to enter the Flowtel experience, your Queendom is waiting.”**
- Replay requests begin collapsed.
- Only one request opens at a time.
- A selected or actively uploading replay remains protected and expanded.
- A CSS specificity repair ensures the `hidden` state actually removes a closed request body instead of allowing the grid rule to keep it visible.
- Existing 28-day replay expiration, receipts, accounts, legacy room keys, resumable uploads, and private Storage remain intact.

## Guest Suite Concierge Card

**Request Turndown Service** and **Request a Wake Up Text / Wake Up Text Requested** now use matching widths on desktop and mobile while preserving their distinct colors and existing behavior.

## Mentor Client Snapshot / Guest Chart

When a mentor or approved owner opens a connected client from Concierge, the Cycle Data route now becomes a quick-read **Client Snapshot**.

The private chart includes:

- canonical `display_name`;
- private email for mentor/owner verification;
- authenticated-account and Queendom match status;
- current calculated cycle day;
- current Inner Season and last check-in;
- four smaller, clickable Inner Season quadrants;
- check-in and practitioner clock-in counts by season.

Available filters:

- Current Moon;
- Last Moon;
- Inner Season;
- Yearly Season;
- All Time.

Yearly seasons remain:

- Winter — November through January;
- Spring — February through April;
- Summer — May through July;
- Autumn — August through October.

Client access still requires the existing mentor relationship and consent boundary. Admin/owner visibility remains private. Legal names are not substituted for canonical Priestess identity.

## Flow Map repair

Migration 052 replaces the latest Flow Map RPC with explicit output aliases for reflection timestamps. This removes the visible database error:

`column note_entries.reflection_created_at does not exist`

The repair uses the existing reflection, stay, checkout, and workshop-note timestamps. It does not rewrite historical notes or create duplicate Flow Map entries.

## Direct private file delivery to the Priestess Inbox

The owner Concierge can now choose an eligible Flow FM or Council Priestess and send a private file directly into her existing **Priestess Inbox**.

Supported categories include:

- documents and PDFs;
- images;
- audio and video;
- spreadsheets and presentations;
- ZIP files.

Files remain in the existing private `flowtel-priestess-mailbox` bucket, use the recipient’s private Storage path, and appear in her existing Profile Studio mailbox. Large files use resumable 6 MB chunks. A selected file, recipient, subject, and note remain held while the owner moves between windows or waits to send, and Concierge background refreshes cannot erase an active delivery. The release preserves practitioner-to-owner audio handoffs and owner-returned edited audio.

The private Inbox remains limited to Flow FM/Council practitioners. This is not a public file-sharing surface or a Team Map attachment system.

## Owner 28-Day Team Map geometry

The owner map now uses the approved quadrant geometry:

- top left — Inner Autumn;
- top right — Inner Summer;
- bottom left — Inner Winter;
- bottom right — Inner Spring.

Portraits, client relationships, cycle days, check-in dates, and owner-only privacy remain unchanged.

## Caddie Magic v0.4.6

The integrated Caddie Magic release includes:

- corrected Score Map and Locker Room quadrant geometry;
- simplified Player Profile summary;
- simplified top action pill;
- revised Swing Thoughts prompt;
- one next-relevant major Moon card;
- accurate score-only average and best calculations.

See `docs/RELEASE-CADDIE-MAGIC-0.4.6.md` for the full Caddie-specific scope.

## Migration instructions

Confirm migrations 046 through 051 have already been installed, then run once:

`database/migration-052-combined-flowtel-caddie-updates.sql`

Migration 052:

- repairs the latest `flowtel_get_flow_map_entries` RPC;
- adds the Lounge workshop `lodging_idea` field and save RPC;
- creates the private Flow FM Availability Map table, RLS, and RPCs;
- creates mentor client-snapshot and clock-in RPCs;
- broadens the existing private Priestess Mailbox file types without making the bucket public;
- creates owner recipient-list and direct-file-delivery RPCs.

**Migration 037 remains retired and must never be rerun.**

## Preservation guarantees

This release does not change:

- one stay per Flowtel Day;
- append-only stays, reflections, notes, Flow Map history, or Honors entries;
- Flowtel Time (`America/Los_Angeles`);
- personal passwords or remembered sessions;
- canonical `display_name` identity or legal-name privacy;
- owner-only Concierge access and all-wing Turndown routing;
- unread Concierge-note continuity;
- member/public/owner Team Map privacy boundaries;
- membership preservation;
- mentor relationship and consent logic;
- Powder Room anonymity and master sharing;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day logic;
- Moonbox beta hold;
- Guest House account and replay privacy;
- Lounge video private Storage;
- Flowtel Honors 77/23 append-only calculations;
- Caddie Magic Player-Only Access, invitation codes, or product boundaries.

## First test checklist

1. Run migration 052 once after migration 051.
2. Deploy the complete v0.10.67 project.
3. Open Concierge → Guest House and confirm every request is collapsed initially.
4. Open two requests and confirm only the latest selected request remains open.
5. Select a replay file and confirm its request remains open and protected.
6. Open the owner 28-Day Team Map and confirm Autumn/Summer/Winter/Spring occupy the approved quadrants.
7. Open the Flow FM Lounge and save all four seasonal workshop cards.
8. Refresh and confirm the seasonal cards restore inside the same Hourly Flow Rate plan.
9. Open `/flow-fm/availability/`, save several days, refresh, and confirm all 28 days and notes restore.
10. Open a connected mentor client and verify identity/account status, current cycle state, four clickable quadrants, and every range filter.
11. Open Flow Map and confirm no raw `reflection_created_at` database error appears.
12. In Concierge → Priestess Inbox, choose a small PDF or image, wait through a background-refresh interval, and confirm the selected file remains held.
13. Send it to a test Flow FM Priestess, sign in as that Priestess, and confirm the private file appears and downloads from Profile Studio.
14. Confirm Guest House-only, Queendom-only, and Caddie Player-Only accounts cannot access Flow FM private rooms or Priestess files.
15. Complete the Caddie Magic v0.4.6 checklist.
