# Flowtel v0.10.27 — Moon Widget Queendom Variant

## Summary

This release adds a second Moon Magic widget variant for the free moon calendar while preserving the existing Queendom member widget.

## Changed

- Kept `/moon-widget/` as the existing Queendom/member widget that routes into the Smart Flowtel Entry page.
- Added `/moon-widget-join-queendom/` for public/free moon calendar pages.
- The new public widget uses the same Moon Magic styling and live moon calculation, but its CTA says **Join the Queendom to Enter the Flowtel**.
- The public widget points to `https://www.theidyllcollective.com/queendomhome`.
- Updated the footer line on both widget versions to **It’s always sunny on the moon.**
- Added the Vercel rewrite for `/moon-widget-join-queendom`.

## Supabase

No Supabase migration required.

## Testing

1. Open `/moon-widget/` and confirm the CTA still says **Enter the Flowtel**.
2. Open `/moon-widget-join-queendom/` and confirm the CTA says **Join the Queendom to Enter the Flowtel**.
3. Confirm both widgets show **It’s always sunny on the moon.** at the bottom.
4. Confirm `/moon-widget/` routes to `/enter/?membership=queendom`.
5. Confirm `/moon-widget-join-queendom/` routes to `https://www.theidyllcollective.com/queendomhome`.
