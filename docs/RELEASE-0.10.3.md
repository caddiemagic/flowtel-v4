## Flowtel v0.10.3 — Flow FM Access Gate Repair

### Summary
This is a small repair release for the Flow FM hallway. v0.10.2 successfully separated Flow FM into rooms, but some legitimate Flow FM/practitioner accounts could still see the hallway without seeing the assignment or Priestess Profile forms.

### What changed
- Broadened the front-end Flow FM access check so authenticated users with a profile row can see their own forms.
- Added `mentor`, `manager`, and `concierge` as recognized practitioner-facing roles in the Flow FM UI gate.
- Preserved read-only mode when a mentor/admin is viewing another member through the consent layer.
- Added migration 024 to broaden the Supabase RPC used by assignment/profile save actions.
- Kept Review Desk access separate; review queues are still mentor/admin/practitioner-facing.

### Files changed
- `flow-fm/ui.js`
- `database/migration-024-flow-fm-access-gate-repair.sql`
- `docs/RELEASE-0.10.3.md`
- `docs/CHANGELOG.md`

### Migration required
Run:

`database/migration-024-flow-fm-access-gate-repair.sql`

### Testing checklist
1. Run migration 024 in Supabase.
2. Sign in as Megan / owner / practitioner.
3. Open `/flow-fm/assignments/`.
4. Confirm assignment forms show with Save Draft and Send to be Witnessed.
5. Open `/flow-fm/profile-studio/`.
6. Confirm the Priestess Profile form shows.
7. Save a draft assignment.
8. Save a Priestess Profile draft.
9. Open `/flow-fm/review/` as mentor/admin and confirm the desk still loads.

### Known limitations
- This release does not change Squarespace video/content wiring.
- This release does not add a public Queendom doorway.
- Users still need a matching `profiles` row for save/submit RPCs to work.
