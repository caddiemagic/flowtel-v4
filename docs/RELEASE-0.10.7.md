## Flowtel v0.10.7 — Moon Portal Experience + Hall Facelift

### Summary
This release makes the Moon Portal the primary Flow FM experience. Instead of sending practitioners to separate places for Womb Work and Business Assignments, each personalized moon portal now gathers the moon initiation, the paired Womb Work module, and the paired Business Assignment in one room.

### What changed
- Added `/flow-fm/portal/` as the primary Moon Portal experience.
- Updated the Initiation Hall with a more Flowtel-branded visual facelift and a clearer “You Are Here” panel.
- Added a current Womb Work card, current Business Assignment card, and current Moon Portal doorway on the Hallway page.
- Added a personalized 13-moon portal library that rotates around the practitioner’s entry moon.
- Updated the 13 Moons Path page so the displayed order reflects the user’s unique initiation path instead of always beginning in November.
- Preserved library/archive rooms for Womb Work Modules and Business Assignments while making the Moon Portal the main curriculum flow.
- Added a Moon Portal business-assignment form for assignments 2–13.
- Kept Assignment 1 routed through Priestess Profile Studio so users do not have to submit the same profile twice.
- Updated Flow Map density handling so the map expands after notes reach a minimum readable size instead of squeezing notes into a fixed chart.
- Improved desktop Flow Map row height, axis placement, quadrant note fields, and mobile seasonal stacking.

### Product notes
The Moon Portal should now feel like the intuitive “one room for this moon” experience:
- Moon Initiation
- Womb Work Module
- Business Assignment
- Training placeholder
- Practice prompt
- Reflection prompt
- Submission / next doorway

Practitioners can still explore ahead. The product should orient them to the current moon without locking the rest of the spiral.

### Supabase migration
No Supabase migration required.

### Files changed
- `flow-fm/index.html`
- `flow-fm/app.js`
- `flow-fm/styles.css`
- `flow-fm/ui.js`
- `flow-fm/portal/index.html`
- `flow-fm/portal/page.js`
- `flow-fm/moons/page.js`
- `flow-map/app.js`
- `flow-map/index.html`
- `flow-map/styles.css`
- `shared/initiation.js`
- `shared/flowtel.js`
- `vercel.json`
- `docs/RELEASE-0.10.7.md`
- `docs/CHANGELOG.md`

### Testing checklist
1. Open `/flow-fm/` and confirm the Hallway shows a “You Are Here” panel.
2. Click **Open Current Moon Portal**.
3. Confirm the Moon Portal shows Moon Initiation, Womb Work Module, and Business Assignment together.
4. Open several portals from the portal library and confirm users can explore ahead.
5. Open `/flow-fm/moons/` and confirm the 13 Moons order rotates according to the profile entry moon.
6. Open `/flow-map/` with a cycle containing 3+ notes in one quadrant and confirm the map expands rather than cutting through notes.
7. Test mobile Flow Map and confirm the seasonal sections stack Winter, Spring, Summer, Autumn without cross-axis crowding.

### Known limitations
- Full moon threshold logic is still a first-pass working threshold, not a full annual moon-calendar engine.
- Squarespace video/content links are still placeholders.
- Assignment 1/Profile Studio status sync is clarified in the UI, but not yet automated by database trigger.
