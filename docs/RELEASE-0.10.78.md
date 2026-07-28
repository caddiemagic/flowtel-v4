# Flowtel v0.10.78 — Concierge Team Access + Turndown Polish

Release date: 2026-07-28

Caddie Magic remains **v0.5.2**. This release does not change Player access, Caddie permissions, course data, scores, messages, invitations, or Caddie Magic history.

## Summary

This release opens the existing Concierge Desk to manually approved Flow FM practitioners without creating a second application or weakening owner permissions. Approved Priestesses see only the existing **Visible to approved Priestesses** section. The owner continues to see Team Rooms, Owner Administration, and Caddie Magic Administration.

It also replaces the browser-native Turndown prompt with a branded Flowtel modal and restores the Living Map marker to the approved circle-and-name presentation.

## Concierge Team access

- Adds an owner-only manual **Grant Team Access / Pause Team Access** control to each Priestess Team profile.
- Uses the existing `concierge_access_enabled` profile flag; no self-request or automatic approval flow is added.
- Allows approved `practitioner` profiles into `/manager/` while preserving the same Desk route.
- Shows approved practitioners only the Team Rooms section.
- Hides Owner Administration, Caddie Magic Administration, and the owner preview toolbar from practitioner sessions.
- Loads owner-only Guest House, Honors, mailbox, member, map, and Caddie services only for the owner Desk audience.
- Keeps Flow FM membership, Guest identity, start date, cycle history, stays, and mentor relationships unchanged when access is granted or paused.

## Scoped practitioner Turndown access

- Keeps `flowtel_current_user_is_concierge()` owner-only.
- Adds a separate team-access helper for explicitly approved practitioners.
- Resolves each approved practitioner's Turndown assignment from the wing opposite her own current Flowtel stay.
- Allows the practitioner to read and complete only current-day Turndown requests in that assigned wing.
- Keeps the owner able to see and complete all current-day requests across wings.
- Preserves append-only Concierge notes, completion attribution, Flowtel Time, and unread-note continuity.

## Branded Turndown note modal

- Replaces the unstyled browser `prompt()` with a Flowtel dialog.
- Shows guest context, an optional multiline Concierge Note field, Cancel, and Complete Turndown actions.
- Includes keyboard focus, mobile layout, saving state, double-submit protection, and inline errors.
- Uses the existing Turndown completion RPC underneath the new interface.

## Living Map marker restoration

- Overrides the platform-wide button styling that had created a visible square card around member markers.
- Restores the circular portrait, subtle gold halo, and normally capitalized member name.
- Preserves the larger invisible click target, floating motion, profile opening, map coordinates, seasonal placement, and responsive behavior.

## Migration

Run these in order:

1. Confirm or run `database/migration-061-flow-fm-platform-tools-polish.sql` from v0.10.76 if it is not already live.
2. Run `database/migration-062-concierge-team-access-turndown-polish.sql` once.

Migration 062 adds scoped RPC helpers and RLS policies but no destructive table operations. It does not broaden the existing owner Concierge helper.

Do not rerun migrations 058, 059, 060, either historical migration 052 body, or retired migration 037.

## First test checklist

1. Confirm migration 061 state, run migration 062, then deploy v0.10.78.
2. Open an owner Priestess Team profile for a member whose role is `practitioner`.
3. Click **Grant Team Access**, refresh, and confirm the status remains Active.
4. Sign in as that Priestess and open `/manager/`.
5. Confirm she sees only **Visible to approved Priestesses** and does not see Owner or Caddie administration.
6. Confirm Turndown Service, Your Clients, Availability, Profile Studio, and Time + Space open correctly.
7. Confirm an unapproved practitioner is redirected and cannot enter the Desk.
8. Clock the approved practitioner into a wing and confirm only opposite-wing current-day Turndown requests appear.
9. Open Complete Turndown and confirm the styled note modal appears instead of a browser prompt.
10. Save a note, refresh, and confirm completion attribution and note history remain intact.
11. Pause Team Access from the owner profile and confirm entry is removed without changing membership or history.
12. Open the Living Map on desktop and mobile and confirm markers show only the circle, halo, and name.
13. Recheck the owner Desk and confirm all owner and Caddie rooms still load normally.
14. Confirm Caddie Magic v0.5.2 remains unchanged.
