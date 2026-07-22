# Flowtel v0.10.71 — Priestess Network + Shared Identity

Release date: 2026-07-22

Caddie Magic remains **v0.5.2**. This release does not change Player, Caddie, Caddie Master, Compass, Network, scheduling, or Caddie history behavior.

## Summary

This release adds the owner-only **Priestess Concierge Team** command center and resolves the duplicate identity problem between the Guest Flowtel Profile and Priestess Profile Studio.

Every Flow FM and Council member is included in the owner directory, even before she begins Profile Studio. Shared identity now has one database source of truth, while Priestess-specific public and practitioner fields remain separate.

## Priestess Concierge Team directory

The Concierge Desk now includes a **Priestess Concierge Team** room containing every Flow FM and Council member.

The directory shows:

- canonical Flowtel/Queendom display name;
- private owner-only email;
- Flow FM or Council pathway;
- location, timezone, and member-selected hemisphere;
- Priestess Profile state, including **Not Started**;
- accepting-clients state;
- active consented client count;
- pending mentor-request count; and
- **Calendar connection coming soon** rather than invented upcoming-call data.

Filters support Flow FM, Council, profile status, accepting clients, and not accepting clients.

The directory is owner-only. It does not expose raw cycle data, legal identity to the community, or client information outside the existing owner and mentor-consent boundaries.

## Dedicated owner Priestess Team profiles

Each directory card opens `/manager/priestess-team/?member=<member-id>`.

The dedicated owner view contains:

- canonical and private identity;
- membership and Flow FM start information;
- Priestess Profile status and preview;
- profile approval or revision controls when submitted;
- mentor/practitioner accepting-clients control;
- connected and requested client relationships;
- authorized Client Snapshot links for connected clients; and
- the explicit upcoming-calls placeholder until the later shared Acuity integration is active.

Database authorization and the page itself both require the established Phase 1 owner Concierge boundary.

## Shared identity source of truth

`public.profiles` is now canonical for:

- first name;
- last name;
- `display_name` / Queendom identity;
- location;
- timezone; and
- hemisphere.

The Guest Profile and Priestess Profile Studio both use `flowtel_update_my_shared_identity(...)`.

Compatibility triggers keep the older identity columns in `flow_fm_priestess_profiles` synchronized, preventing future or older callers from creating a second conflicting identity source.

Priestess-specific fields remain separate, including:

- Priestess title;
- biography;
- offerings;
- who she serves;
- session types;
- profile image;
- external links; and
- practitioner/network settings.

Legal-name privacy remains intact. The ordinary Priestess Profile reader returns legal identity only to the member herself. The owner receives private identity only through the owner-authorized team profile.

## Hemisphere foundation

Both profile rooms now offer:

- Northern Hemisphere;
- Southern Hemisphere; and
- Equatorial / seasonal context varies.

This value is member-selected rather than inferred from free-text location. It prepares the later Time and Space experience without adding an external location service or plotted world map.

The actual plotted world map remains intentionally deferred.

## Resilience

The Concierge Desk calls the Priestess Team list RPC through its existing application module. It does not add a new required top-level browser-module dependency that could prevent the rest of the Desk from opening.

The dedicated Priestess Team page uses its own focused shared adapter, so any page-specific problem remains local to that room.

## Migration

Run exactly once, before deploying the website files:

```text
database/migration-056-priestess-network-shared-identity.sql
```

Migration 056 is additive. It preserves profiles, Priestess Profile history, mentor relationships, consent, memberships, access, passwords, stays, notes, and all Caddie Magic records.

Do not rerun:

- migration 055;
- migration 054;
- migration 053;
- either historical migration 052 file; or
- retired migration 037.

## Intentionally deferred

This release does not include:

- the plotted Time and Space world map;
- the team-facing approved-Priestess Time and Space view;
- location autocomplete or Geoapify;
- simplified Four Seasons Lounge location inputs;
- Lounge ↔ Hourly Flow Rate seasonal-location synchronization; or
- live practitioner calls, Acuity, Zoom, reminders, webhooks, or rescheduling.

Those remain planned for later coordinated releases.

## First test checklist

1. Run migration 056 exactly once, then deploy the release.
2. Sign in as the owner and open **Priestess Concierge Team**.
3. Confirm every Flow FM and Council member appears, including one who has not started Profile Studio.
4. Filter by Flow FM, Council, profile state, accepting clients, and not accepting clients.
5. Confirm legal name and email remain inside the owner-only experience.
6. Open a dedicated Priestess Team profile.
7. Confirm membership, profile status, location, timezone, hemisphere, mentor availability, and client counts.
8. Toggle accepting clients, refresh, and confirm the state remains.
9. Open a connected Client Snapshot and confirm existing mentor consent is still required.
10. Confirm the directory displays **Calendar connection coming soon** and no invented call data.
11. Save first name, last name, display name, location, timezone, and hemisphere from **My Profile**.
12. Open Profile Studio and confirm those same shared identity values appear.
13. Change the shared identity from Profile Studio, then return to My Profile and confirm it updated.
14. Turn off public location display in Profile Studio, save, and confirm the private shared location remains stored.
15. Confirm title, bio, offerings, profile image, and external links remain Priestess-specific.
16. Confirm an ordinary Flow FM member cannot open the owner Priestess Team page.
17. Confirm the existing Caddie Magic v0.5.2 experience remains unchanged.
