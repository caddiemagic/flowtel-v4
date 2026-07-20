# Flowtel v0.10.57 — Hourly Flow Rate MVP

Release date: 2026-07-20

## Summary

This release opens the first private **Hourly Flow Rate** room for recognized Flow FM and Council members. It translates a future seasonal vision, present Home Base stability, and sovereign self-care into a living receiving standard without treating the result as human worth, a guaranteed income forecast, or a literal hourly service price.

The experience begins with desire rather than an expense inventory:

1. create one complete future four-season planning cycle;
2. choose a location for each season;
3. find and price a seasonal home;
4. watch the Emerging Hourly Flow Rate appear after the first valid monetary save;
5. welcome the Home Base and optional lifestyle layers when called;
6. return to a preserved vision and meaningful Receiving Timeline.

## Source preservation

The newest uploaded complete combined project ZIP was used as the source of truth. Although the v0.10.56 handoff identified Caddie Magic v0.4.2, the newer combined ZIP contained Caddie Magic v0.4.5. This release preserves that newer v0.4.5 work rather than rolling it back.

The project was patched in place. It was not recreated from memory or from the older starter-kit ZIP.

## Route and access

New private route:

`/flow-fm/hourly-flow-rate/`

The route requires:

- an authenticated Supabase session;
- Flowtel product access;
- an owner/admin account or an effective Flow FM/Council membership rank of at least 2.

Player-only Caddie Magic accounts remain outside Flowtel. No Hourly Flow Rate records are exposed to anonymous visitors, public Team Maps, other members, mentors, or practitioners who do not own the plan.

The Flow FM top navigation and Initiation Hall now include a doorway to the new room. The wider 13-Moon curriculum remains sealed by the current rollout switch.

## Preserved seasonal cycle

On first entry, the database creates exactly one private future planning cycle beginning with the season after the season currently in progress in **Flowtel Time** (`America/Los_Angeles`).

Flowtel seasons remain:

- Spring: February 1–April 30;
- Summer: May 1–July 31;
- Autumn: August 1–October 31;
- Winter: November 1–January 31.

The cycle:

- shows actual years;
- treats dates as inclusive;
- handles Winter across the calendar-year boundary;
- uses the actual calendar, including February 29 in a leap year;
- highlights the first upcoming season as suggested;
- allows all four seasons to be opened in any order;
- remains preserved after creation instead of silently reordering when the real-world season changes.

Each seasonal destination saves independently and may hold city, region, country, a private calling reflection, and an optional inspiration link. City and country together mark the destination as chosen.

## Living Hourly Flow Rate

Before money is entered, the hero is:

**Your Seasonal Sovereignty Map**

No `$0/hour` result is shown.

After the first valid monetary value is saved, the hero becomes:

**Your Emerging Hourly Flow Rate**

The large emotional display uses a whole-dollar rate. The breakdown retains exact two-decimal values.

The authoritative calculation is fixed:

```text
Annual Home Base Cost = Monthly Home Base Number × 12
Annual Seasonal Freedom Cost = Sum of valid seasonal costs
Annual Vision Total = Annual Home Base Cost + Annual Seasonal Freedom Cost
Base Hourly Flow Rate = Annual Vision Total ÷ 480
Hourly Flow Rate = Base Hourly Flow Rate × 2
```

The following teaching constants are not editable:

- 12 Inner Summer weeks;
- 40 Self-Care Hours per week;
- 480 annual Self-Care Hours;
- fixed 2x Flow Multiplier.

The 480 hours are not described as client-facing or billable hours. They include body care, restoration, medicine, creativity, visibility, service, business development, integration, celebration, and receiving.

The current Home Base remains funded while seasonal freedom is added on top. The calculation never deducts current home expenses from seasonal costs.

## Seasonal homes and optional layers

The Seasonal Home room supports:

- multiple properties per season;
- optional property name and listing URL;
- season-default or custom stay dates;
- complete lodging price in the selected base currency;
- fees included: yes, no, or unsure;
- optional original amount and original currency;
- private notes;
- gentle, non-blocking date-gap and overlap information.

Optional money layers are:

- Seasonal Nourishment;
- Sovereign Self-Care;
- Seasonal Transitions;
- Pleasure & Support.

Each optional layer offers two valid depths:

- **Add a Simple Estimate** — one seasonal total;
- **Build the Full Vision** — individual items, source links, frequency/context, notes, and costs.

When a positive detailed build exists for an optional layer, its detailed entries carry the living calculation. The earlier estimate remains stored and visible instead of being destroyed. The simple path is never framed as inferior or incomplete.

## Home Base privacy

Flowtel stores only:

- the final monthly Home Base Number;
- optional private review date;
- optional confirmation that the inventory was completed privately;
- optional private reflection.

No itemized expense ledger is stored. Annual Home Base is calculated as the final monthly number multiplied by 12.

## Currency behavior

The plan uses one three-letter base currency.

- All calculated values use the base-currency amount manually entered by the member.
- Optional original amount and original currency are preserved together.
- Flowtel performs no live conversion and does not imply an exchange rate.
- Once any positive monetary value is present, the base currency is held steady so existing values are not silently reinterpreted.

## Receiving Timeline

The **Receiving Timeline** is append-only.

A new snapshot is created only after an explicit monetary save or removal changes the current Hourly Flow Rate. It is not created on each keystroke and does not duplicate a snapshot when the saved rate is unchanged.

Each snapshot preserves:

- reason for the movement;
- associated layer and season when relevant;
- Annual Home Base;
- Seasonal Freedom;
- Annual Vision Total;
- Base Hourly Rate;
- Hourly Flow Rate;
- base currency;
- number of flowing layers;
- timestamp.

Historical snapshots remain after the living plan changes.

## Database migration

Run once, after confirming the live database is current through migration 046:

`database/migration-047-hourly-flow-rate-mvp.sql`

Migration 047 adds:

- `flowtel_hourly_flow_rate_plans`;
- `flowtel_hourly_flow_rate_seasons`;
- `flowtel_hourly_flow_rate_cost_entries`;
- `flowtel_hourly_flow_rate_home_base`;
- `flowtel_hourly_flow_rate_snapshots`;
- member eligibility and ownership helpers;
- the fixed server-side calculation;
- private plan load/create, destination, cost, Home Base, state, currency, deletion, and snapshot RPCs;
- member-owned RLS select policies;
- revoked direct insert/update/delete privileges so writes remain RPC-only.

Migration 047 does not modify passwords, Supabase Auth sessions, stays, Concierge notes, mentor relationships, Team Maps, Honors rows, Priestess Mailbox files, Moonbox letters, Powder Rooms, Flow Map history, cycle-day records, or Caddie Magic records.

**Migration 037 remains retired and must never be rerun.**

## Flow FM integration repair

The newest combined source referenced `/shared/rollout.js` from several Flow FM routes, but that module was absent. The Moon Portal also contained a malformed import block.

This release:

- restores `shared/rollout.js` with the existing Phase 1 curriculum seal preserved;
- enables only the specifically approved Hourly Flow Rate MVP for recognized Flow FM/Council members;
- repairs the Moon Portal import syntax;
- does not open the wider curriculum or Planning Room to guests.

## MVP boundaries

This release intentionally does not add:

- live exchange rates;
- lodging, restaurant, or flight scraping;
- booking or reservation actions;
- bank or card connections;
- tax calculations;
- public comparison or leaderboards;
- AI pricing advice;
- a percentage-complete bar;
- a statement that the rate represents human worth.

## Preserved systems

This release preserves:

- one stay per Flowtel Day;
- append-only stay and note history;
- Flowtel Time;
- personal passwords and remembered sessions;
- `display_name` as the canonical visible identity;
- legal-name privacy;
- owner-only Concierge access for `mm.johnson@icloud.com`;
- owner all-wing Turndown routing;
- unread Concierge-note continuity;
- member/public/owner Team Map boundaries;
- highest-rank membership preservation;
- mentor relationship and consent logic;
- Powder Room anonymity and master sharing;
- Flow Map history;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day logic;
- Moonbox beta hold;
- Flowtel Honors append-only 77/23 calculations;
- private bi-directional Priestess Mailbox;
- Caddie Magic v0.4.5, Player-Only Access, invitations, migrations, and product-access boundaries.

## Files changed

- `database/migration-047-hourly-flow-rate-mvp.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.57.md`
- `flow-fm/app.js`
- `flow-fm/index.html`
- `flow-fm/hourly-flow-rate/index.html`
- `flow-fm/hourly-flow-rate/page.js`
- `flow-fm/hourly-flow-rate/styles.css`
- `flow-fm/portal/page.js`
- `flow-fm/ui.js`
- `scripts/test-hourly-flow-rate.mjs`
- `scripts/validate-hourly-flow-rate.mjs`
- `shared/hourly-flow-rate-calculations.js`
- `shared/hourly-flow-rate.js`
- `shared/rollout.js`
- `vercel.json`

## First test

1. Confirm migration 046 is already installed, then run migration 047 once in Supabase SQL Editor.
2. Do not rerun migration 037.
3. Deploy v0.10.57 and sign in as a recognized Flow FM/Council member.
4. Open `/flow-fm/hourly-flow-rate/` and confirm one four-season cycle begins with the next Flowtel season.
5. Confirm all four cards show actual inclusive dates and years, including Winter across two years.
6. Leave every monetary field empty and confirm the hero says **Your Seasonal Sovereignty Map** with no `$0/hour` result.
7. Save city and country in each season in any order; refresh and confirm every destination returns unchanged.
8. Add one lodging cost and confirm **Your Emerging Hourly Flow Rate** appears immediately after the explicit save.
9. Confirm the exact breakdown equals `(Annual Home Base + valid seasonal costs) ÷ 480 × 2` and the hero rounds to a whole dollar.
10. Add a second property to the same season and confirm both amounts sum.
11. Create a lodging date gap and overlap and confirm Flowtel offers gentle information without blocking the save.
12. Save a simple estimate in an optional layer and confirm it counts.
13. Add detailed positive items to that same optional layer and confirm the detailed total replaces the estimate in the calculation while the estimate remains preserved.
14. Save a monthly Home Base Number and confirm Annual Home Base equals monthly × 12 and is added on top of Seasonal Freedom.
15. Confirm no itemized Home Base expense fields exist.
16. Enter an original amount and currency and confirm both return after refresh while only the manual base amount affects the calculation.
17. Attempt to change the base currency after money is flowing and confirm the change is compassionately blocked.
18. Confirm a meaningful Receiving Timeline snapshot appears after a rate-changing save, not while typing, and that repeating the same rate does not create a duplicate snapshot.
19. Refresh, sign out/in, and return; confirm destinations, costs, Home Base, last opened season, reflection, current rate, and timeline restore.
20. Sign in as another Flow FM member and confirm the first member’s plan is not visible.
21. Sign in as a player-only Caddie Magic account and confirm Flowtel product access remains denied.
22. Confirm the Initiation Hall and Moon Portal load without import errors and the wider curriculum remains sealed.
23. Confirm Suite, Previous Visits, Concierge notes, Turndown Service, Team Maps, Powder Rooms, Flow Map, Medicine Wheel, Profile Studio, Honors, Priestess Mailbox, Moonbox beta hold, and Caddie Magic continue loading.
