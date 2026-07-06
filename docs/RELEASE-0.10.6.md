# Flowtel v0.10.6 — Womb Work Room + Practitioner Polish

## Release type
Flow FM stabilization, Womb Work module expansion, Review Desk resilience, and UI polish for practitioner/reflection/Powder Room areas.

## What changed

### Flow FM / Initiation Hall
- Expanded the Womb Work Modules room with an interactive module detail panel.
- Added module-level practice prompts, reflection prompts, business assignment pairings, and future Squarespace lesson placeholders.
- Stabilized the Review Desk so assignment and Priestess Profile queues load independently with clearer error copy.
- Broadened Review Desk role recognition in the front-end helper to include practitioner/mentor/admin/owner/manager/concierge roles.

### Supabase
- Added `database/migration-025-review-desk-stabilization.sql`.
- Migration 025 adds `flow_fm_current_user_can_review()` and replaces the review queue RPCs so signed-in non-review users receive empty queues instead of generic failures.
- Mentor consent boundaries are still preserved for non-admin review visibility.

### Concierge Desk
- Moved the `INITIATION HALL` pill into the right side of the Concierge Desk hero panel.
- Kept the existing label and coursework clock-in behavior.

### Reflection / Powder Room sharing
- Fixed the expanded Powder Room Sharing pill so copy wraps inside the Reflection card.
- Added a `Done` collapse action so the user can return to the softer inline sharing message.

### Suite layout / Mentor card
- Returned the bottom Suite buttons to a two-button layout.
- Reduced Mentor to the Moon card vertical spacing.
- Changed connected mentor state from a disabled `Mentor Connected` button into an `Open Mentor Panel` action.
- Added a guest-facing Mentor Panel foundation for upcoming calls, notes exchanged, and future between-call mentor reflections.

### Powder Room
- Restyled Powder Room season-switching links and return links as Flowtel pill/buttons.
- Added spacing so `Return to Suite` and `Return to Concierge` no longer run together.

## Files changed
- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `manager/index.html`
- `manager/styles.css`
- `cycle-data/index.html`
- `cycle-data/app.js`
- `cycle-data/styles.css`
- `flow-fm/review/page.js`
- `flow-fm/ui.js`
- `flow-fm/womb-work/index.html`
- `flow-fm/womb-work/page.js`
- `flow-fm/styles.css`
- `shared/womb-work.js`
- `database/migration-025-review-desk-stabilization.sql`
- `docs/RELEASE-0.10.6.md`
- `docs/CHANGELOG.md`

## Migration required
Run:

`database/migration-025-review-desk-stabilization.sql`

## Testing checklist
1. Run migration 025 in Supabase.
2. Open `/flow-fm/review/` as a practitioner/admin and confirm one queue can load even if the other has an issue.
3. Submit a profile and confirm the Profile Review Queue can display it.
4. Open `/flow-fm/womb-work/` and test the `Open Module` buttons.
5. Open `/manager/` and confirm `INITIATION HALL` appears in the right side of the Concierge Desk hero panel.
6. Open Suite Reflection, expand Powder Room sharing, confirm text wraps, and click `Done` to collapse.
7. Confirm bottom Suite buttons show as two aligned buttons.
8. Confirm connected mentor state says `Open Mentor Panel` and opens the panel.
9. Open a Powder Room and confirm room-switching/return links use Flowtel pill styling.

## Known limitations
- Mentor Panel is a front-end foundation only; upcoming calls and mentor reflections are not yet backed by a database table.
- Womb Work module video links remain placeholders until Squarespace lesson URLs are provided.
- Review actions still require existing mentor/admin consent rules.
