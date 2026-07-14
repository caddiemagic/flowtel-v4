# Flowtel v0.10.40 — Medicine Wheel Finalization + Complete Note History

Release date: 2026-07-14

## Summary

This release completes the second review round after v0.10.39. It replaces the accumulated Medicine Wheel styling stack with an isolated v2 presentation, restores the approved mobile seasonal-card placement, removes unwanted Suite rail stretching, dramatically quiets the Suite welcome header, finalizes the Powder Room sharing control, and ensures the Flow Map receives every append-only reflection and checkout note.

## What changed

### Medicine Wheel architecture repair

- Replaced the active wheel DOM classes with isolated `mwv2-*` classes so years of legacy `.medicine-wheel`, `.wheel-room`, `.wheel-season`, and breakpoint overrides no longer compete with the current implementation.
- Restored a larger orbit presence similar to v0.10.38.
- Increased and stabilized the rose compass center relative to the inner and outer rings.
- Calculates marker diameter from the actual available orbit width.
- Keeps all day markers square before rounding, so the markers remain true circles.
- Gives all 28 markers consistent angular spacing with usable gaps from narrow phones through desktop.
- Keeps Day 1 below West, Day 28+ above West, and the counter-clockwise room order unchanged.
- Keeps the active-day star, previous-visit actions, and Powder Room routing unchanged.

### Desktop and mobile seasonal-card layout

- Desktop Powder Room cards now sit in the four corners outside the number orbit.
- Mobile returns to the approved v0.10.38 two-by-two centered card grid.
- Mobile card order remains Winter, Spring, Summer, Autumn.
- Cards continue to use the Moon Magic phase symbols and explicit **Inner [Season] Powder Room** labels.

### Suite layout and welcome header

- Removed the old equal-height/stretch behavior that caused Cycle Data and Concierge Card pills to inherit empty height from the wheel column.
- Suite rail cards now size to their own content.
- Reduced the welcome title from hero scale to a quieter section-title scale.
- Reduced the header pill height, emblem size, subline spacing, and Queendom button footprint.
- Extended the welcome pill to align with the full two-column Suite grid.
- Added a softly differentiated blush/ivory background while preserving the dainty temple treatment.

### Powder Room sharing control

- Returned **Click here to opt out** to the same inline sentence flow as the surrounding copy.
- Removed loud uppercase/button styling from the opt-out link.
- Rebuilt the expanded control as a compact, left-aligned privacy setting.
- Keeps the checkbox immediately beside its sentence on desktop and mobile.
- Prevents checkbox text overflow and mobile wrapping distortion.
- Preserves the existing master sharing setting and save behavior.

### Complete Flow Map note history

- Added `flowtel_get_flow_map_entries` through migration 030.
- Returns every row in `flowtel_reflections` rather than selecting only the newest reflection for each stay.
- Returns checkout notes once as separate Flow Map notes.
- Preserves the stay-level reflection fallback for older stays that predate the append-only reflection table.
- Preserves self, connected-client, practitioner, admin, owner, and active-consent boundaries.
- Includes a temporary front-end fallback to the older RPC if deployment occurs before migration 030 is run.

### Note-card tags

Flow Map and Powder Room notes now show only:

- `DAY X`
- the matching Moon Magic phase, including the word **Phase**

Standard labels:

- New Moon Phase
- Half Full Moon Phase
- Full Moon Phase
- Half New Moon Phase

The Powder Room **Felt Like** tag has been removed.

## Files changed

- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `cycle-data/app.js`
- `cycle-data/index.html`
- `cycle-data/styles.css`
- `database/migration-030-flow-map-all-notes.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.40.md`
- `flow-map/app.js`
- `flow-map/index.html`
- `flow-map/styles.css`

## Supabase

Run:

`database/migration-030-flow-map-all-notes.sql`

This migration is required for the Flow Map to display every reflection saved on the same Flowtel Day. It does not change the one-stay-per-Flowtel-Day rule and does not modify or delete existing reflection history.

## JavaScript syntax checks

- `node --check client/app.js`
- `node --check flow-map/app.js`
- `node --check cycle-data/app.js`

## Responsive geometry checks

The v2 geometry was checked at orbit widths corresponding to approximately 280px, 320px, 360px, 390px, 430px, 420px desktop minimum, 450px, 490px, and 500px. At each checked width:

- the outer ring remains inside the orbit
- day markers remain circles
- adjacent marker centers remain farther apart than the marker diameter
- the mobile season grid remains independently centered below the orbit

## First test checklist

1. Run migration 030 in Supabase.
2. Open the Suite on desktop and confirm the welcome pill is dramatically shorter, quieter, full-width, and distinct from the cards below.
3. Confirm the desktop wheel has the larger orbit presence, larger compass center, round separated day markers, and four non-overlapping corner cards.
4. Confirm Cycle Data and Concierge Card no longer contain large empty vertical areas.
5. Test the Suite around 320px, 360px, 390px, and a larger phone width.
6. Confirm the mobile Powder Room cards are centered in the approved two-by-two grid.
7. Confirm no day marker becomes an oval, overlaps its neighbor, clips, or leaves the viewport.
8. Save two reflections during the same stay/day, open the Flow Map, and confirm both appear as separate notes with the same Day tag.
9. Confirm checkout notes appear once in the Flow Map.
10. Confirm Flow Map notes show only Day and Moon Magic phase tags.
11. Open each Powder Room and confirm its notes show only Day and Moon Magic phase tags, with no Felt Like tag.
12. Expand the Powder Room sharing preference on desktop and mobile and confirm the checkbox sits beside its sentence without awkward wrapping.
13. Confirm the inline opt-out link reads naturally as part of the sharing sentence.
