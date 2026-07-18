# Flowtel v0.10.50 — Team Map Membership + Owner Turndown Routing Repair

Release date: 2026-07-18

## Summary

This release repairs two beta-testing issues discovered when outside members began using Flowtel:

1. Flow FM members could successfully check in but remain absent from the Team Map after a lower Queendom doorway value overwrote their visible membership type.
2. A guest's Turndown request could appear inside **Guests in House** while remaining absent from Megan's **Awaiting Turndown** queue because the older opposite-wing practitioner filter was still active.

## Team Map membership recognition

The Team Map now resolves the highest trustworthy membership signal instead of relying on one profile field.

Flowtel recognizes Flow FM/Council team membership from:

- `profiles.membership_type`
- the preserved `profiles.membership_rank`
- Supabase Auth user metadata
- practitioner/admin/owner role
- Flow FM start date or initiation status
- an existing Profile Studio/Priestess Profile record

Migration 039 restores `membership_type` to `flowfm` or `council` when a lower doorway value was written over stronger existing evidence.

### No membership downgrades during beta entry

Both beta entry APIs now preserve the highest membership already connected to the member:

- `/api/beta-request`
- `/api/squarespace-bridge`

A Flow FM member entering through a generic Queendom doorway can no longer be downgraded to Queendom-only. The browser-side profile upsert also honors `membership_rank` before accepting a lower doorway value.

The Request Access page follows the membership returned by the server, so a recognized Flow FM member continues through the Flow FM doorway even if she opened the generic beta form.

### Authenticated and embedded maps

The repaired effective-membership rule is used by:

- authenticated `/flow-fm/team-map/`
- public-safe `/flow-fm/team-map/embed/`
- Team Map profile access
- the member's own Team Map visibility setting

True Queendom-only members may still view the map, but they are not relabeled as Concierge Team members.

### Owner recognition control

When an older beta profile has no remaining Flow FM signal at all, its **Guests in House** card shows an owner-only **Add to Concierge Team** button. This explicitly restores `flowfm` membership through the protected migration 039 RPC, then refreshes the Desk. The control does not change the member's password, stay history, or cycle data.

## Owner Turndown routing

During Phase 1, Megan's owner/admin Concierge account now receives every active Turndown request from the current Flowtel Day.

The queue no longer applies opposite-wing filtering to the owner. The established wing-polarity rule remains in the code for future practitioner Concierge access.

The repaired queue:

- counts every open Turndown request from today
- displays each request under **Awaiting Turndown**
- keeps the guest's wing visible for context
- keeps completed requests visible for the rest of the Flowtel Day
- preserves Concierge Note completion behavior
- refreshes every 45 seconds while the Desk is open
- refreshes when the tab becomes visible or the window regains focus

No stay or request data is rewritten by the migration. The Turndown request was already being saved correctly; the failure was the Desk's front-end wing filter.

## Supabase migration required

Run:

`database/migration-039-team-map-membership-owner-turndown-routing.sql`

Migration 039:

- adds effective Flow FM membership resolution
- backfills profiles whose higher membership evidence was preserved
- updates authenticated and embedded Team Map functions
- adds the owner-only **Add to Concierge Team** recognition RPC
- adds the owner-only Team Map diagnostic
- does not alter passwords
- does not alter stays, reflections, cycle data, mentor relationships, profile photos, or Priestess Profile content

Do not rerun migration 037. Migration 039 does not replace or reset any member password.

## Team Map diagnostic

After running migration 039, the Supabase SQL Editor may run:

```sql
select *
from public.flow_fm_get_team_map_diagnostics();
```

The result shows every member checked in today and the exact reason she is included or excluded, including membership type, preserved rank, Auth membership metadata, visibility setting, season recognition, and effective rank.

The same function may be called from an authenticated browser only by the owner Concierge.

## Files changed

- `api/beta-request.js`
- `api/squarespace-bridge.js`
- `beta-request/app.js`
- `beta-request/index.html`
- `client/app.js`
- `client/index.html`
- `database/migration-039-team-map-membership-owner-turndown-routing.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.50.md`
- `flow-fm/team-map/embed/index.html`
- `flow-fm/team-map/embed/page.js`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `manager/app.js`
- `manager/index.html`
- `shared/flowtel.js`
- `shared/profiles.js`
- `shared/stays.js`
- `shared/team-map.js`

## Syntax and validation checks

- `node --check api/beta-request.js`
- `node --check api/squarespace-bridge.js`
- `node --check beta-request/app.js`
- `node --check client/app.js`
- `node --check flow-fm/team-map/page.js`
- `node --check flow-fm/team-map/embed/page.js`
- `node --check manager/app.js`
- `node --check shared/flowtel.js`
- `node --check shared/profiles.js`
- `node --check shared/stays.js`
- `node --check shared/team-map.js`
- mocked beta-request membership-preservation test
- mocked Squarespace bridge membership-preservation test
- HTML duplicate-ID validation for changed pages
- migration structure and function/grant validation
- ZIP integrity validation

## First test checklist

1. Deploy v0.10.50.
2. Run migration 039 in Supabase.
3. Do not rerun migration 037.
4. Hard-refresh `/flow-fm/team-map/`.
5. Confirm all checked-in Flow FM beta members appear in their actual Inner Seasons.
6. Confirm multidimensional Feels Like presences still appear when seasons differ.
7. Open `/flow-fm/team-map/embed/` and confirm the same eligible team members appear without private cycle-day data.
8. Run `select * from public.flow_fm_get_team_map_diagnostics();` and confirm any excluded member has a clear reason.
9. For an intentionally Flow FM member still shown as Queendom-only, open **Guests in House** and click **Add to Concierge Team**.
10. Refresh the Team Map and confirm her portrait appears.
11. Open the Concierge Desk as `mm.johnson@icloud.com`.
12. Confirm Yana's active request is included in **Awaiting Turndown** regardless of her wing.
13. Confirm the Awaiting count matches the open requests shown.
14. Confirm the request card displays Cycle Day, Actual Inner Season, Feels Like, and Wing.
15. Complete the request and leave a Concierge Note.
16. Confirm the request moves into **Completed Requests** and remains visible for today.
17. Ask another guest to request Turndown while the Desk is open and confirm it appears automatically within 45 seconds or immediately after returning focus to the tab.
18. Confirm members' personal passwords and remembered sessions remain unchanged.
