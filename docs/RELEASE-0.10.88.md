# Flowtel v0.10.88 — 14-Day Complimentary Stay

## Release purpose

Flowtel can now welcome a woman who has not yet joined the Queendom into a **one-time 14-Day Complimentary Stay**. The stay is a real Flowtel account and a real personal history, but it is **not** a Queendom membership.

The account is never deleted when the stay ends. After 14 days, the room closes while her Supabase Auth identity, stays, reflections, Flow Map history, cycle history, Moon Mail, and other personal Flowtel history remain intact. A later verified Queendom or Flow FM purchase reopens that same account.

## Experience

The public `/client/` doorway now offers **Stay with us complimentary for 14 days** beside the existing paid-member account path.

During an active stay the Suite shows a quiet `COMPLIMENTARY STAY · DAY X OF 14` banner. Days 11–14 gently introduce the Queendom as the way to keep the room open.

The complimentary stay includes the personal Flowtel experience: daily check-in, Suite, cycle tracking, Inner Season, Medicine Wheel, reflections, Flow Map, Moon Mail, Personal Cosmology, and the basic Lounge.

A complimentary guest is **not** given Queendom membership rank. The Suite hides Queendom-only Womb Magic booking, the 4-Week Womb Magic Portal, Mentor to the Moon connection, Team Map access, and member event registration. The mentor relationship RPC is also hardened server-side so hiding the card is not the authorization boundary.

When the 14 days end, the member can still authenticate but `/client/` opens a dedicated closed-room scene:

**YOUR COMPLIMENTARY STAY IS COMPLETE**

Her history remains preserved. **Join the Queendom** opens the purchase doorway, and **I Joined — Reopen My Room** reuses the existing Squarespace Contacts + paid-order verification. A verified Queendom / Flow FM purchase consumes the normal member signup admission, converts the existing trial product-access row to permanent membership access, and keeps the same Auth user/profile/history.

## One-stay rule

The trial is one-time per Flowtel email identity. `flowtel_trial_admissions.claimed_at` is a durable server-only marker and is never cleared or moved to restart the clock. The 14-day clock begins when the authenticated user first claims the prepared stay, not when the public form is opened.

## Migration 074

Run `database/migration-074-flowtel-complimentary-stay.sql` once before testing the new trial doorway.

Migration 074:

- adds `flowtel_trial_started_at`, `flowtel_trial_ends_at`, and `flowtel_trial_converted_at` to `flowtel_product_access`;
- creates private server-only `flowtel_trial_admissions`;
- makes `flowtel_current_user_has_product_access('flowtel')` trial-expiry aware;
- extends `flowtel_claim_default_access()` to claim, expire, and convert a complimentary stay without deleting history;
- keeps real member admissions authoritative over trial state;
- hardens `flowtel_choose_mentor()` so membership rank 0 cannot create a mentor relationship.

Migration 074 is the only database migration for this release. After it is applied, **075 is next**.

## Vercel function budget

No new `api/*.js` file is added. Trial admission preparation reuses `api/squarespace-bridge.js` with the distinct `trial-signup` intent.

The project remains at **12 / 12 Vercel Hobby serverless functions**. `scripts/validate-vercel-function-budget.js` remains part of release validation.

## Squarespace membership conversion

The existing paid-member path remains authoritative. Current identified Squarespace paywall-product IDs are:

- Flow FM: `47815dfc-d06e-45bb-8581-332cdff0fbff`
- The Queendom | Feminine Mystery School Portal: `9ebc509d-6678-43d0-9162-df7f4cb505e4`

Those values belong in the existing Vercel environment variables `SQUARESPACE_FLOWFM_PRODUCT_IDS` and `SQUARESPACE_QUEENDOM_PRODUCT_IDS`. No new environment variable is required for the Complimentary Stay.

## Deployment order

1. Apply migration 074 in Supabase.
2. Deploy the v0.10.88 website/source patch.
3. Confirm Vercel is **Ready** and the function-budget check remains 12/12.
4. Test a new non-member email through **Stay with us complimentary for 14 days**.
5. Confirm the account is rank 0 while the Suite opens and member-only benefits remain unavailable.
6. Separately confirm the normal paid Queendom / Flow FM first-time account path still works. This remains a live production verification item until observed end-to-end.
7. For expiry QA, use a dedicated test identity and adjust only that test row's trial timestamps in Supabase; do not alter production-member history.
8. Confirm an expired test identity reaches the closed-room scene and that a verified paid purchase converts the same user rather than creating another account.

## Validation

Source validation for this release includes:

- `node --check` on all changed JavaScript;
- `node scripts/validate-flowtel-complimentary-stay.mjs`;
- `node scripts/validate-vercel-function-budget.js`;
- canonical Flowtel entry, member-integrity, event-access, Womb Magic Portal, and Caddie Magic validators.

Two unrelated validators already fail in the v0.10.87.4 baseline and remain unchanged:

- `scripts/validate-guest-house.mjs` — `Concierge dynamic loader cache-bust is missing.`
- `scripts/validate-flowtel-010813-caddie-060.mjs` — stale expected Acuity bridge version string.

They are not introduced by v0.10.88 and are intentionally not folded into this access-boundary release.

## Live verification boundary

This release can be source-validated, but the following remain live checks after deployment: Supabase migration 074 execution, first complimentary signup/confirmation, exact Day-15 closure behavior, same-account Queendom conversion, and a paid-member signup using the newly configured Squarespace product IDs.
