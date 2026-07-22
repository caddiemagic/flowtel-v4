# Flowtel v0.10.72 — Four Seasons + Time and Space

Release date: 2026-07-22

Caddie Magic remains **v0.5.2**. This release does not change Player, Caddie, Caddie Master, Compass, Network, scheduling, score, or Caddie history behavior.

## Summary

This release completes the coordinated July 22 update sequence by simplifying the **Four Seasons Flowtel Workshop**, making its four destinations share one source of truth with **Hourly Flow Rate**, and opening the first private **Time + Space** view for the approved Priestess Concierge Team.

The release intentionally uses free-text locations. External location autocomplete and the plotted world map remain deferred until a provider is selected.

## Simplified Four Seasons workshop

The Lounge workshop now asks for only:

- Winter Location;
- Spring Location;
- Summer Location; and
- Autumn Location.

The former city, region, country, lodging idea, seasonal reflection, and per-season save controls are no longer displayed beneath this workshop video. Their existing database columns and any previously entered values remain preserved.

All four locations save together through one action.

The embedded Replay Notes form is hidden only from this Four Seasons workshop. The Replay Notes product, owner archive, append-only records, consent-aware Flow Map integration, and every other workshop use remain preserved.

## One seasonal-location source of truth

`flowtel_hourly_flow_rate_seasons.location_label` is now the canonical human-readable destination shared by the Lounge and Hourly Flow Rate.

- A location saved in the Lounge appears in Hourly Flow Rate.
- A location changed in Hourly Flow Rate appears beneath the Lounge video.
- Opening the Lounge may quietly create the member’s draft Hourly Flow Rate plan when none exists.
- Dates, lodging, costs, currencies, Home Base, receiving layers, and the fixed 480-hour / 2× calculation remain inside Hourly Flow Rate.
- Existing city, region, country, lodging, reflection, and inspiration data are not deleted.
- Backward-compatible RPCs continue accepting older cached pages while refreshing the canonical location label.

The current input is free text with a 220-character limit. The schema is ready for later structured provider data without replacing the member’s visible location label.

## Time + Space

The private `/flow-fm/time-space/` room is available to:

- the established Flowtel owner; and
- approved Flow FM Priestesses with active Flowtel access.

Each visible team card contains only approved team-facing information:

- profile photo;
- canonical Priestess display name;
- Priestess title;
- member-entered location;
- timezone;
- current local time and date;
- hemisphere; and
- current outer season.

The view excludes legal names, email addresses, clients, mentor relationships, cycle data, check-ins, and administrative status.

The existing Living Map visibility preference is respected. An approved Priestess who opts out of the Flow FM Team Map does not appear in Time + Space.

## Outer-season rhythm

Time + Space uses Flowtel’s established yearly cadence in the Northern Hemisphere:

- Winter — November through January;
- Spring — February through April;
- Summer — May through July; and
- Autumn — August through October.

Southern Hemisphere cards show the opposite outer season. Equatorial profiles display **Season varies locally** rather than assigning an inaccurate season.

Timezone clocks are calculated from each member’s selected IANA timezone. Flowtel Time remains `America/Los_Angeles` and is displayed separately as the shared operational clock.

## Doorways and privacy

- Flow FM Initiation Hall includes a **Time + Space** doorway.
- The owner Concierge Desk includes a direct **Time + Space** doorway.
- The page is private/no-store and noindex.
- Database authorization, not only the visible doorway, enforces access.
- The plotted world map and location autocomplete are explicitly deferred.

## Migration

Run exactly once, before deploying the website files:

```text
database/migration-057-four-seasons-time-space.sql
```

Migration 057 is additive. It preserves existing Hourly Flow Rate plans, seasonal details, costs, snapshots, profiles, memberships, Priestess Profiles, privacy preferences, passwords, sessions, stays, notes, and all Caddie Magic records.

Do not rerun:

- migration 056;
- migration 055;
- migration 054;
- migration 053;
- either historical migration 052 file; or
- retired migration 037.

## Intentionally deferred

This release does not include:

- Geoapify, Google Places, Mapbox, or another location-autocomplete provider;
- latitude/longitude enrichment;
- automatic timezone or hemisphere selection from location;
- the plotted Time and Space world map;
- live Practitioner calls, Acuity, Zoom, reminders, webhooks, or rescheduling; or
- any Caddie Magic behavior changes.

## First test checklist

1. Run migration 057 exactly once, then deploy the release.
2. Enter the Flow FM Lounge and confirm the Four Seasons workshop shows only Winter, Spring, Summer, and Autumn Location.
3. Confirm the embedded Replay Notes form is absent from this workshop only.
4. Save all four locations together and refresh the Lounge.
5. Open Hourly Flow Rate and confirm the same four locations appear.
6. Change one location in Hourly Flow Rate, return to the Lounge, and confirm the change appears there.
7. Confirm lodging, dates, costs, Home Base, and existing detailed fields remain preserved in Hourly Flow Rate and the database.
8. Open **Time + Space** as the owner.
9. Confirm only approved, visible Priestess profiles appear.
10. Confirm each card shows the correct profile photo, display identity, location, timezone, local clock, hemisphere, and outer season.
11. Test a Northern and Southern Hemisphere profile and confirm their seasons are opposite.
12. Test an Equatorial profile and confirm it says **Season varies locally**.
13. Turn off Living Map visibility for a test Priestess and confirm she no longer appears.
14. Confirm legal names, emails, client relationships, cycle data, and administrative status are absent.
15. Confirm an approved Priestess can open the room and an unapproved ordinary member cannot.
16. Confirm the Flow FM and owner Concierge doorways open the same private room.
17. Confirm Caddie Magic v0.5.2 continues working unchanged.
