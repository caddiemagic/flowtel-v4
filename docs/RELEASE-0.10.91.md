# Flowtel v0.10.91 — Automatic Queendom Provisioning + Member Reconciliation

**Release date:** September 30, 2026
**Source base:** v0.10.90.3 (`a21baa9f9e49ca3e68135b400e48f41c2aac1a5d`)
**Database:** migration 078 required
**Latest migration after deployment:** 078
**Next migration:** 079
**Vercel functions:** 12 / 12

## Purpose

Remove the second manual account-creation step from the paid Queendom onboarding experience without weakening the existing Squarespace purchase-verification boundary or replacing existing Flowtel identities.

Squarespace remains the current billing / Pricing Plan authority. Flowtel becomes responsible for provisioning the member's Flowtel identity **after** the exact Squarespace email + PAID mapped membership purchase has been verified.

## New paid-member activation flow

The signed-out member doorway now says:

**Queendom Members | Activate My Flowtel**

A paid Queendom / Flow FM member enters only the email used at Squarespace checkout. She does not choose another Flowtel password on this form and does not submit a second browser signup.

Flowtel then:

1. exact-normalizes the email;
2. verifies the Squarespace Contact fail-closed;
3. verifies a PAID mapped Queendom / Flow FM / Council order using the existing stable product IDs;
4. looks for an existing Supabase Auth identity with that exact email;
5. if the identity exists, keeps the same Auth UUID and upgrades/links membership in place;
6. if the identity does not exist, creates it with Supabase Admin **Invite User** and sends the normal Supabase invite email;
7. applies the verified membership server-side through migration 078;
8. preserves existing Flowtel history, Caddie Magic access, Complimentary Stay history, role, and any higher membership rank.

When a newly invited member clicks the email invitation, Supabase returns her to `/client/`. Flowtel's existing first-time private-room-key panel then lets her choose the password she will use on future devices.

This is intentionally not a Squarespace SSO implementation. Squarespace still creates its own customer account as part of the Pricing Plan checkout; Flowtel removes the separate **manual Flowtel signup** step.

## Existing members

Existing Flowtel members are never recreated.

If Squarespace verification finds an Auth identity for the same normalized email:

- the same UUID is reused;
- existing stays, cycle history, Moon Mail, Flow Map, events, Womb Magic, relationships, Personal Cosmology, and Caddie Magic history remain attached;
- existing passwords are not reset;
- membership rank can only stay the same or move upward;
- an independently granted Caddie Magic key is preserved;
- a revoked Flowtel identity is **not** automatically reactivated and requires Owner review.

Email mismatches are never auto-merged.

## Owner Membership Reconciliation

Owner Administration now includes:

**Membership Reconciliation**

at `/manager/membership/`.

The room scans PAID Squarespace orders for the mapped membership products and compares those exact order emails against Flowtel Auth/profile/access state.

Statuses:

- **Already linked** — Flowtel identity + sufficient membership already exist;
- **Needs Flowtel invite** — verified paid member has no Flowtel Auth identity;
- **Existing identity · upgrade** — Auth identity exists but membership/access still needs linking;
- **Manual review** — currently reserved for safety cases such as a revoked Flowtel identity.

Owner may select members needing an invite/upgrade and choose **Provision Selected**. Every selected member is re-verified against exact Squarespace Contact + PAID mapped order before any identity/access change occurs.

Batch provisioning is capped at 20 members per action so invitation email delivery remains controlled. Supabase Auth email rate limits still apply.

## Migration 078

Migration 078 adds one service-role-only RPC:

`flowtel_apply_verified_membership_server(...)`

The function:

- verifies that the supplied email exactly equals the Auth user's email;
- accepts only Queendom / Flow FM / Council membership types;
- refuses revoked Flowtel identities;
- never lowers membership rank;
- preserves role and Caddie Magic access;
- converts an existing Complimentary Stay on the same UUID rather than replacing it;
- records the verified Squarespace order/contact provenance in the existing server-only signup-admission record;
- grants permanent Flowtel membership access to that existing Auth UUID.

The RPC is revoked from `public`, `anon`, and `authenticated` and granted only to `service_role`.

## Security boundary retained

This release does **not** authorize from:

- Squarespace contact existence alone;
- product names;
- URL parameters;
- client Auth metadata;
- the reconciliation report by itself.

Actual provisioning always re-runs the existing exact-email Contacts verification and PAID mapped-order verification on the server.

Current mapped product IDs remain:

- Flow FM: `47815dfc-d06e-45bb-8581-332cdff0fbff`
- Queendom: `9ebc509d-6678-43d0-9162-df7f4cb505e4`

## Complimentary Stay

Complimentary Stay signup remains separate and continues to collect a private password normally.

The existing same-account Complimentary Stay → paid membership recognition remains intact. A verified paid purchase upgrades the existing trial Auth UUID rather than creating another account.

## Supabase Auth email

New automatic identities use the existing Supabase **Invite user** email template and redirect to:

`https://app.theflowtel.com/client/?membershipProvisioned=1`

`FLOWTEL_PUBLIC_ORIGIN` continues to override the production origin when configured.

No new Vercel environment variable is required. The Flowtel client URL must remain present in Supabase Auth's allowed Redirect URLs, as already required by the existing email-confirmation/password-recovery setup.

## Vercel

No `/api/*.js` file was added or removed. The existing `api/squarespace-bridge.js` is extended.

Function budget remains **12 / 12**.

## Deployment

**Run migration 078 before deploying the website files.**

Then deploy the v0.10.91 patch from v0.10.90.3 and hard-refresh `/client/` and `/manager/membership/`.

## First live proof

1. Use a paid Queendom email that has never had a Flowtel account.
2. From `/client/`, choose **Queendom Members | Activate My Flowtel**.
3. Enter the exact checkout email and choose **Activate My Flowtel**.
4. Confirm Flowtel says the membership is verified and an invitation was sent.
5. Confirm the Supabase invitation email arrives.
6. Click the invite and confirm Flowtel returns to the same newly provisioned identity and asks her to create her private room key.
7. Confirm Suite access and Queendom rank without another signup form.
8. Repeat with an existing Flowtel member and confirm no duplicate Auth user is created and the existing password/history remain intact.
9. Open Owner → Membership Reconciliation and confirm the report separates linked / needs invite / needs upgrade / manual review.
10. Provision one known legacy member from the Owner screen and confirm exact purchase re-verification + invitation.

Source validation does not equal live production verification.
