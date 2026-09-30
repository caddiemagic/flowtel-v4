# Flowtel v0.10.91.1 — Event Claim Conversion Flow

**Release date:** September 30, 2026
**Source base:** v0.10.91 (`b0cf2ac06d962f7139bc552125c525341e3c4189`)
**Database:** no migration
**Latest migration:** 078
**Next migration:** 079
**Vercel functions:** 12 / 12

## Purpose

Make The Queendom Calendar useful as a direct social-media landing page. A visitor should be able to see the next three gatherings and immediately understand how to claim one without navigating the full month grid first.

## Next-three-gatherings preview

Each compact preview card now keeps its existing event-details doorway and adds a small:

**CLAIM MY SEAT**

action.

For a signed-in eligible Queendom / Flow FM member, that button calls the existing event enrollment path for the exact event/occurrence. All existing server-side entitlement, Acuity live-capacity, appointment creation, idempotency, and Flowtel registration rules remain authoritative.

After a successful claim, the preview refreshes to:

**✓ SEAT CLAIMED · OPEN EVENT**

For Recurring Events, only the selected occurrence is claimed. Series / Vortex registration remains whole-series by design.

## Signed-out visitor doorway

A signed-out visitor does not get assumed to be a nonmember. Choosing **CLAIM MY SEAT** opens a small two-doorway choice:

- **ALREADY IN THE QUEENDOM? ENTER FLOWTEL**
- **NOT YET A MEMBER? JOIN THE QUEENDOM**

The Join doorway uses the existing canonical Queendom signup:

`https://www.theidyllcollective.com/queendomhome`

The Enter Flowtel doorway carries the exact event context into `/client/`.

## Signed-in nonmembers

A signed-in identity that does not currently have member calendar access (for example an active Complimentary Stay) is routed to the Queendom signup page rather than attempting a member registration.

This release does not convert Complimentary Stay into Queendom access client-side.

## Exact occurrence preservation

v0.10.91.1 extends the existing event doorway so a Recurring Event occurrence id is preserved through:

1. calendar preview selection;
2. Flowtel login;
3. paid-member **Activate My Flowtel** verification;
4. Supabase Invite User email for a newly provisioned paid member;
5. return to `/client/`;
6. the final event registration call.

The server-generated invite redirect accepts only UUID-shaped event and occurrence ids and always targets the fixed Flowtel `/client/` origin. It cannot be used as an arbitrary redirect.

Series / Vortex preview doorways intentionally omit occurrence context because joining a series remains one whole-series commitment.

## Security

This release does not trust the preview page to decide entitlement.

`CLAIM MY SEAT` still resolves through the existing authenticated event registration API and its current membership / ticket / Acuity checks. The new preview UI cannot create a seat by itself.

v0.10.91 exact-email Squarespace Contact + PAID mapped-order verification remains unchanged for automatic member provisioning.

## Database / environment / Vercel

No database change.

Do not rerun migration 078.

No new environment variables.

No `/api/*.js` file is added or removed. `api/squarespace-bridge.js` is updated in place to preserve safe event return context during an invite.

Function budget remains **12 / 12**.

## Deployment

Deploy directly on top of v0.10.91.

No SQL step is required.

Hard-refresh:

- `/queendom-calendar/`
- `/client/`

## First live proof

1. Open The Queendom Calendar signed out.
2. Confirm each of the next three preview cards has **CLAIM MY SEAT**.
3. Choose one recurring Moon Magic Monday and confirm the two-doorway modal appears.
4. Choose **ALREADY IN THE QUEENDOM? ENTER FLOWTEL**, sign in as an existing eligible member, and confirm that exact Monday is claimed in Flowtel + Acuity.
5. Return to the calendar and confirm the preview action reads **✓ SEAT CLAIMED · OPEN EVENT**.
6. Signed out again, choose **NOT YET A MEMBER? JOIN THE QUEENDOM** and confirm the canonical Queendom signup opens.
7. As an active Complimentary Stay user, choose a preview **CLAIM MY SEAT** and confirm Flowtel routes to the Queendom signup rather than granting membership access.
8. For a paid Queendom email with no Flowtel identity, activate Flowtel from the event doorway, open the Supabase invitation, and confirm the exact selected recurring occurrence is claimed after entry.

Source validation does not equal live production verification.
