# Flowtel v0.10.10 — Temple Door Restoration + Portal Cleanup

## Release theme
Restore the visual doorway metaphor while reducing redundancy in the Moon Portal experience and repairing the Priestess Profile Studio renderer so the form appears before any async save/profile connection can block it.

## What changed

- Restored **The Doors Ahead** on the Initiation Hall as a simple 13-door preview, separate from the larger Moon Portal Library / 13 Moons Path page.
- Restyled the Initiation Hall moon preview cards into compact temple-door cards with gold trim, arch shapes, current/open/return states, and less crowded text.
- Removed the duplicated **Explore the Spiral / All Moon Portals Are Open** section from the individual Moon Portal page so **Open Current Moon Portal** leads to a focused portal page.
- Updated the Moon Portal page orientation heading from “You are walking…” language to the moon name itself, such as **Dragon Moon**.
- Kept the full 13-moon exploration available through the Initiation Hall and `/flow-fm/moons/`.
- Cleaned up the full 13 Moons Path date display so New Moon and Full Moon dates sit in tidy date pills instead of cramped vertical text.
- Repaired the Priestess Profile Studio loader by rendering the simplified profile form immediately, before Supabase/profile imports finish.
- Added a static fallback top navigation on the Priestess Profile Studio page so navigation appears even if the page JavaScript/save connection has a problem.

## Migration required

No Supabase migration required.

## Files changed

- `flow-fm/index.html`
- `flow-fm/app.js`
- `flow-fm/styles.css`
- `flow-fm/portal/index.html`
- `flow-fm/portal/page.js`
- `flow-fm/moons/index.html`
- `flow-fm/moons/page.js`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `docs/RELEASE-0.10.10.md`
- `docs/CHANGELOG.md`

## Testing checklist

1. Open `/flow-fm/` and confirm **The Doors Ahead** appears as compact temple-door cards.
2. Click **Open Current Moon Portal** and confirm the page does not show the 13-door library at the bottom.
3. Confirm the Moon Portal orientation card says the moon name, such as **Dragon Moon**, instead of “You are walking Dragon Moon.”
4. Open `/flow-fm/moons/` and confirm New Moon / Full Moon dates are readable and not stacked on top of each other.
5. Open `/flow-fm/profile-studio/` and confirm the top navigation appears.
6. Confirm the Profile Studio form renders instead of staying stuck on “Loading the Priestess Profile form...”
7. Confirm **Refresh Preview** works even before save/profile data finishes loading.

## Known limitations

- The temple-door treatment is CSS-based and intentionally lightweight. It restores the metaphor now without adding image assets.
- The Profile Studio form now stays visible if the Supabase save connection fails, but saving still requires the existing profile RPCs and authenticated user state.
