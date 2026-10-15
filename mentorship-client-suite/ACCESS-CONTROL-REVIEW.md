# Flowtel Client Suite — Access Control Review

Status: development only. Do not deploy the draft database schema or enable real clients yet.

## Client authentication
- Continue using the existing Flowtel Supabase authentication, never a second password system.
- A private mentorship entitlement must not imply Queendom, Flow FM, or Caddie Magic membership.
- Invite through a server-authenticated owner workflow. The invitation should be bound to a verified email and a single claimed auth user.
- Derive client identity from the verified session token on each request, not from a query parameter or browser-supplied ID.

## Read and edit boundaries
- Owner endpoints must use existing requireOwner verification.
- Client endpoints must scope every enrollment and child record by the authenticated client user ID.
- Keep internal mentor notes out of client-visible responses entirely.
- Avoid loading private storage paths or privileged keys into browser responses.
- Replays require expiring signed URLs after owner/client authorization and revocable visibility.
- Every private table must be deny-by-default until tailored policies or server-only endpoints are reviewed.

## Scheduling and synchronization
- Proposed dates must be checked against the real Acuity calendar before booking.
- Preserve Flowtel Time, America/Los_Angeles, with DST-safe conversion.
- An approval step is required before writing bookings, with idempotency to prevent duplicate Acuity appointments.
- The four-session $399 package stays client-booked via Acuity without an invented expiry.

## Launch gates
1. Correct and review the database migration, including month-based Telegram support.
2. Implement owner authorization and invitation redemption.
3. Implement authenticated client reads and owner edits.
4. Review private media access, cycle consent, and replay permissions.
5. Test with fictional client accounts to detect cross-client leakage.
6. Integrate with the actual Flowtel navigation only after these checks.

Future feature: The Beginning & The Becoming onboarding and closing reflections.
