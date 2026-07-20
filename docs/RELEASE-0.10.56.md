# Flowtel v0.10.56 — Admin Team Map + Flowtel Honors + Priestess Mailbox

Release date: 2026-07-19

## Summary

This release gives the Flowtel owner a longer view of the practitioner ecosystem, opens the first append-only Flowtel Honors tracking foundation, creates a private bi-directional Priestess Audio Mailbox, and completes the approved Profile Studio refinements.

The member-facing Team Map remains a view of who is present today. The new owner-only **28-Day Team Map** is a separate Concierge surface showing eligible Flow FM and Council team members who moved through the Flowtel during the last 28 Flowtel Days.

## Owner-only 28-Day Team Map

The Concierge Desk now includes **28-Day Team Map**.

It:

- uses Flowtel Time (`America/Los_Angeles`);
- includes eligible Flow FM/Council team members whose latest stay falls within the current Flowtel Day plus the preceding 27 Flowtel Days;
- shows each member’s profile photo, canonical `display_name`, calculated current cycle day, current calculated Inner Season, and last check-in date;
- distinguishes a member who is checked in today from a member whose latest stay was earlier in the 28-day window;
- opens an owner-only profile card when a portrait is selected;
- lists active connected clients from `flowtel_practitioner_relationships`;
- provides **View Data** access for each connected client through the established Cycle Data route;
- reserves an **Upcoming Calls** area with the explicit placeholder **Calendar connection coming soon.**

This does not alter the authenticated member Team Map or the public-safe Queendom embed. No new admin fields are exposed to members or public viewers.

## Flowtel Honors foundation

The Concierge Desk now includes **Flowtel Honors**, an owner-managed append-only contribution and redemption ledger.

### Automatic 77/23 calculation

For **Practitioner Revenue** and **Direct-Line Referral** entries:

- gross contribution is recorded;
- practitioner payout is calculated as 77%;
- Flowtel share is calculated as 23%;
- Flowtel Honors points awarded equal the Flowtel 23% share.

Example:

- gross: `$1,111.00`;
- practitioner payout: `$855.47`;
- Flowtel share: `$255.53`;
- Honors points: `255.53`.

### Manual ledger entries

The owner may also record:

- Honors bonuses;
- positive or negative adjustments;
- redemptions;
- a source transaction/reference;
- an optional direct-line source member;
- a reason or relationship note.

Redemptions cannot exceed the practitioner’s currently available balance. Existing ledger entries are never edited or deleted through the application; corrections are recorded as new adjustment entries.

The Concierge view shows:

- total available Honors;
- lifetime points awarded;
- points redeemed;
- gross contribution volume tracked;
- each Priestess balance;
- recent append-only ledger history.

This is an internal tracking foundation. It does not process payments, create a cash obligation, or automate tax treatment.

## Bi-directional Priestess Audio Mailbox

The Priestess Profile Studio now includes a private **Priestess Mailbox** for Flow FM/Council members.

A Priestess can:

- upload MP3, WAV, M4A, AAC, or OGG audio up to 250 MB;
- add a title and note for Megan;
- see the private handoff thread and its current status;
- receive an edited audio file back through the same thread;
- download the returned audio again later.

The owner can:

- see new audio handoffs in the Concierge Desk;
- download an original recording and mark it received;
- preserve the original file and thread history after receipt;
- upload edited audio, background-music versions, or polished exports back to the originating Priestess;
- see whether the returned file has been downloaded.

Files are stored in the private Supabase Storage bucket:

`flowtel-priestess-mailbox`

Object paths are scoped as:

`practitioner_uuid/thread_uuid/to-admin|to-practitioner/file`

The bucket is not public. Practitioner access is limited to her own path and mailbox records; the owner Concierge can access all mailbox threads. Database RPCs verify that uploaded Storage objects exist before opening or extending a thread.

Files are not automatically deleted after download. Receipt and download timestamps preserve the handoff history and protect against accidental loss.

## Profile Studio refinement

The Profile Studio hero is now more compact:

- removes the **PROFILE STUDIO** eyebrow/pill from the hero;
- reduces the size and vertical footprint of **YOUR PRIESTESS PROFILE**;
- uses the approved copy: **You can return and refine this profile as often as your medicine evolves.**

The live profile preview replaces raw IANA strings such as `AMERICA/LOS_ANGELES` with a dynamic, human-readable display:

- `Pacific Daylight Time`
- `Current time: 3:42 PM (PDT)`

The full timezone name and abbreviation update automatically for standard or daylight time, and the current local clock refreshes while the page is open.

## Database migration

Run:

`database/migration-046-admin-team-map-flowtel-honors-priestess-mailbox.sql`

Migration 046 adds:

- `flowtel_admin_get_28_day_team_map()`;
- `flowtel_honors_ledger`;
- owner-only Flowtel Honors list, dashboard, ledger, and record-entry RPCs;
- private Storage bucket `flowtel-priestess-mailbox`;
- `flowtel_priestess_mailbox_threads`;
- `flowtel_priestess_mailbox_files`;
- member and owner mailbox RPCs;
- private table and Storage policies.

Migration 046 does not reset passwords, rewrite stays, change the member/public Team Maps, or modify existing Caddie Magic data.

**Migration 037 remains retired and must never be rerun.**

## Preserved systems

This release preserves:

- one stay per Flowtel Day;
- append-only stay history;
- Flowtel Time (`America/Los_Angeles`);
- personal passwords and remembered sessions;
- `display_name` as the canonical visible identity;
- legal-name privacy outside approved owner/private surfaces;
- owner-only Concierge access for `mm.johnson@icloud.com`;
- owner all-wing Turndown routing;
- unread Concierge-note continuity;
- current-day Concierge and Turndown states;
- member-facing and public-safe Team Map boundaries;
- mentor relationship and client-consent logic;
- Powder Room anonymity and master sharing;
- Flow Map history;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day logic;
- Moonbox beta hold;
- all integrated Caddie Magic v0.4.2 files and migrations.

## Files changed

- `database/migration-046-admin-team-map-flowtel-honors-priestess-mailbox.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.56.md`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/styles.css`
- `manager/app.js`
- `manager/index.html`
- `manager/styles.css`
- `shared/flowtel-honors.js`
- `shared/priestess-mailbox.js`
- `shared/team-map.js`

## First test

1. Confirm the live database is current through the intended prior migrations, then run migration 046 once.
2. Do not rerun migration 037.
3. Deploy v0.10.56 and enter `/manager/` as `mm.johnson@icloud.com`.
4. Open **28-Day Team Map** and confirm only eligible team members with a stay in the last 28 Flowtel Days appear.
5. Confirm portraits show cycle day, today/last-seen state, and the calculated Inner Season.
6. Open a portrait and confirm last check-in, current clients, View Data controls, and the Upcoming Calls placeholder.
7. Confirm the ordinary authenticated Team Map still shows today’s presence only.
8. Open **Flowtel Honors**, select a Priestess, and enter `$1,111.00` as Practitioner Revenue.
9. Confirm the preview and saved ledger show `$855.47` payout, `$255.53` Flowtel share, and `255.53` Honors points.
10. Record a bonus, adjustment, direct-line entry, and valid redemption; confirm each creates a new ledger row.
11. Attempt a redemption larger than the available balance and confirm it is rejected.
12. Open `/flow-fm/profile-studio/` as a Flow FM/Council member.
13. Confirm the compact hero and approved copy appear.
14. Confirm the timezone preview uses two lines in the form `Pacific Daylight Time` and `Current time: 3:42 PM (PDT)`.
15. Upload a supported audio file and confirm it appears in the member’s private Mailbox thread.
16. Return to the owner Concierge, open **Priestess Mailbox**, download the original, and confirm it is marked received without being deleted.
17. Upload an edited version back to the same thread.
18. Return as the Priestess, download the edited audio, and confirm the thread reflects receipt while allowing another download.
19. Attempt an unsupported or oversized file and confirm it is rejected.
20. Confirm Suite, Lounge, Concierge notes, Turndown Service, Previous Visits, Flow Map, Powder Rooms, Team Map, Medicine Wheel, Profile Studio save/submit/photo actions, Moonbox beta hold, and Caddie Magic continue loading without errors.
