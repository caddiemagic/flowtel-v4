# Caddie Magic v0.4.0 — Compass Polish + Upcoming Golf Forecast

## Purpose

This release implements the July 19, 2026 Caddie Magic Portal Update Report across the Scorecard, Moon Score Data, Player Profile, Caddie Compass, Locker Room, Score Map, and Concierge Desk. It also introduces the first Upcoming Golf schedule with daily moon forecasts.

## What changed

### Caddie Compass polish

- Removed the Compass hero subtitle.
- Changed **The NEWS Method** to **Your Caddie Compass**.
- Simplified the selection copy to: **Your instinctive selection sets the directions.**
- Opened the compass layout by moving the cardinal club cards farther from the wheel.
- Removed the center Putter overlay so the wheel artwork remains visible.
- Preserved Putter as the Center Staff in a separate summary beneath the wheel.
- Replaced Club 1–4 labels on the mapped cards with their moon phases:
  - North — Last Quarter
  - East — Full Moon
  - West — New Moon
  - South — First Quarter
- Renamed **Current Initiation** to **Homework**.
- Changed the heading to **Your personalized assignments.**
- Renamed **Caddie Dispatches** to **The Caddie Shack**.
- Removed the message dropdown from player and admin messaging; both now use a single message field.

### Upcoming Golf + moon forecast

- Added an Upcoming Golf section to `/caddie-magic/compass/`.
- Players can record:
  - Round
  - Tournament
  - Golf Trip
  - event name
  - start and end dates
  - optional course
  - optional location
  - optional notes or intention
- Every calendar day in a multi-day event receives its own Moon Day and Moon Phase forecast.
- Players can remove future events from their schedule.
- Added the player’s upcoming events to the owner Caddie Compass admin page.
- Added an **Upcoming Golf** card and admin calendar to the Concierge Desk.
- The admin calendar displays players and events across every day of multi-day tournaments or trips.

### Moon Score Data

- Changed the heading from **You’re on Moon Day X** to **The moon is on day X.**
- Changed the instructional copy to: **Click on any day on the moon wheel to view your stored data. Over time, your patterns will be revealed.**
- Removed the standalone Swing Thought snapshot card.
- Added **Next New Moon** and **Next Full Moon** cards.
- Swing thoughts remain available inside Selected Moon Day details.

### Player Profile + Caddie Review

- Moved Caddie Notes and Caddie Review out of the Player Profile card.
- Added a separate full-width Caddie Review card above Scorecard History.
- Changed the repeat request button to **Request a Scorecard Review**.
- Added a simple master Locker Room sharing switch.
- Turning sharing off hides both scores and swing thoughts from anonymous Locker Room views, including existing entries.

### Scorecard logging integrity

- Prevented future-dated rounds in the browser.
- Added database-level future date protection using Flowtel Time (`America/Los_Angeles`).
- Today and past dates remain valid.
- Error copy: **You can’t log a round from the future. Choose today or a past date.**
- Changed **Just a Swing Thought** to **Log a Swing Thought**.

### Locker Room

- Updated the subtitle to: **Anonymous swing thoughts and scores from players on the moon.**
- Added **Thoughts + Scores** and **Scores Only** views.
- Thoughts + Scores is the default.
- Scores Only displays anonymous numeric scores without names, courses, thoughts, or dates.
- The anonymous feed now respects the master sharing setting for both score and thought data.

### Score Map

- Left aligned cards and lists consistently in all four quadrants.
- Specifically corrected Last Quarter and Full Moon alignment on desktop and mobile.

## Supabase migration

Run:

`database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql`

This migration:

- adds the Player Profile master anonymous-sharing preference;
- adds the Locker Room score-and-thought feed;
- synchronizes opt-out changes across existing logs;
- adds database future-date protection;
- creates `caddie_magic_upcoming_golf_events`;
- adds secure player event creation and deletion;
- adds the owner/admin Upcoming Golf calendar feed.

## JavaScript syntax checks

- `caddie-magic/app.js`
- `caddie-magic/collective-map/app.js`
- `caddie-magic/score-map/app.js`
- `caddie-magic/compass/app.js`
- `caddie-magic/compass/admin/app.js`
- `shared/caddie-magic-schedule.js`
- `manager/app.js`

## First test checklist

1. Run migration 043.
2. Open `/caddie-magic/` and confirm the Moon Score Data copy and six snapshot cards.
3. Confirm Next New Moon and Next Full Moon display.
4. Attempt to log tomorrow as a round and confirm it is blocked.
5. Log today or a past date and confirm it saves.
6. Confirm the toggle says **Log a Swing Thought**.
7. Confirm Caddie Notes and Caddie Review appear in their own full-width card above Scorecard History.
8. Turn Locker Room sharing off and confirm both anonymous scores and thoughts disappear from the Locker Room.
9. Open `/caddie-magic/collective-map/` and test Thoughts + Scores and Scores Only.
10. Open `/caddie-magic/score-map/` and confirm all four quadrant lists are left aligned.
11. Open `/caddie-magic/compass/` and confirm the hero subtitle is gone.
12. Confirm the compass wheel is unobstructed and the cardinal cards show moon phases.
13. Confirm Homework and The Caddie Shack copy.
14. Confirm The Caddie Shack has only a message field.
15. Add a single-day round and confirm its Moon Day and Moon Phase.
16. Add a multi-day tournament or trip and confirm every day has its own forecast.
17. Open the player’s admin Compass and confirm upcoming golf is visible.
18. Open `/manager/`, select Upcoming Golf, and test the admin calendar month controls.
