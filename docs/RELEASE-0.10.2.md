## Flowtel v0.10.2 — Flow FM Hallway + Planning Room

### Summary
This release reorganizes Flow FM into quieter, separate rooms so the Initiation Hall no longer carries every assignment, module, review queue, and planning tool on one page.

### What shipped
- Reframed `/flow-fm/` as the **Initiation Hallway** with door cards linking into separate rooms.
- Added dedicated pages for:
  - `/flow-fm/moons/` — 13 Moons Path
  - `/flow-fm/womb-work/` — Womb Work Modules
  - `/flow-fm/assignments/` — Business Assignments
  - `/flow-fm/profile-studio/` — Priestess Profile Studio
  - `/flow-fm/planning-room/` — Planning Room
  - `/flow-fm/review/` — Mentor / Admin Review Desk
- Preserved the existing assignment tracker and Priestess Profile RPC wiring while moving the student experience into cleaner rooms.
- Added a dedicated **Planning Room** with printable moon-calendar examples, a phase key, portal-open/portal-close explanation, and weekly prompts.
- Added `shared/womb-work.js` and `shared/moon-calendars.js` so the inner curriculum and planning-room content have canonical source files.
- Added more fault-tolerant page loading so one failed RPC no longer forces the entire Flow FM experience back into a generic preview page.
- Added access-state diagnostics so it is easier to see what Flowtel thinks the current profile role, membership, practitioner level, and Flow FM start date are.

### Moon-start logic
This release adds a first-pass moon-entry helper that honors the rule:
- before the full-moon threshold → begin on the current named moon
- after the threshold → begin on the next named moon

For now the threshold is modeled with a configurable working day in code, which is enough to support the hallway logic and copy. A future release can upgrade this into calendar-accurate per-cycle thresholds if/when full annual moon-calendar data is stored in-app.

### No Supabase migration required
This release is front-end / routing / content-structure work only.

### Key files
- `flow-fm/index.html`
- `flow-fm/app.js`
- `flow-fm/styles.css`
- `flow-fm/ui.js`
- `flow-fm/moons/*`
- `flow-fm/womb-work/*`
- `flow-fm/assignments/*`
- `flow-fm/profile-studio/*`
- `flow-fm/planning-room/*`
- `flow-fm/review/*`
- `shared/initiation.js`
- `shared/womb-work.js`
- `shared/moon-calendars.js`
- `shared/flowtel.js`
- `vercel.json`
