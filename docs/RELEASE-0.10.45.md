# Flowtel v0.10.45 — Queendom Team Map Embed + External Priestess Profiles

Release date: 2026-07-17

## Summary

This release turns the saved **External Website URL** into the temporary Priestess-profile bridge for the Flow FM Team Map and adds a public-safe embedded map for the Queendom members page. The authenticated Team Map remains the operational view, while the iframe route exposes only the minimal information needed for community discovery.

## Team Map profile-card updates

- Every preview card now says **CONCIERGE TEAM**.
- Every preview card now uses the fixed title **FLOW FM PRIESTESS**, regardless of the member's editable Profile Studio title.
- Removed About Me / bio excerpts from the preview card.
- **View My Profile** and **Visit Her Profile** now open the latest saved **External Website URL** in a new tab.
- The profile link is independent of the future Profile Studio approval workflow.
- URLs without `https://` are normalized safely in the browser.
- When no external URL has been entered, the card quietly says **Profile link coming soon.**

## Queendom embedded Team Map

Added:

`/flow-fm/team-map/embed/`

The embedded view:

- requires no Flowtel login
- is designed for an iframe on the Queendom Squarespace members page
- reloads current presences when the iframe opens
- refreshes every 60 seconds and when the tab becomes visible
- preserves actual and multidimensional Feels Like presences
- uses the pink rose when no profile photo exists
- opens the member-supplied external Priestess profile URL
- stacks Winter, Spring, Summer, Autumn on mobile
- sends its content height to the parent page for responsive iframe resizing
- includes `noindex`, `nofollow`, and `noarchive` metadata

A ready-to-copy Squarespace snippet is documented in:

`docs/QUEENDOM-TEAM-MAP-EMBED.md`

## Public-safe data boundary

The embedded endpoint returns only:

- anonymous presence key
- Priestess display name
- public profile photo URL
- member-supplied external profile URL
- today's actual Inner Season
- today's Feels Like season

It does not return email, member UUID, cycle day, reflections, checkout notes, stay history, mentor relationships, private profile text, or administrative data. The existing Team Map visibility opt-out applies to both views.

## Files changed

- `database/migration-035-public-team-map-embed.sql`
- `docs/CHANGELOG.md`
- `docs/QUEENDOM-TEAM-MAP-EMBED.md`
- `docs/RELEASE-0.10.45.md`
- `flow-fm/team-map/embed/index.html`
- `flow-fm/team-map/embed/page.js`
- `flow-fm/team-map/embed/styles.css`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `flow-fm/team-map/styles.css`
- `shared/team-map.js`
- `vercel.json`

## Supabase

Run:

`database/migration-035-public-team-map-embed.sql`

Migration 035 adds one minimal read-only RPC granted to `anon` and `authenticated`. It does not alter or delete profiles, stays, reflections, photos, relationships, or Profile Studio content.

## Syntax checks

- `node --check flow-fm/team-map/page.js`
- `node --check flow-fm/team-map/embed/page.js`
- `node --check shared/team-map.js`

## First test checklist

1. Run migration 035 in Supabase.
2. Open the authenticated Team Map and select a member.
3. Confirm the card says **CONCIERGE TEAM** and **FLOW FM PRIESTESS**.
4. Confirm the card no longer displays a bio excerpt.
5. Confirm **View My Profile** opens your saved External Website URL.
6. Confirm another member's button says **Visit Her Profile** and opens her saved External Website URL.
7. Open `/flow-fm/team-map/embed/` in a private browser with no Flowtel session.
8. Confirm the current daily Team Map loads without requesting login.
9. Confirm profile previews expose no cycle day or bio.
10. Confirm a profile button opens the saved external URL.
11. Confirm ghost presences appear where Feels Like differs from actual season.
12. Test the embed at desktop and mobile widths.
13. Add the snippet from `docs/QUEENDOM-TEAM-MAP-EMBED.md` to a Squarespace Code Block.
14. Confirm the iframe height adjusts and the map refreshes on page load.
15. Turn Team Map visibility off for one member and confirm she disappears from both authenticated and embedded maps.
