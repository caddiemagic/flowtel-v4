# Flowtel v0.9.12 — Powder Rooms + Suite Layout Polish

## Purpose

This release turns the anonymous seasonal reflection dashboards into Flowtel Powder Rooms and finishes two Suite polish items.

## Changes

### Powder Rooms

Seasonal Medicine Wheel cards now open seasonal Powder Rooms:

- Summer Powder Room
- Autumn Powder Room
- Winter Powder Room
- Spring Powder Room

The Powder Rooms keep the same `/cycle-data/?season=...` route, but the experience is no longer presented like a structured dashboard. The page now feels more open and collective, with anonymous reflections displayed as floating notes instead of a grid or filtered report.

### Removed from Powder Room view

- viewer toggle pills
- dashboard filters
- data snapshot panel
- structured Flow Map grid

The Powder Room still filters in the background by Actual Inner Season.

### Reflection display

Each floating note shows:

- anonymous reflection text
- moon phase
- feels-like season

Names, emails, profile IDs, mentor relationships, and room numbers are not shown.

### Suite polish

- Moved the Moon Magic pill inside the main Medicine Wheel card/container.
- The welcome-back message in the Cycle Data pill now appears only after 14+ days away.

## Database

No Supabase migration required.

## Test checklist

1. Open Suite.
2. Confirm Moon Magic appears inside the Medicine Wheel container above the wheel.
3. Click Inner Summer / Autumn / Winter / Spring cards.
4. Confirm each opens the matching Powder Room.
5. Confirm the page does not show dashboard filters or data tabs.
6. Confirm reflections appear as anonymous floating notes.
7. Confirm a guest who was away only a few days does not see the welcome-back message.
8. Confirm a guest away 14+ days does see the welcome-back message.
