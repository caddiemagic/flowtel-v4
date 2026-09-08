# Flowtel v0.10.88.1 — Complimentary Stay Doorway + Womb Magic Preview Polish

## Release purpose

This is a no-migration polish release on top of v0.10.88. The 14-Day Complimentary Stay access boundary remains unchanged; this release improves how the public doorway and active-stay Suite explain the offer and makes one Queendom benefit visible without granting it.

## Public doorway

The `/client/` login screen now separates the three first-time paths clearly:

- **Queendom Members | Create New Account** opens the verified paid-member account path.
- **Not a Queendom member?** introduces the non-member options.
- **Start Your 14-Day Complimentary Stay** opens the existing `trial-signup` path.
- **Or Join the Queendom Here** is presented as a full button and routes to the existing Queendom doorway.

The paid-member and complimentary-stay authorization paths remain separate. A non-member still cannot create permanent Queendom access without a verified Squarespace purchase.

## Suite header polish

The large Complimentary Stay panel in the Suite header is replaced by a compact status ribbon. It keeps the day counter — `COMPLIMENTARY STAY · DAY X OF 14` — while removing the duplicated large Join / Unlock actions from the top of the page.

Days 11–14 continue to introduce the Queendom gently. An understated **Already joined? Unlock membership** action remains available for immediate re-checks.

## Womb Magic preview for Complimentary Stay guests

Complimentary Stay guests now **see** the monthly Womb Magic card so they can understand the benefit before joining, but the scheduling experience remains locked.

During an active Complimentary Stay:

- the card is labeled **QUEENDOM MEMBER BENEFIT**;
- the normal Womb Magic scheduler button is hidden;
- the booking panel and summary remain closed;
- the visible CTA is **Join the Queendom to Schedule Your First Womb Magic Call** and routes to the Queendom;
- the 4-Week Womb Magic Portal remains hidden;
- server-side Womb Magic membership checks are unchanged and still require Queendom-level membership.

## Automatic membership recognition

The return path now performs one silent Squarespace membership re-check per page load for an unconverted Complimentary Stay identity. If the guest has joined the Queendom or Flow FM, Flowtel uses the existing verified membership admission + `flowtel_claim_default_access()` conversion path to upgrade the **same account** automatically.

If no Squarespace contact or qualifying paid purchase exists, the guest remains in the Complimentary Stay with no visible error. The existing **Already joined? Unlock membership** and expired-room re-open actions remain manual fallbacks.

## Database / Vercel

No Supabase migration is required. Migration **074** remains the latest required migration and **075** remains next.

No new API function is added. Flowtel remains at **12 / 12 Vercel Hobby serverless functions**.

## Validation

Validated in source:

- `node --check client/app.js`
- `node scripts/validate-flowtel-complimentary-stay.mjs`
- `node scripts/validate-vercel-function-budget.js`
- canonical entry, event-access, member-integrity, Womb Magic Portal, Acuity Womb Magic, Moon Mail / Personal Cosmology, Womb Magic consent, My Upcoming Events, and Caddie Magic validators

The release intentionally changes the old static expectations that the trial doorway must be a text link and that monthly Womb Magic must be hidden. Those validators were updated to assert the new button hierarchy and locked-preview contract instead.

Three unrelated validators already fail on the pristine v0.10.88 baseline and remain unchanged: `validate-guest-house.mjs` (Concierge loader cache-bust), `validate-queendom-beta-launch-readiness.mjs` (stale My Profile cache key), and `validate-flowtel-010813-caddie-060.mjs` (stale expected Acuity bridge version string).

## Deployment

Deploy this patch **after v0.10.88 + migration 074**. No additional Supabase SQL or environment variables are required.

After Vercel is Ready, test:

1. public login hierarchy on desktop and mobile;
2. a Complimentary Stay Suite for the compact day ribbon;
3. visible but locked monthly Womb Magic card;
4. Womb Magic CTA routes to the Queendom rather than opening scheduling;
5. a paid Queendom account still receives the normal Womb Magic scheduler;
6. a Complimentary Stay account that purchases Queendom is recognized on return/refresh or through the manual unlock action.
