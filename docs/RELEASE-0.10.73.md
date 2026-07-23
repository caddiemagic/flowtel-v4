# Flowtel v0.10.73 — Flow FM Initiation Readiness

Release date: 2026-07-22

Caddie Magic remains **v0.5.2**. This release reorganizes owner Caddie Network administration but does not change Player, paired-Caddie, Compass, consultation, score, privacy, or historical-data behavior.

## Summary

This release prepares the Flow FM Initiation Hall for members by simplifying the first planning experiences, turning Availability into a reusable Inner Season client-call template, correcting the 13-month initiation marker at its source, and organizing the Concierge Desk by audience.

The focused first path is: choose the places, price the lodging, include current expenses, and leave unfinished lifestyle layers visibly sealed until they are ready.

## Flow FM hero and typography system

The Initiation Hall hero now displays the scarab image, uses a smaller editorial heading scale, removes the striped side treatment, and reduces competition between the heading, scarab, and wax seal.

`flow-fm/design-system.css` establishes shared hero, section, and card heading tokens for new Flow FM pages. The Initiation Hall, Hourly Flow Rate, and Client-Facing Calls pages use that shared default rather than introducing new oversized display rules.

## Simplified Hourly Flow Rate path

The active member journey is now:

1. **Choose a Location** — one free-text seasonal location;
2. **Lodging Cost** — the total seasonal lodging amount plus an optional listing link;
3. **Current Expenses** — one private monthly total, review date, confirmation, and optional note; and
4. **Lifestyle Layers** — visible so members understand what is coming, but sealed and non-interactive.

The former detailed lodging form is no longer shown. Property name, fees, research date, original currency, dates, and private lodging details remain preserved in historical database records and in any older saved entry. Existing extra lodging records continue counting in the calculation rather than being deleted.

All member-facing **Home Base** language is replaced with **Current Expenses**. Existing internal table and RPC names remain unchanged for backward compatibility.

The Hourly Flow Rate formula remains fixed at 480 annual hours and a 2× multiplier. Currency, snapshots, dates, historical costs, and all append-only calculations remain preserved.

## Client-facing call availability

The former dated 28-day map is replaced with four reusable weekly templates: Inner Winter, Inner Spring, Inner Summer, and Inner Autumn.

Each season contains Monday through Sunday. Every weekday begins **Offline**. A member may open a day and add one or more start/end windows for 1:1 client-facing calls in her saved profile timezone.

The interface contains no calendar date, cycle day, Moon day or phase, planetary label, or note field.

Migration 058 adds `flowtel_flow_fm_availability_windows` without deleting the historical `flowtel_flow_fm_availability_days` table. The refreshed load RPC returns both the new weekly windows and the legacy dated payload, so older cached pages remain safe while the new page writes only the new seasonal template.

This is a preference layer, not a live booking promise. Acuity, Zoom, real calendar conflicts, date blocks, reminders, and appointment synchronization remain deferred.

## Canonical Flow FM start date and progress

Flow FM initiation progress now uses only an explicit Flow FM start date. Account creation date is no longer used as a fallback.

- The member confirms **Flow FM Start Date** in My Profile.
- The owner may correct it in the dedicated Priestess Concierge Team profile.
- Becoming a practitioner does not reset the date.
- Changing practitioner status does not change the initiation month.
- A missing date produces **Flow FM start date needed** rather than a guessed initiation.

Both the Initiation Hall and Concierge Desk use the same shared marker formula:

```text
(progress month - 1) / 12
```

Therefore Month 1 is far-left, Month 7 is center, and Month 13 is far-right completion.

The Concierge identity line is simplified to **Level · Month X of 13 · Began in [Moon]** so the starting Moon is not repeated as though it were the progress index.

## Concierge Desk organization

The owner Desk is divided into three visible audiences:

- **Concierge Team Rooms** — Priestess-facing service rooms;
- **Owner Administration** — private Flowtel membership, team, files, and operational rooms; and
- **Caddie Magic Administration** — private Caddie Master rooms.

An owner-only **Preview Priestess View** hides the owner and Caddie sections so the owner can verify the team-facing layout. This is a presentation preview only; it does not impersonate another user or expose another Priestess’s client data.

Existing route, RPC, role, and RLS boundaries remain authoritative.

## Caddie Network administration

The owner Caddie Network room is reorganized into Overview, Players + Access, Caddies, and Courses.

The Courses area shows approved canonical courses and pending verification requests. Full course pages, richer timezone/location records, coordinates, location autocomplete, and plotted course maps remain intentionally deferred. The existing course catalog and course-request records are reused; no new Caddie migration is required for this organization.

## Migration

Run exactly once, before deploying the website files:

```text
database/migration-058-flow-fm-initiation-readiness.sql
```

Migration 058 adds member and owner RPCs for the canonical Flow FM start date and reusable Inner Season weekday time windows. It preserves the historical 28-day availability table and save function, returns the legacy dated Availability payload for older cached pages, and does not alter Auth passwords, sessions, stays, notes, cycle history, memberships, or Caddie Magic history.

Do not rerun migration 057, 056, 055, 054, 053, either historical migration 052 file, or retired migration 037.

## Intentionally deferred

- Acuity, provider calendars, individual Zoom hosts, reminders, or webhooks;
- date-specific practitioner calendar blocks;
- location autocomplete or automatic timezone/hemisphere lookup;
- plotted Priestess or golf-course maps;
- full golf-course profile pages;
- Caddie Magic Honors, payments, service tiers, or automated matching;
- the Beta Access Gate + Entry Audit; and
- the unfinished Lifestyle Layer editors.

## First test checklist

1. Run migration 058 exactly once, then deploy the release.
2. Confirm the Initiation Hall scarab, smaller heading, and stripe-free hero.
3. Confirm the Initiation Hall, Hourly Flow Rate, and Client-Facing Calls pages use the moderate shared hero scale on desktop and mobile.
4. Confirm each Hourly Flow Rate season shows only Location, Lodging Cost, and optional Listing Link.
5. Enter a seasonal lodging amount and optional link, save, refresh, and confirm both return.
6. Confirm Current Expenses replaces all member-facing Home Base language and still contributes annually to the rate.
7. Confirm Lifestyle Layers are visible, labeled Coming Soon, and cannot be opened or edited.
8. Confirm the 480-hour / 2× calculation remains unchanged.
9. Confirm Client-Facing Calls shows four Inner Seasons with Monday through Sunday.
10. Confirm every day defaults Offline and no dates, Moon fields, planets, or note inputs appear.
11. Open one day, add two time windows, save the season, refresh, and confirm both return in the member’s timezone.
12. Confirm My Profile requires Flow FM Start Date for Flow FM/Council/practitioner members.
13. Confirm the owner can correct the same date in a Priestess Team profile.
14. Confirm Dragon Moon as Month 1 places the marker at the far-left edge; Month 7 centers it; Month 13 reaches the far right.
15. Confirm changing or activating practitioner status does not reset the start date.
16. Confirm Preview Priestess View hides Owner and Caddie Magic administration and restores them when toggled off.
17. Open Caddie Network and verify Overview, Players + Access, Caddie lifecycle, approved courses, and pending course requests.
18. Confirm Caddie Magic v0.5.2 Player and Caddie behavior remains unchanged.
