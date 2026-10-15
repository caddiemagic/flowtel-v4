# Parallel development coordination — Mentorship Client Suite

Updated October 2026. This document records a coordination agreement, not a merge or launch authorization.

## Branch ownership
- Client Suite: `feature/client-suite-v1`, feature files in `mentorship-client-suite/`.
- 13 Moons: `feature/13-moons-vortex-release1`, feature files in `13-moons/`, `shared/13-moon-vortex.js`, `shared/13-moons-monthly-practices.js`, and `server/13-moons-purchase-classification.js`.
- Preserve `main`, existing customer data and the live Flowtel deployment until each feature passes review.

## Avoid uncoordinated edits
- Shared Flow Map and cycle files, including `flow-map/app.js`.
- Shared Concierge Desk, authentication, membership product access, signup pathways and navigation.
- `vercel.json` or existing deployment configuration.
- Existing entitlement functions or migration numbering.

## Client Suite independent work
- Reusable mentorship offering templates, enrollment planner, per-session bookkeeping and private client-visible view model.
- Private mentor notes vs client-visible monthly focus must remain separate.
- Mentorship-only admission must not imply Queendom, Flow FM, 13 Moons, or Caddie Magic entitlement.
- Cycle display must reuse existing check-in/Flow Map data and respect consent; no parallel cycle data store.
- Acuity remains booking source for flexible four-session package; proposed automatic schedules must not create appointments without owner approval.

## Migration coordination
- 13 Moons has draft migration files numbered 085–092. The Client Suite's `mentorship-schema.DRAFT.sql` is deliberately unnumbered.
- Do not assign a final number or apply database changes until both branches' migration histories and the latest `main` are inspected.
- Review RLS and authentication end-to-end before using real client records.

## Integration gates
1. Compare both feature branches with current main before any merge.
2. Review shared-file changes and consolidate authentication/navigation changes.
3. Reconcile migration order and RLS with test users.
4. Verify isolation, Flowtel Time, existing Stay behavior, Acuity and other current modules.
5. Require owner's explicit authorization for production deployment and inviting clients.

## Deferred
- `The Beginning & The Becoming` onboarding and closing reflection questionnaire.
