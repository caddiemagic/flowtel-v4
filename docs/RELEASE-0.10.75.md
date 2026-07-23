# Flowtel v0.10.75 — Queendom Beta Launch Experience

Release date: 2026-07-23

Caddie Magic remains **v0.5.2**. This release does not change Player access, Caddie permissions, scores, messages, course records, invitations, or any Caddie Magic history.

## Summary

This release prepares the visible Flowtel and Flow FM experience for Queendom beta by repairing the Flow FM Start Date calendar-day bug, correcting the Four Seasons quadrant order, and rebuilding the Initiation Hall around a quieter, more logical luxury rhythm.

The work is intentionally focused. It does not activate Acuity, Lifestyle Layers, Honors automation, Moonbox, golf-course pages, or any other deferred system.

## Flow FM Start Date calendar-day repair

Flow FM Start Date is a date-only value. It must not be converted into a timestamp and shifted backward by the browser timezone.

This release adds a shared Flowtel date-only boundary and applies it to:

- the member My Profile date field;
- the owner Priestess Team date field;
- the owner summary date label;
- Flow FM initiation anchor and month calculations;
- Flow FM date labels; and
- maximum-date validation in Flowtel Time.

Selecting **July 2, 2026** now remains **July 2, 2026** in member and owner views and continues to drive the correct Moon and Month of 13.

Account creation remains forbidden as a fallback initiation date. The progress marker formula remains `(month - 1) / 12`.

## Initiation Hall quiet-luxury redesign

The Initiation Hall is reorganized to feel quiet, clean, logical, and accessible without becoming visually sparse or generic.

- **The Doors Ahead** is replaced with **13 Moons**.
- **Client-Facing Calls** is renamed **Availability** in the Flow FM navigation and support room.
- The large ornamental hero treatment is reduced to a compact editorial introduction.
- The scarab and wax seal remain as restrained visual anchors.
- Sentimental and coronation-style hero language is removed.
- Current Moon and Next Step are given a clearer hierarchy.
- The 13-Moon path becomes a compact numbered card system rather than a wall of ornate door illustrations.
- Support rooms become clean, readable tool cards.
- Desktop and mobile navigation remain horizontally accessible without stacking into oversized button rows.
- No massive text fonts or new large hero banner are introduced.

All existing Flow FM routes, curriculum access rules, current-Moon calculations, Profile Studio, Hourly Flow Rate, Availability, Living Map, Time + Space, and Suite return behavior remain intact.

## Four Seasons quadrant correction

The Four Seasons Lounge planner now follows the established compass geometry:

```text
Autumn | Summer
Winter | Spring
```

This corresponds to:

- top left — Autumn;
- top right — Summer;
- bottom left — Winter; and
- bottom right — Spring.

The underlying seasonal records, dates, Hourly Flow Rate synchronization, and one-save workflow are unchanged.

## Migration

**No new migration required.**

Migration 058 is already confirmed live. This release does not create migration 061.

Guest House migrations 059 and 060 remain separate prerequisites for the v0.10.74.2 Guest House offering and recording-choice workflow. Their live state must still be confirmed before those features are treated as operationally verified.

Do not rerun migration 058, either historical migration 052 body, or retired migration 037.

## Protected behavior

This release preserves:

- Flowtel Time = `America/Los_Angeles`;
- one stay per Guest per Flowtel Day;
- append-only stays, notes, messages, Honors, and history;
- personal passwords and remembered sessions;
- canonical `profiles.display_name` and legal-name privacy;
- membership rank and cross-product access boundaries;
- owner-only Concierge access and unread note continuity;
- mentor consent, Powder Room anonymity, and Flow Map history;
- frozen Medicine Wheel geometry;
- Actual versus Recorded cycle logic;
- private Guest House, Lounge, Priestess Mailbox, and Replay Notes boundaries;
- the fixed Hourly Flow Rate formula; and
- all Caddie Magic v0.5.2 role and privacy boundaries.

## First test checklist

1. Deploy v0.10.75 with no new migration.
2. In My Profile, select July 2, 2026 as the Flow FM Start Date, save, refresh, and confirm July 2 remains visible.
3. Open the same member in the owner Priestess Team profile and confirm the summary and input both show July 2.
4. Confirm the member’s Moon, Month of 13, and progress marker use the selected date.
5. Confirm the date field does not permit a future date according to Flowtel Time.
6. Open the Initiation Hall on desktop and mobile.
7. Confirm the hero says **13 Moons**, uses restrained type, and retains the scarab and wax seal.
8. Confirm the top navigation says **Availability** and remains easy to scan and scroll.
9. Confirm Current Moon, Next Step, Moon Path, and Rooms + Tools follow a clear top-to-bottom rhythm.
10. Open the current Moon portal and every support-room link to confirm routing is unchanged.
11. Confirm the Moon path cards remain readable and the current Moon is visibly distinguished.
12. Open the Four Seasons Lounge planner and confirm Autumn/Summer appear on the first row and Winter/Spring on the second.
13. Save all four seasonal locations, refresh, and confirm values and dates remain attached to the correct seasons.
14. Recheck Queendom entry, remembered sessions, Suite, Previous Visits, Turndown, Powder Rooms, and owner Concierge access.
15. Confirm Caddie Magic v0.5.2 behavior remains unchanged.
