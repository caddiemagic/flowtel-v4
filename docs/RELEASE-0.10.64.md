# Flowtel v0.10.64 — Five Experience Updates

Release date: 2026-07-20

## Summary

This combined release delivers five approved experience updates across Flowtel and the integrated Caddie Magic portal:

1. Queendom workshop replay notes that return to a member's private Flowtel history.
2. A Flow FM video transmission area in the Flowtel Lounge.
3. A quieter Guest House owner queue with neutral statuses and a 28-day replay lifecycle.
4. A lighter Guest House Queendom invitation card.
5. More legible Upcoming Golf calendar typography inside Caddie Magic.

## 1. Living workshop replay notes

The new `/replay-notes/` embedded room allows an eligible Queendom, Flow FM, or Council member to save a **Question**, **Note**, **Download**, **Reflection**, or **Track This in Cycle Data** entry while watching a replay.

Every note preserves:

- the member's canonical Flowtel identity;
- the workshop key and title;
- Flowtel Time date;
- the current Flowtel Day actual and recorded cycle-day context, when the member has checked in;
- Inner Season and Feels Like season where available;
- current Moon day, phase, Inner Season, and theme;
- the member's private note body and note type.

The note ledger is append-only for browser roles. A member sees only her own replay notes. The owner can review notes in the new **Workshop Replay Notes** Concierge view, and consent-aware practitioners can encounter those notes through the established Flow Map subject boundary rather than through a separate client-data bypass.

## 2. Flow FM Lounge video

The Flowtel Lounge now contains a Flow FM-only **Four Seasons Flowtel Workshop** video card. It references:

`/assets/Four-Seasons-Flowtel-Workshop.mp4`

The replay-notes room is embedded directly beneath the video so watching and reflection remain connected. The same private room can be embedded beneath a Queendom workshop replay in Squarespace using a URL shaped like:

`https://app.theflowtel.com/replay-notes/?workshop=workshop-key&title=Workshop%20Title&embed=1`

The member must already have a remembered Flowtel session, and the route keeps the established Flowtel product-access boundary.

### Media packaging note

The uploaded v0.10.63 source ZIP did not contain the named MP4, and no separate conversation or Library video attachment was available during packaging. The route, player, membership gate, error fallback, and exact asset path are complete, but the actual MP4 is not inside this release archive. Place the original file at:

`flowtel-v4/assets/Four-Seasons-Flowtel-Workshop.mp4`

before deployment to make the Lounge player available.

## 3. Guest House replay polish and expiration

The owner Guest House queue now rests collapsed by default. Opening one request closes the prior request, except when an upload, selected file, or unfinished finalization must remain protected.

Owner status language is neutral:

- **Concierge is locating the recording**
- **Replay Room is ready**
- **Concierge couldn't find the replay**

Each newly uploaded replay receives an expiration exactly 28 days after upload. Existing active files receive a one-time expiration backfill based on their original upload date.

Guest-facing replay rooms show the number of days remaining. At expiration:

- authenticated and legacy rooms stop signing or serving the replay immediately;
- the guest is told that the replay completed its 28-day Guest House stay;
- the next owner Concierge visit removes the expired object from the private Storage bucket;
- the preserved database record is marked deleted rather than erased;
- failed Storage cleanup is retained for a later retry.

View and download receipts record first/last timestamps and counts for owner awareness.

## 4. Guest House invitation cleanup

The large headline **The Guest House is a threshold. The Queendom is the world beyond it.** has been removed.

The release preserves:

- **AN INVITATION BEYOND THE GUEST HOUSE**;
- the body copy explaining that receiving a replay does not require joining;
- the **JOIN THE QUEENDOM** button.

## 5. Caddie Magic Upcoming Golf legibility

Upcoming Golf calendar and event surfaces now use a clean practical sans-serif stack for dates, tournaments, phases, places, notes, and Moon forecasts. The dark navy and gold Caddie Magic world remains intact.

This is a scoped typography polish to the integrated Caddie Magic v0.4.5 source. It does not change Player-Only Access, invitations, product permissions, Compass records, upcoming-golf data, migrations, or phase-language rules.

## Migration instructions

Confirm migrations 046 through 049 are installed, then run once:

`database/migration-050-five-experience-updates.sql`

Migration 050:

- creates the append-only private workshop replay-note ledger and member/owner RPCs;
- extends the latest consent-aware Flow Map RPC with workshop replay notes;
- adds the 28-day Guest House expiration and deletion lifecycle;
- adds view/download receipt fields;
- updates Guest House file registration and owner queue RPCs;
- adds owner-only expired-file cleanup RPCs.

**Do not rerun migration 037.**

## Main files changed

- `api/guest-house-access.js`
- `api/guest-house-portal.js`
- `caddie-magic/compass/index.html`
- `caddie-magic/compass/styles.css`
- `caddie-magic/compass/admin/index.html`
- `caddie-magic/compass/admin/styles.css`
- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `database/migration-050-five-experience-updates.sql`
- `guest-house/index.html`
- `guest-house/app.js`
- `guest-house/styles.css`
- `guest-house/replay/page.js`
- `guest-house/replay/styles.css`
- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`
- `replay-notes/index.html`
- `replay-notes/app.js`
- `replay-notes/styles.css`
- `shared/guest-house-core.js`
- `shared/guest-house.js`
- `shared/replay-notes-core.js`
- `shared/replay-notes.js`
- `vercel.json`

## Preservation guarantees

This release does not reset passwords or remembered sessions; does not rerun migration 037; does not alter one-stay-per-Flowtel-Day behavior, append-only stay or Concierge history, canonical Flowtel Time, canonical `display_name`, legal-name privacy, owner-only Concierge access, owner all-wing Turndown routing, unread Concierge continuity, Team Map boundaries, membership preservation, mentor consent, Powder Room anonymity, Medicine Wheel geometry, actual-versus-recorded cycle-day rules, Moonbox beta hold, Hourly Flow Rate records, Flowtel Honors, Priestess Mailbox records, or Caddie Magic product-access boundaries.

## First test

1. Confirm migrations 046–049 are installed.
2. Run migration 050 once.
3. Place `Four-Seasons-Flowtel-Workshop.mp4` in `flowtel-v4/assets/` before deployment.
4. Deploy the complete v0.10.64 project.
5. After placing the MP4 at the documented asset path, sign in as a Flow FM member, enter the Lounge, and confirm the Four Seasons video appears.
6. Save each replay-note type and confirm the note returns after refresh with cycle and Moon context.
7. Open owner Concierge → Workshop Replay Notes and confirm the member's canonical display name and note appear.
8. Confirm a Guest House-only or Player-Only account cannot open the replay-notes room.
9. Open owner Concierge → Guest House and confirm every request begins collapsed and only one opens at a time.
10. Confirm the three owner statuses contain no word **her**.
11. Upload a small Guest House replay and confirm its expiration is 28 days after upload.
12. Open the guest portal and confirm the remaining-days notice appears.
13. Test stream and download actions and confirm the owner queue shows receipt counts.
14. Use a controlled expired test row, revisit Concierge, and confirm private Storage cleanup and the preserved deleted record.
15. Confirm the Guest House invitation card keeps its eyebrow, body, and Queendom button without the large headline.
16. Open Caddie Magic Upcoming Golf on desktop and mobile and confirm dates, phases, tournaments, and events are easier to scan.
