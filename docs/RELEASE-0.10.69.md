# Flowtel v0.10.69 — Member Integrity + Guest Profiles

Release date: 2026-07-22

## Summary

This release adds the owner visibility and guest identity foundation that was deliberately separated from the Caddie Magic v0.10.68 work.

It introduces an owner-only Flowtel Member Directory, preserves separate last-sign-in and last-Flowtel-check-in intelligence, adds non-destructive Flowtel-only revoke and restore controls with an append-only audit, and gives every Flowtel guest a private My Profile room.

No account is automatically revoked. Verification remains an owner decision.

## Owner Member Directory

The Concierge Desk now includes **Flowtel Members** with Active, Revoked, and All views. Each member row shows:

- private first and last name;
- canonical Queendom/Flowtel `display_name`;
- account email;
- role and preserved membership rank;
- Flowtel access state;
- membership-verification state;
- last Supabase sign-in;
- last Flowtel check-in;
- private location and timezone;
- profile-confirmation state; and
- revocation details when applicable.

The directory is restricted to the Phase 1 owner account `mm.johnson@icloud.com` in both the interface and database functions.

## Membership verification foundation

The directory derives initial evidence from the stored Squarespace contact bridge and the member’s preserved Flowtel membership rank. The owner may then record:

- Queendom Verified;
- Flow FM Verified;
- Council Verified;
- Contact Found;
- Not Found;
- Inactive;
- Email Mismatch;
- Needs Review; or
- Manually Verified.

Squarespace’s current contact bridge does not independently prove a Member Site entitlement, so the release does not claim an automatic Member Site audit. It provides transparent evidence and an owner-controlled verification record. Nothing is revoked automatically.

## Revoke and restore

The owner may revoke any non-owner account’s **Flowtel access only**.

Revocation:

- preserves the Supabase Auth account and personal password;
- preserves remembered-session data, although protected Flowtel routes deny access after the next authorization check;
- preserves all stays, reflections, cycle history, Flow Map history, Concierge notes, mentor relationships, files, and identity records;
- leaves separately granted Caddie Magic and Guest House access unchanged;
- records the owner, time, previous state, resulting state, and optional reason; and
- cannot be silently undone by `flowtel_claim_default_access()`.

Restore Access reverses only the Flowtel product-access lock and adds another append-only audit event.

## Guest Profile

A new `/profile/` route lets every Flowtel member review and edit:

- required First Name;
- required Last Name;
- required Name Shown in the Queendom;
- read-only account Email;
- required private Location; and
- required Time Zone.

`profiles.display_name` remains the canonical visible identity. Legal names, email, location, and timezone remain private to the member, owner, and authorized connected mentor surfaces.

Existing members receive a gentle profile-confirmation doorway the first time they enter or return to their Suite after deployment. They may return to the Suite for now; the confirmation remains pending until saved. New beta access requests collect the complete profile foundation up front.

## Migration

Run exactly once:

```text
database/migration-054-flowtel-member-integrity-guest-profiles.sql
```

Migration 054 is additive. It does not rerun or rename either historical migration 052 file and does not touch retired migration 037.

Migration 053 must already be present from v0.10.68 and must not be rerun for this release.

## Preservation guarantees

This release does not change:

- Flowtel Time;
- one stay per Flowtel Day;
- append-only stays, notes, Honors, and history;
- personal passwords or normal remembered-session behavior;
- canonical `display_name` rules;
- legal-name privacy;
- owner-only Concierge access;
- owner all-wing Turndown routing;
- unread Concierge-note continuity;
- membership-rank preservation;
- Team Map audience boundaries;
- mentor consent;
- Powder Room anonymity;
- Medicine Wheel geometry;
- actual-versus-recorded cycle logic;
- Moonbox beta hold;
- private Priestess Mailbox, Lounge video, Guest House, or Replay Notes;
- Hourly Flow Rate formula; or
- Caddie Magic v0.5.1 behavior and product boundaries.

## First test checklist

1. Run migration 054 exactly once, then deploy the full release.
2. Sign in as the owner and open **Flowtel Members** in the Concierge Desk.
3. Confirm Active, Revoked, and All views load.
4. Confirm legal name and email appear only in the owner view.
5. Confirm Last Sign-In and Last Flowtel Check-In display separately.
6. Save a verification status and private note, then refresh and confirm persistence.
7. Revoke a non-owner test account and confirm its Flowtel history remains visible.
8. Confirm the revoked account cannot re-enter Flowtel or self-restore through the normal doorway.
9. Confirm separately granted Caddie Magic or Guest House access remains unchanged.
10. Restore the test account and confirm Flowtel access returns.
11. Enter Flowtel as an existing guest and confirm the My Profile prompt appears once in that browser session.
12. Choose Return to My Suite for Now and confirm the stay remains open.
13. Re-enter in a new session and confirm an unconfirmed profile is prompted again.
14. Save first name, last name, Queendom name, location, and timezone.
15. Confirm the saved Queendom name appears in normal Flowtel identity surfaces.
16. Confirm email remains read-only.
17. Open **My Profile** from the Suite and edit the profile again.
18. Submit a new beta access request and confirm all profile fields are collected before access is prepared.
