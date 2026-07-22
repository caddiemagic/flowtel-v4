# Caddie Magic v0.4.6 — Quadrants, Player Profile, and Score Calculation Repair

Release date: 2026-07-21

## Correct Moon Score Map geometry

Both the private Score Map and anonymous Locker Room now use the approved cardinal layout on desktop:

- top left — North Club · Last Quarter Phase · Days 20–26;
- top right — East Club · Full Moon Phase · Days 12–19;
- bottom left — West Club · New Moon Phase · Days 27–5;
- bottom right — South Club · First Quarter Phase · Days 6–11.

Mobile follows the same reading order: North, East, West, South. Existing scores and thoughts remain attached to their stored phase and club records.

## Player Profile simplification

Removed from the Player Profile summary:

- Latest Score;
- Moon Data;
- Latest Swing Thought;
- the rounds logged, best score, and average score line that lived inside that swing-thought card.

The Player Profile still includes assignments, private messages, Upcoming Golf, Caddie Network state, Locker Room sharing, and established profile information.

## Top action pill simplification

The top action area now keeps only:

- **Log a Round**;
- **Score Map**.

The duplicate **Locker Room**, **Caddie Compass**, and **Find a Caddie** buttons were removed from this top pill only. Those features and their data remain available in their established portal sections.

## Swing Thoughts copy

The round-entry placeholder now reads:

**What went well? What went wrong? What did you notice?**

The date field remains hidden when the player chooses the swing-thought-only entry mode, and existing entries remain unchanged.

## Moon Score Data simplification

Removed:

- Last New Moon / Cycle Day 1;
- simultaneous Next New Moon and Next Full Moon cards.

The dashboard now shows only the nearest upcoming major Moon:

- **Next Full Moon** when it occurs first; or
- **Next New Moon** when it occurs first.

Moon Day, Moon Phase, club, and theme remain visible.

## Score calculation repair

Average Score and Best Score now use only actual positive numeric golf scores.

Excluded values include:

- blank values;
- null or missing scores;
- swing-thought-only entries;
- placeholder or invalid values;
- zero.

For scores 74, 90, and 67, the result is:

- Average Score — 77;
- Best Score — 67.

The shared calculation helper is used by both the player portal and Score Map to prevent the two surfaces from drifting apart.

## Database

No new Caddie Magic table or Caddie-specific migration is required. The combined Flowtel release includes migration 052 for Flowtel features only.

Existing migrations 030, 040, 041, 042, 043, 044, and 045 remain preserved. Invitation-code hotfix migration 045 must remain installed.

## Access preservation

This release does not change:

- Player-Only Access;
- private beta invitations;
- access registry boundaries;
- score or swing-thought history;
- Caddie relationships;
- Compass assignments or dispatches;
- Upcoming Golf records;
- anonymous Locker Room sharing preferences;
- exact-event versus phase-span Moon language.

## First test checklist

1. Hard refresh the Caddie Magic portal and confirm the version badge says v0.4.6.
2. Confirm the top action pill contains only **Log a Round** and **Score Map** on desktop and mobile.
3. Confirm Latest Score, Moon Data, and Latest Swing Thought are absent from Player Profile.
4. Open Score Map and confirm North/East/West/South occupy the approved quadrants.
5. Open Locker Room and confirm the same quadrant geometry.
6. Confirm scores, thoughts, and dates still appear under their correct clubs.
7. Log a round and confirm the new Swing Thoughts placeholder.
8. Log a swing-thought-only entry and confirm it does not count as score zero.
9. Use a test set containing 74, 90, 67, and thought-only entries; confirm Average 77 and Best 67.
10. Confirm Moon Score Data displays only the next relevant Full or New Moon.
11. Confirm Player-Only accounts remain blocked from Flowtel member data.
