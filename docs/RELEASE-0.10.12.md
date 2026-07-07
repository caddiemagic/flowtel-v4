# Flowtel v0.10.12 — Temple Door Grandeur + Royal Queendom Facelift

Follow-up design polish release built from the shipped v0.10.11 project. This release turns up the luxury styling for the Initiation Hall doors and the Profile Studio / Your Queendom hero without changing the underlying Flowtel logic.

## What changed

- Reframed the Initiation Hall hero around a winged scarab / sun-disk crest with richer Egyptian temple styling.
- Kept the rose-gold wax seal on the Initiation Hall while giving the overall hero a more ceremonial, coronation-hall feeling.
- Restyled the 13 moon door cards into taller, more extravagant golden temple doors with stronger arch structure, glow, and hover lift.
- Upgraded the Support Rooms cards so they visually match the more luxurious temple direction.
- Redesigned the Your Queendom hero with a more royal, Egyptian feel using a winged crest, softer architectural framing, and elevated copy styling.
- Elevated the Profile Studio preview card and form containers so the page feels more regal and emotionally meaningful.

## Supabase

No Supabase migration required.

## Syntax checks

Run before shipping:

```bash
node --check flow-fm/app.js
node --check flow-fm/profile-studio/page.js
```

## First test after deploy

1. Open `/flow-fm/`.
2. Confirm the Initiation Hall hero now shows the winged scarab / sun-disk crest and still keeps the wax seal.
3. Confirm the 13 moon preview reads as extravagant golden temple doors instead of simple cards.
4. Confirm door hover states feel more luxurious and the Support Rooms cards match the new tone.
5. Open `/flow-fm/profile-studio/`.
6. Confirm the Your Queendom header feels more royal, Egyptian, and ceremonial.
7. Confirm the Priestess Profile preview card feels more luxurious.
8. Confirm profile draft / submission dirty-state behavior still works exactly as before.
9. Confirm no timezone, review queue, or database logic changed.
