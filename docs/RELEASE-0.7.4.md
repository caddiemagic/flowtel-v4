# Flowtel Release 0.7.4 — Stay Logic and Hospitality Polish

## Guest Suite
- Changed the Suite action from “Return to Lobby” to “Check Out.”
- The Check Out action opens the Lounge checkout card directly.
- Returning to Suite now scrolls to the top of the Suite instead of restoring mid-page scroll.

## Lounge
- Simplified the lounge content card to “Video content coming soon.”
- After personal checkout, the checkout card changes to “Checked Out.”
- The checkout button and extra checkout copy are removed after checkout.
- Checkout notes remain visible inside the checked-out card.

## Concierge Notes
- Read notes now display “Concierge has cleansed your space.”
- Read note copy now says “Your love notes are saved in this stay.”
- Removed the “Latest note from...” line.
- Concierge notes are attributed as “From [practitioner name].”
- Mark-as-read state can now be persisted with `concierge_notes_read_signature`.

## Stay Logic
- The app now uses the local calendar date instead of UTC for daily stay logic.
- New stay creation now respects one stay per local calendar day.
- Existing same-day stays are returned instead of being recreated or reopened.

## Wheel / Tracker polish
- Extended wheel card padding so season cards fit inside the visual container.
- Adjusted mobile wheel ring sizing and spacing.
- Removed the Back button after reaching My Cycle Data.
- Increased tracker dashboard width to better match the main Flowtel layout.

## Database
Run:

```sql
database/migration-009-stay-logic-hospitality-polish.sql
```
