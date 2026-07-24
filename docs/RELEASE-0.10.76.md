# Flowtel v0.10.76 — Flow FM Platform + Tools Polish

Release date: 2026-07-23

Caddie Magic remains **v0.5.2**. This release does not change Player access, Caddie permissions, scores, invitations, courses, messages, or Caddie Magic history.

## Summary

This release carries the quiet-luxury Flow FM design direction across the complete member-facing Initiation Hall platform and finishes the currently approved Availability, Hourly Flow Rate, and Concierge refinements.

The release is intentionally disciplined. It improves hierarchy, rhythm, navigation, forms, cards, buttons, empty/loading states, and responsive behavior without adding massive headings, oversized hero banners, unnecessary sentiment, or unrelated product systems.

## Unified Initiation Hall platform UI

A shared Flow FM platform stylesheet and restrained typography system now coordinate the member-facing Flow FM rooms:

- Initiation Hall;
- Flow FM portal;
- 13 Moons curriculum;
- Womb Work;
- Business Assignments;
- Profile Studio;
- Planning Room;
- Review flow;
- Living Map;
- Living Map profile view;
- Hourly Flow Rate;
- Availability; and
- Time + Space.

The shared system provides:

- compact, horizontally accessible navigation;
- restrained page-heading sizes;
- consistent card, form, button, status, loading, and empty-state treatment;
- a clearer top-to-bottom information rhythm;
- quieter editorial copy;
- consistent desktop and mobile behavior; and
- stable routes and module paths with v0.10.76 cache keys.

The redesign does not change membership gates, curriculum access, saved content, profile identity, Living Map privacy, Time + Space consent, or any historical record.

## Inner Season Availability

The four Inner Season weekly templates now use progressive disclosure.

- Each weekday is labeled **Available** rather than Offline.
- A day remains unchecked by default.
- Time-window controls remain collapsed until the member selects Available.
- Closing a day hides its controls without deleting previously saved windows.
- Windows are removed only when the member explicitly removes them.
- The experience remains a seasonal Monday–Sunday preference template, not a dated calendar or live booking promise.

Migration 061 separates the day’s visible available/closed state from its preserved saved windows while keeping the migration-058 legacy response compatible.

## Hourly Flow Rate

The Hourly Flow Rate experience is simplified into a quieter, business-focused planning tool.

- Removes the entire **Private Witnessing** reflection section.
- Replaces the repetitive seasonal-room steps with one unified seasonal card.
- Keeps the primary inputs focused on location, seasonal lodging cost, and the optional listing link.
- Keeps Current Expenses direct and transactional.
- Leaves Lifestyle Layers visible but locked for their dedicated later release.
- Preserves the fixed `480 annual hours × 2` formula.
- Rounds the displayed Hourly Flow Rate upward to the nearest whole dollar.
- Places the whole-number result in a restrained top-of-page result card.
- Shows the same whole-number rate in the owner Priestess Team profile.
- Keeps the original raw calculation and append-only rate history intact.

Examples of the display rule:

- `126.00` displays as **$126/hour**;
- `126.01` displays as **$127/hour**.

## Concierge refinements

- The Flow FM progress subtitle uses the member’s current Moon rather than “Began in [Moon].”
- The practitioner return card heading is **Go to your Room**.
- The body dynamically says: **Clock out when you're done working and go do day X things.**
- Clock Out behavior and the current cycle-day source remain unchanged.

## Migration

Migrations **058, 059, and 060 are confirmed live**.

Run this release migration once before deploying the v0.10.76 browser files:

```text
database/migration-061-flow-fm-platform-tools-polish.sql
```

Migration 061:

- creates the consent-safe `flowtel_flow_fm_availability_day_states` table;
- enables RLS and revokes direct browser writes;
- backfills existing weekly windows as available;
- extends the availability load payload with `weekly_days` while preserving legacy `days`;
- preserves saved windows when a weekday is closed;
- updates the seasonal availability save boundary; and
- adds an owner-only Hourly Flow Rate summary RPC for the Priestess Team profile.

Migration 061 contains no table drops, truncation, destructive history rewrite, or direct authenticated table-write grant.

Do not rerun migration 058, 059, 060, either historical migration 052 body, or retired migration 037.

## Protected behavior

This release preserves:

- Flowtel Time = `America/Los_Angeles`;
- one stay per Guest per Flowtel Day;
- append-only stays, notes, messages, Honors, Guest House consent events, and history;
- personal passwords and remembered sessions;
- canonical `profiles.display_name` and legal-name privacy;
- membership rank and cross-product access boundaries;
- owner-only Concierge access and unread-note continuity;
- mentor relationships and consent;
- Powder Room anonymity and Flow Map history;
- frozen Medicine Wheel geometry;
- Actual versus Recorded cycle logic;
- private Priestess Mailbox, Lounge video, Guest House, and Replay Notes boundaries;
- explicit Flow FM Start Date and `(month - 1) / 12` progress placement;
- the fixed Hourly Flow Rate calculation; and
- all Caddie Magic v0.5.2 role and privacy boundaries.

## First test checklist

1. Confirm migrations 058, 059, and 060 are already live.
2. Run migration 061 once, then deploy v0.10.76.
3. Open every member-facing Flow FM route on desktop and mobile and confirm the shared quiet-luxury shell, restrained headings, compact navigation, and consistent cards/forms/buttons.
4. Confirm every Flow FM navigation link opens the correct room and remembered sessions return correctly.
5. Confirm membership and practitioner-only rooms remain correctly gated.
6. Open Availability and confirm every weekday initially shows an unchecked **Available** control with hidden time windows.
7. Check a day, add two windows, save, refresh, and confirm both windows remain.
8. Uncheck that day, save, refresh, and confirm the controls remain collapsed while the stored windows return when Available is checked again.
9. Explicitly remove one window and confirm only that window is deleted.
10. Open Hourly Flow Rate and confirm Private Witnessing is absent.
11. Confirm each season uses one unified card for location, lodging cost, optional listing link, and one save action.
12. Enter values that produce a fractional rate and confirm the visible result rounds upward; confirm an exact integer does not increase.
13. Confirm the fixed 480-hour / 2× calculation and append-only history remain unchanged.
14. Open the same member in the owner Priestess Team profile and confirm the same whole-number Hourly Flow Rate appears.
15. Confirm Lifestyle Layers remain visible and locked.
16. Confirm the Concierge progress subtitle shows the current Moon.
17. Clock in as a practitioner and confirm the card says **Go to your Room** and dynamically displays the correct cycle day.
18. Recheck Guest House, Queendom entry, Suite, Previous Visits, Turndown, Powder Rooms, Living Map privacy, and Time + Space access.
19. Confirm Caddie Magic v0.5.2 remains unchanged.
