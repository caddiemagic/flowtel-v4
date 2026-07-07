# Flowtel v0.10.14 — Phase 1 Guest Beta Rollout + Royal Queendom Hero

This release starts the intentional beta-testing rollout while also applying the next luxury facelift to the Queendom page.

## What changed

### 1) Queendom hero update
- Replaced the smaller beetle motif on the Profile Studio / Your Queendom page with the new luxury golden scarab + sun-disk emblem asset.
- Added more dramatic temple-side pillars with carved stone styling to the left and right edges of the Queendom hero.
- Kept the existing royal/blush/gold visual system while turning up the Egyptian temple mood.

### 2) Phase 1 rollout controls
Added a shared rollout config in `shared/rollout.js` so Flowtel can open in deliberate phases.

Active phase now:

- **Phase 1 — Guest Flow + Profile Studio Beta**

Phase 1 behavior:
- Guest Flow remains open.
- Profile Studio remains open.
- Mentor selection remains open.
- **Clock In is disabled.**
- The broader Flow FM curriculum is sealed for guest testers.
- The Flow FM hallway, portal, and 13 Moons path now explain that Profile Studio is the active testing doorway.

### 3) Mentor selection narrowed for early testing
- Mentor selection now filters to admin/owner mentor accounts during Phase 1.
- This is intended to let the founding mentor account be the only mentor visible in early beta, assuming that account has role `admin` or `owner` and is accepting clients.

### 4) Review flow support
- Submitted Priestess Profiles still route into the existing Profile Review Queue.
- The review queue continues to open for admin/owner accounts.
- For this beta phase, make sure your own reviewing account is the one tagged with the `admin` or `owner` role in `public.profiles`.

## Files added

- `shared/rollout.js`
- `assets/queendom-scarab-sundisk.png`
- `assets/queendom-pillar-carving.png`
- `docs/BETA-ROLLOUT-PHASES.md`

## Supabase

No Supabase migration required.

## Important setup note

For your account to be the sole mentor/reviewer in this first round, confirm your profile row in `public.profiles` has:

- role = `admin` or `owner`
- `mentor_accepting_clients` = true (or null)

If another admin/owner account exists and should stay hidden, either:
- change that role away from `admin` / `owner`, or
- set `mentor_accepting_clients = false` for that profile.

## Syntax checks

Run before shipping:

```bash
node --check client/app.js
node --check flow-fm/app.js
node --check flow-fm/portal/page.js
node --check flow-fm/moons/page.js
node --check flow-fm/profile-studio/page.js
node --check shared/relationships.js
node --check shared/rollout.js
```

## First test after deploy

1. Open `/flow-fm/profile-studio/`.
2. Confirm the new scarab sun-disk artwork appears in the hero.
3. Confirm the hero edges now feel like temple pillars with carvings.
4. Sign in as a guest and open `/client/`.
5. Confirm the Clock In button is hidden / unavailable.
6. Open the mentor selection flow and confirm only the founding mentor account is visible.
7. Open `/flow-fm/` as a guest and confirm the full curriculum is shown as sealed for Phase 1 beta.
8. Open `/flow-fm/portal/?portal=1` as a guest and confirm it points the user back toward Profile Studio instead of the full curriculum.
9. Submit a Priestess Profile.
10. Sign in as the admin/owner account and confirm it appears in `/flow-fm/review/`.
