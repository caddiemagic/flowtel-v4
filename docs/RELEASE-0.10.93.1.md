# Flowtel v0.10.93.1 — Kingdom Lobby + Player Password Recovery

Base: GitHub main 42f5c2705f4c97782f96d5efacfa984f504ee4ca (Restore player login page). Caddie Magic remains v0.7.1. This frontend release adds no migration, function, environment variable, payment enforcement, or membership grant. Migration 081 remains latest; 082 remains next. Vercel stays 12/12.

## Public Kingdom Lobby

/caddie-magic/lobby/ is a free, account-free four-club selector. Selection order maps to North, East, West, South; Putter sits in the center. Duplicate clubs and putters are rejected. The compass is temporary in-page, with no local storage, database write, or private-room access. Directions use the existing Presence / Truth / Flow / Trust interpretation. Signed-in users remain able to open the public lobby regardless of product access.

## Password recovery

Player entry links to /caddie-magic/reset-password/. Supabase sends the recovery email, then a verified recovery session enables the new-password form. Existing shared helpers are reused. Matching passwords with eight-character minimum are required. Recovery errors offer a new link, and sending responses do not disclose account existence. Only exact lobby and recovery routes bypass the frontend product redirect; database permissions and private product checks are unchanged. Recovery changes neither paid status nor invitation eligibility.

## Deployment

1. In Supabase Authentication → URL Configuration, ensure https://app.theflowtel.com/caddie-magic/reset-password/ is an allowed Redirect URL. Verify recovery email template uses ConfirmationURL or correctly preserves RedirectTo. Keep existing Flowtel entries.
2. Overlay patch at repository root, preserving all paths, and push. No SQL step.
3. Wait for Vercel Ready.
4. Incognito: open lobby, choose four clubs, verify NEWS and center Putter. Test mobile width, duplicates, and Choose Again.
5. Existing player: request recovery, receive email, open link, enter matching new passwords, then sign in to existing profile. Test expired and reused links. Confirm an authenticated user without Kingdom access can recover their account without gaining Kingdom access.
6. Confirm original player login, private compass rooms, and public Call Your Caddie still open at their original URLs.

## Validation limits

Source checks cover mapping, invalid choices, route exemptions, recovery gates, player entry preservation, JS syntax, function budget, and whitespace. No live email was sent and no production configuration was changed. Browser rendering, actual recovery delivery, and existing-player sign-in remain live verification steps. Existing historical exact-copy validators may expect superseded How It Works cards.

## Paid Kingdom follow-up

The existing flowtel_product_access caddie_magic_access gate is the foundation; invitations currently grant access. A paid launch needs a chosen offer/product, server-verified purchases, account-email matching, cancellation/refund/revocation behavior, an explicit existing-player policy, and fail-closed enforcement through database access boundaries. A Squarespace membership can reuse the established purchasing ecosystem, but Caddie product mapping and reconciliation must be implemented and verified; a checkout URL alone is insufficient. Public Lobby and voice mailbox remain free. No billing changes ship in this release.
