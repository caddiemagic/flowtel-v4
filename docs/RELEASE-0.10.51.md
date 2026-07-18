# Flowtel v0.10.51 — Lounge Profile Pill Polish

Release date: 2026-07-18

## Summary

This release simplifies the Flowtel Lounge and brings the Priestess Profile doorway back into the same quiet hospitality language as the surrounding Lounge cards.

## Priestess Profile card

The Lounge **Priestess Profile** card now uses the same clean white card treatment as the other Lounge sections:

- soft white translucent background
- standard Flowtel border color
- matching 24px rounded corners
- matching hospitality shadow
- consistent 20px inner spacing

The copy and **Open Profile View** button remain unchanged.

## Team Map access

The **Living Map** card has been removed from the Lounge. Team Map access remains available from the Suite, keeping the Lounge quieter and preventing duplicate navigation.

## Supabase migration

No Supabase migration is required.

## Files changed

- `client/index.html`
- `client/styles.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.51.md`

## First test

1. Open the Flowtel Lounge.
2. Confirm the Priestess Profile card visually matches the other Lounge cards.
3. Confirm the **Open Profile View** button still opens Profile Studio.
4. Confirm the Living Map card is no longer present in the Lounge.
5. Return to the Suite and confirm Team Map access remains available there.
