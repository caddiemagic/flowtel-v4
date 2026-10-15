# Flowtel Mentorship Client Suite — development branch

This directory contains an **isolated, non-production** first increment of the
mentorship scheduling engine. It does **not** book Acuity appointments, create
clients, expose client records, or modify existing Flowtel screens.

Run `node --test mentorship-client-suite/scheduling-engine.test.mjs`.

## Templates
- Womb Activation: 1 activation call (up to 180 minutes), 2 weeks Telegram.
- Sacred Self-Study: 1 activation + 6 biweekly 90-minute empowerment calls, 3 months Telegram.
- Kundalini Creatrix: 1 activation + 18 biweekly 90-minute empowerment calls, 9 months Telegram.
- Four 45-Minute Sessions: flexible Acuity self-booking, no Telegram, $399.

## Before integration
1. Confirm the next migration sequence number and review schema draft against existing auth and RLS.
2. Add server-only mentorship invitation / entitlement flow that does not grant Queendom membership.
3. Implement separate owner-only mentor notes and client-visible summaries.
4. Add private media storage with access checks, signed URLs and revocation.
5. Check conflicts and actual time zone/DST resolution before proposing confirmed appointments.
6. Require human approval and idempotency before creating any Acuity bookings.
7. Test access isolation for two fictional accounts before enabling real clients.

Future feature: **The Beginning & The Becoming** onboarding and closing reflection;
not in the initial release.
