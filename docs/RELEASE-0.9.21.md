# Flowtel v0.9.21 — Suite Spacing + Cycle Tracker Facelift

## Summary

This release tightens Suite spacing, clarifies conversational cycle language, polishes the public Cycle Tracker, and adds a printable/downloadable Cycle Data snapshot.

## Included

- Tightened extra vertical space in the Suite Cycle Data card.
- Tightened extra vertical space in the Today's Room card.
- Tightened extra vertical space in the Reflection card.
- Moved the Mentor to the Moon card below Reflection.
- Made the Mentor to the Moon card more compact.
- Adjusted Moon Magic inside the Medicine Wheel card so it sits cleanly toward the top of its pill.
- Kept Suite left/right cards full-width and visually aligned.
- Changed Check-In feels-like choices to Winter, Spring, Summer, and Fall while preserving stored inner-season values.
- Updated Suite sentence language to use lowercase day/season phrasing and direct feels-like season names.
- Added the “That’s so _season_ of you.” line when a guest records an off cycle day and chooses a feels-like season that does not match their actual inner season.
- Updated Cycle Data pill label font to match other Flowtel pill labels.
- Updated checkout-complete copy to “Same time tomorrow?”
- Updated Cycle Tracker hero copy to “Track your cycle data using the Flowtel Framework.”
- Gave the public Cycle Tracker lobby a more polished Flowtel-style layout.
- Removed the extra middle-container feeling from the Cycle Tracker result screen.
- Adjusted the Cycle Tracker medicine wheel ring proportions and enlarged the center rose compass.
- Moved moon phase day ranges below the moon phase/season labels.
- Added a Download / Save PDF print path for Cycle Tracker results with a clean print stylesheet.

## Database

No Supabase migration required.

## QA

- Check in with an incorrect recorded day and a mismatched feels-like season.
- Confirm the Suite line says: “You’re on day X but today feels like winter. You recorded day Y. That’s so _winter_ of you.”
- Confirm the Mentor to the Moon card appears below the Reflection card.
- Confirm the Cycle Data and Today’s Room cards are compact and aligned.
- Open the public Cycle Tracker and confirm the lobby feels more like Flowtel.
- Generate Cycle Data from the tracker and use Download / Save PDF.
