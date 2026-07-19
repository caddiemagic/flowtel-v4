# Flowtel v0.10.55 — Priestess Profile Studio Elevation + Moonbox Beta Hold

Release date: 2026-07-19

## Summary

This release temporarily removes the guest-facing Moonbox entrances while the room remains under development, and elevates the Priestess Profile Studio into a quieter, more elegant editing experience that better matches the current Flowtel design language.

The Moonbox route, database tables, migration 042, and stored messages remain intact. Only the Suite and Lounge entrances are removed so beta members do not discover the room before it is ready.

## Moonbox beta hold

Removed from the guest-facing interface:

- **Enter The Moonbox** from the Suite action row;
- the Moonbox card and **Enter The Moonbox** button from the Flowtel Lounge.

Preserved behind the scenes:

- `/moonbox/` route;
- Moonbox authentication and privacy boundary;
- private and collective message storage;
- anonymous witnessing;
- migration 042 and existing Moonbox records.

No Moonbox data is deleted or rewritten.

## Priestess Profile Studio elevation

The Profile Studio page now:

- removes the oversized **Your Queendom** hero card;
- removes the decorative side pillars and scarab/sun-disk hero treatment from this page;
- replaces **Choose your doorway.** with **YOUR PRIESTESS PROFILE**;
- uses a compact, centered Profile Studio heading with a restrained gold divider;
- gives the editor and live preview cleaner white surfaces, softer shadows, and more refined spacing;
- keeps the live profile preview visible while editing on desktop;
- refines form fields, identity panels, offering chips, photo upload, and action buttons;
- changes the editor section language from doorway language to **PROFILE DETAILS** and **Shape how you are seen.**;
- changes **Choose the face of your Queendom.** to **Choose your profile photo.**;
- preserves mobile stacking and full-width action buttons.

## Preserved systems

This release does not change:

- Priestess Profile saving, submission, review, external URL, identity sync, or photo upload behavior;
- `display_name` as the canonical visible Flowtel identity;
- legal-name privacy;
- Team Map profile links and membership preservation;
- one stay per Flowtel Day;
- append-only stay history;
- Flowtel Time (`America/Los_Angeles`);
- Concierge-note continuity or Turndown Service;
- passwords or remembered sessions;
- owner-only Concierge access and owner all-wing routing;
- mentor relationship logic;
- Powder Room anonymity and master sharing;
- Flow Map data;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day logic.

Migration 037 remains retired and must not be rerun.

## Supabase migration

**No Supabase migration is required for v0.10.55.**

Migration 042 remains in the project and should not be rerun merely to deploy this visual release.

## Files changed

- `client/index.html`
- `client/styles.css`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/styles.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.55.md`

## First test

1. Deploy v0.10.55 and enter the Suite as a beta guest.
2. Confirm no Moonbox button appears in the Suite action row.
3. Open the Flowtel Lounge and confirm the Moonbox card is absent.
4. Confirm Suite Clock In visibility and the Lounge entrance still behave according to role.
5. Open `/flow-fm/profile-studio/`.
6. Confirm the **Your Queendom** hero, pillars, emblem, and mantra are gone.
7. Confirm the main heading says **YOUR PRIESTESS PROFILE**.
8. Confirm the form and preview remain side-by-side on desktop and stack cleanly on mobile.
9. Edit the display name, title, bio, offerings, location, timezone, external URL, and photo; confirm the live preview still refreshes.
10. Save a draft and submit it to be witnessed; confirm the existing status and identity-sync behavior remains intact.
11. Confirm the Team Map still uses the saved external profile URL and canonical display name.
12. Confirm Suite, Lounge, Concierge notes, Turndown Service, Powder Rooms, Flow Map, Team Map, Medicine Wheel, and Previous Visits still load without JavaScript errors.
