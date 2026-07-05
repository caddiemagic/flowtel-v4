# Flowtel v0.9.13 — Powder Room Mirror Polish

## Purpose

This release refines the Powder Room presentation and finishes a small Moon Magic layout polish item.

## Changes

### Powder Room polish

- Powder Room hero banners are slightly smaller so the mirror/notes area has more visual presence.
- Powder Room titles now render as:
  - Summer POWDER ROOM
  - Autumn POWDER ROOM
  - Winter POWDER ROOM
  - Spring POWDER ROOM
- The entry heading now says **Notes left on the mirror**.
- Removed the anonymous note count from the Powder Room heading.
- Preserved the open floating-note layout and anonymous reflection display.

### Moon Magic polish

- The Next New Moon date now drops to its own line underneath the Moon Magic phase theme.
- Moon Magic remains inside the main Medicine Wheel container.

## Database

No Supabase migration required.

## Test checklist

1. Open Suite.
2. Confirm Moon Magic is still inside the Medicine Wheel container.
3. Confirm the Moon Magic theme appears above the Next New Moon line.
4. Click each seasonal card.
5. Confirm the page title uses the seasonal name plus **POWDER ROOM** in caps.
6. Confirm the heading says **Notes left on the mirror**.
7. Confirm the anonymous note count is not displayed.
8. Confirm floating reflection notes still display correctly.
