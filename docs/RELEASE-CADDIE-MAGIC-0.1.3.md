# Caddie Magic v0.1.3 — Dazzled Cream Pills + Ship Wheel Refinement

Visual refinement release for the Caddie Magic locker and Moon Score Map.

## Purpose

This release keeps the moody navy Caddie Magic backdrop, but lightens the interior experience so the interface feels more elegant, daintier, and a little more dazzled. It also introduces the requested ship-wheel interpretation of the medicine wheel while preserving the existing 28-day number ring.

## What changed

- Brightened the Caddie Magic UI by shifting card / pill surfaces to `#f7f6f1`.
- Introduced the requested green accent tone `#355e36` across primary actions and highlights.
- Reduced button bulk across the Caddie Magic experience for a daintier, more elegant feel.
- Updated the hero secondary action from **Open Your Locker** to **Open Score Map**.
- Reworked the moon wheel center into a wooden ship-wheel treatment.
- Preserved the existing 28-position day / number ring design.
- Added the gold rose compass into the center of the medicine / ship wheel.
- Renamed **Notes Under the Door** to **Caddie Notes**.
- Updated the empty-state copy to: *"No notes have been left from your Caddie yet, keep logging rounds."*
- Renamed the Round Log eyebrow from **Log a Round** to **MOOD SWINGS**.
- Brought the lighter cream / gold / green polish into `/caddie-magic/score-map/` and the printable Score Map exercise.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the page still has the dark navy backdrop.
3. Confirm the interior cards / pills now use the lighter `#f7f6f1` treatment.
4. Confirm primary buttons use the green accent and feel visually lighter / daintier.
5. Confirm the hero buttons read **Log a Round** and **Open Score Map**.
6. Confirm the moon wheel still has the same 28-day number ring.
7. Confirm the moon wheel center now resembles a wooden ship wheel with the gold rose compass in the middle.
8. Confirm the Round Log eyebrow reads **MOOD SWINGS**.
9. Confirm the locker note section reads **CADDIE NOTES**.
10. Confirm the empty-state copy reads exactly: *"No notes have been left from your Caddie yet, keep logging rounds."*
11. Open `/caddie-magic/score-map/` and confirm the lighter styling carries through.
12. Open `/caddie-magic/score-map/printable/` and confirm the printable exercise still renders cleanly.
