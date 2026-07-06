## Flowtel v0.10.5 — Profile Studio Loader Repair

### Summary
This release repairs the Flow FM subpage loader issue that left the Priestess Profile Studio stuck on loading placeholders.

### What changed
- Fixed the invalid `csvToPills` regular expression in `flow-fm/ui.js` that prevented Flow FM subpage JavaScript from loading.
- Converted Flow FM subpage CSS and script URLs to absolute `/flow-fm/...` paths for clean URL stability.
- Converted Flow FM subpage module imports to absolute paths so nested pages load consistently in Vercel/Squarespace clean routing.
- Converted Planning Room calendar asset paths to absolute `/flow-fm/assets/planning/...` paths.
- Preserved the hallway structure, assignment tracker, profile studio, planning room, and review desk.

### Supabase
No Supabase migration required.

### Testing checklist
1. Open `/flow-fm/profile-studio/`.
2. Confirm the top nav renders.
3. Confirm the full Priestess Profile form replaces the loading placeholders.
4. Click Refresh Preview.
5. Save one Profile Draft.
6. Open `/flow-fm/assignments/` and confirm assignment forms render.
7. Open `/flow-fm/planning-room/` and confirm calendar PDF links open.

### Known limitations
- Real Squarespace video embedding and media upload handling remain deferred.
- The moon initiation full-moon threshold is still a first-pass working rule until annual moon-calendar data is stored in-app.
