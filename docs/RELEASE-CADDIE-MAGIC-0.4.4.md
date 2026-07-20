# Caddie Magic v0.4.4 — Verified Portal Update + Mobile Route Repair

## Source of truth

Built from `flowtel-v4(38).zip`, preserving the newer Flowtel v0.10.56 files and migrations already present in that integrated project.

## Release repairs

### Mobile Compass route

- Added explicit Vercel rewrites for all Caddie Magic nested pages.
- Added beta no-cache headers for Caddie Magic and manager surfaces.
- Updated every changed Caddie Magic HTML / JavaScript cache key to v0.4.4.
- Fixed the Player Profile runtime path that could call an undefined `formatDateTime()` after Messages existed.

### Requested update set

- Removed the Score Map Exercise download button.
- Pattern Insights now begin after a 28-day entry window and encourage daily tracking.
- Exact astronomical events use **New Moon**, **First Quarter Moon**, **Full Moon**, or **Last Quarter Moon**.
- All non-event dates retain **New Moon Phase**, **First Quarter Phase**, **Full Moon Phase**, or **Last Quarter Phase**.
- The owner calendar starts on New Moon, uses the 13 Moons curriculum name, and displays `MON 00` dates plus exact lunar-event badges.
- Concierge Desk players with waiting messages now have a direct **Reply to Message** action.
- Messages remain unavailable until the player submits the Caddie Compass.
- Player Profile now previews Assignments, Messages, and Calendar with direct links.
- Moon Phase snapshot displays the matching cardinal club and selected club name.
- Score Map mobile controls now mirror the Locker Room segmented controls.
- Corrected the labeled / unlabeled wooden-wheel asset placement.

## Supabase

No new migration is required.

## Validation

Run:

`node scripts/validate-caddie-magic.mjs`

JavaScript syntax checks cover the changed Caddie Magic, manager, and shared lunar-calendar modules.

## First test checklist

1. Deploy the complete project or all patch files, including `vercel.json`.
2. Open `/caddie-magic/compass/` in mobile Safari and confirm the HTML page opens rather than a JSON response.
3. Confirm every visible version badge reads v0.4.4.
4. Confirm the Player Profile shows Assignments, Messages, and Calendar cards.
5. Confirm Messages is disabled before Compass submission and opens after submission.
6. Send a player message, open Concierge Desk → Caddie Compass, and choose **Reply to Message**.
7. Confirm the admin page scrolls directly to Messages.
8. Open Score Map and confirm the Exercise button is gone.
9. Confirm Pattern Insights shows the 28-day tracking window.
10. Compare Score Map and Locker Room segmented controls on mobile.
11. Confirm the direction-labeled wheel is used on Moon Score Data and the unlabeled wheel is used in map centers.
12. Add a multi-day golf event crossing an exact lunar event and confirm only the exact date says **Moon** while surrounding dates say **Phase**.
13. Open Concierge Desk → Upcoming Golf and confirm the view begins on New Moon, uses the curriculum moon name, and displays `MON 00` dates.
