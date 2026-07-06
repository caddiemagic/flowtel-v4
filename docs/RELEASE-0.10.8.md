# Flowtel v0.10.8 — Initiation Hall Simplification

## Release type
Flow FM experience edit, navigation simplification, visual hierarchy polish, and admin review boundary.

## What changed

- Simplified `/flow-fm/` into the primary student home instead of making the user choose between Initiation Hall and Moon Portal.
- Reduced oversized Flow FM headers and made the student experience calmer and easier to scan.
- Added a Concierge-style moon progress tracker to the Flow FM home page.
- Added three clear next-step cards:
  - Open Current Womb Work
  - Open Current Business Assignment
  - Explore Upcoming Initiations
- Kept all moon doors open for exploration while making the current moon obvious.
- Removed the redundant support-room grid from the main hall.
- Reduced top navigation to:
  - Initiation Hall
  - Planning Room
  - Return to Suite
- Simplified the 13 Moons page into a quiet exploration page and removed the Current Initiation / Start Rule panels.
- Softened the Moon Portal page so it functions as the current initiation chamber without competing with the main hall.
- Restricted the Flow FM Review Desk to admin/owner accounts on the front end.
- Added migration 026 to restrict Flow FM review queue access and review actions to admin/owner accounts at the database/RPC layer.

## Files changed

- `flow-fm/index.html`
- `flow-fm/app.js`
- `flow-fm/styles.css`
- `flow-fm/ui.js`
- `flow-fm/moons/index.html`
- `flow-fm/moons/page.js`
- `flow-fm/portal/index.html`
- `flow-fm/portal/page.js`
- `flow-fm/review/page.js`
- `database/migration-026-flow-fm-admin-review-desk.sql`
- `docs/RELEASE-0.10.8.md`
- `docs/CHANGELOG.md`

## Migration required

Run this Supabase migration:

`database/migration-026-flow-fm-admin-review-desk.sql`

## Testing checklist

1. Open `/flow-fm/` and confirm the page feels quieter and has only one primary orientation flow.
2. Confirm the progress tracker appears below the current moon copy.
3. Confirm the three current-action buttons are visible:
   - Open Current Womb Work
   - Open Current Business Assignment
   - Explore Upcoming Initiations
4. Confirm the 13 moon doors still appear in the user’s personalized order.
5. Open `/flow-fm/moons/` and confirm the Current Initiation / Start Rule panels are gone.
6. Open `/flow-fm/portal/` and confirm it feels like a supporting initiation chamber, not a duplicate home page.
7. Sign in as a practitioner and confirm Review Desk is not available as a normal navigation option.
8. Sign in as admin/owner and confirm `/flow-fm/review/` opens the Review Desk.
9. Run migration 026 and confirm non-admin review actions are rejected by the database.

## Known limitations

- The moon-entry threshold still uses the current working date rule instead of a full stored annual moon calendar engine.
- Womb Work videos remain Squarespace placeholders.
- The Profile Studio design has not been redesigned yet; this release focuses on reducing overwhelm and clarifying the Flow FM path.
