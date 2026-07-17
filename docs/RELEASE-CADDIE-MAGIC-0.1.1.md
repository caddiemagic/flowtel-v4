# Caddie Magic v0.1.1 — Cycle Tracker-Inspired Cosmetic Refinement

Cosmetic refinement release for the Caddie Magic Moon Score Tracker.

## Purpose

The first Caddie Magic screen was functioning, but visually it felt too loud and oversized for the desired luxury tracker experience. This release brings the design closer to the Flowtel public Cycle Tracker while keeping Caddie Magic's masculine palette and brand direction.

## What changed

- Restyled `/caddie-magic/` around a lighter, card-based tracker shell inspired by the Cycle Tracker.
- Shifted the palette into:
  - navy blue
  - deep hunter green
  - antique gold
  - cream / parchment
- Reduced the hero title scale and overall typography weight.
- Added the existing scarab/sun-disk image to the top of the Caddie Magic hero.
- Replaced the heavy dark dashboard feeling with a softer private-club tracker mood.
- Preserved all existing Caddie Magic behavior:
  - player account entry
  - Player Locker profile
  - Round Log form
  - score and swing-thought storage
  - moon phase and moon day auto-tagging
  - Moon Scorecard / Score Flow Map
  - Notes Under the Door placeholder

## Supabase

No Supabase migration required.

## JS syntax checks

No JavaScript files changed in this release.

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the page visually resembles the Cycle Tracker structure.
3. Confirm the palette is navy, deep hunter green, cream, and gold.
4. Confirm the scarab mark appears at the top of the tracker hero.
5. Confirm the hero title is smaller and quieter than v0.1.0.
6. Sign in or create a test player.
7. Confirm the Player Locker, Round Log, Moon Scorecard, and round history still work.
