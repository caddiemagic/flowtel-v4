# Flowtel Release 0.9.2

## Mentor Connect + Latest Polish

This release fixes the visible **Connect** button on the Concierge Desk mentor request card and applies the July 5 latest polish notes.

## Mentor relationship rules

- Guests may have one active Mentor to the Moon at a time.
- Practitioners may have many connected guests.
- Pending requests remain visible until connected or superseded.
- Connected relationships persist across stays.

## Root cause fixed

The Mentor Requests card shown in the Concierge Desk was being copied from a hidden cache into the visible queue. The HTML copied correctly, but the click event listener did not copy with it. This made the visible **Connect** button look ready while having no active handler.

## Files changed

- `manager/app.js`
  - Binds Connect buttons in both the hidden cache and visible queue.
  - Adds Connecting state and visible error messaging.
  - Removes Open Room button from Guests in House.
  - Updates concierge request cards to show Cycle Day, Actual Inner Season, and Feels Like.

- `shared/relationships.js`
  - Hardens Connect RPC handling.
  - Adds fallback behavior if the relationship row cannot be reloaded after successful connection.

- `client/app.js`
  - Changes Reflection Moon Magic copy from Last New Moon to Next New Moon.
  - Places the theme before the date.

- `client/styles.css`
  - Aligns Return to Suite button width with the card above.

- `tracker/index.html`
  - Polishes public Cycle Tracker result layout.
  - Updates Cycle Tracker medicine wheel styling to more closely match the Flowtel wheel without adding seasonal cards.

- `database/migration-015-mentor-connect-and-polish.sql`
  - Recreates the mentor Connect RPC defensively.
  - Confirms one active mentor per guest.
  - Preserves many guests per mentor.
  - Keeps `mentor_photo_url` ready for profile photo support.

## Supabase

Run:

```sql
database/migration-015-mentor-connect-and-polish.sql
```

## Test path

1. Guest chooses a mentor.
2. Mentor opens Concierge Desk.
3. Mentor clicks **Your Guests**.
4. Mentor clicks **Connect**.
5. Request disappears from Mentor Requests.
6. Guest appears under Your Guests.
7. Guest Suite shows connected Mentor to the Moon.
