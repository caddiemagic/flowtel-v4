## Flowtel v0.10.4 — Profile Studio Render Repair

### Summary
This release repairs Flow FM subpage asset loading so the Priestess Profile Studio and Business Assignment forms render reliably from clean URLs with or without trailing slashes.

### What changed
- Converted Flow FM subpage stylesheet and script references to absolute paths.
- Converted Flow FM subpage JavaScript imports to absolute module paths.
- Converted Planning Room calendar links to absolute paths.
- Added small loading placeholders inside the Priestess Profile Studio and assignment list so blank rounded containers are no longer the fallback state if JavaScript is delayed or blocked.
- Preserved v0.10.2 hallway structure and v0.10.3 access-gate repair logic.

### Files changed
- `flow-fm/index.html`
- `flow-fm/app.js`
- `flow-fm/styles.css`
- `flow-fm/assignments/index.html`
- `flow-fm/assignments/page.js`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/review/index.html`
- `flow-fm/review/page.js`
- `flow-fm/moons/index.html`
- `flow-fm/moons/page.js`
- `flow-fm/womb-work/index.html`
- `flow-fm/womb-work/page.js`
- `flow-fm/planning-room/index.html`
- `flow-fm/planning-room/page.js`
- `shared/moon-calendars.js`

### Supabase
No Supabase migration required.

### Testing checklist
1. Open `/flow-fm/profile-studio/` and confirm the top navigation appears.
2. Confirm the Priestess Profile intake form appears with labels and buttons.
3. Open `/flow-fm/profile-studio` without the trailing slash and confirm the same behavior.
4. Open `/flow-fm/assignments/` and confirm assignment forms appear.
5. Save a profile draft and an assignment draft.

### Known limitations
This does not change the underlying Priestess Profile database model or Squarespace media integration. It only repairs front-end rendering and asset/module path reliability.
