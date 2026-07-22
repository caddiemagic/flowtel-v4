# Caddie Magic v0.5.2 — Caddie Master Command Center + Concierge Team

Release date: 2026-07-22

Coordinated Flowtel release: **v0.10.70**

## Product boundary

Every Caddie remains a Player first. The Caddie capability adds the Caddie Desk and golf-course Concierge Team tools without replacing Player identity or granting Flowtel/owner access.

The Caddie Master remains the owner/admin service role. Paired Caddies remain narrower service providers.

## Included

- unified Caddie Network for Player access, invitations, Caddie lifecycle, courses, and profile operations;
- owner Caddie Master attention queues;
- private Caddie Team ↔ Caddie Master messages, separate from VIP Player messages;
- Caddie Concierge Team directory with status and course filters;
- dedicated owner-only Caddie team profiles;
- owner-granted Compass Consecration;
- Upcoming Golf acknowledgment through The Caddie Force;
- Score Map/Locker Room control consistency;
- coherent v0.5.2 cache keys, route headers, documentation, and validator coverage.

## Preserved

- Player-Only product boundaries;
- invitation codes and existing access;
- valid-score calculations;
- future-round-date protection;
- private Score Map history;
- anonymous Locker Room sharing;
- personalized Cardinal Clubs and Moon-phase mapping;
- accepted-only Caddie availability;
- consent-scoped read-only consultation preparation;
- no paired-Caddie write access to Player records;
- Caddie Master Assignments, VIP Messages, Notes, and Scorecard Reviews;
- all historical records.

## Migration

Run exactly once:

```text
database/migration-055-caddie-master-command-center.sql
```

Do not rerun migration 053, either historical migration 052 file, or retired migration 037.
