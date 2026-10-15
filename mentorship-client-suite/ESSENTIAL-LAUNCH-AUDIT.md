# Essential Client Suite technical audit — October 2026

**Scope:** Secure mentorship enrollment, invitation/login, private upcoming sessions, client-visible monthly focus, and a basic replay library. Acuity automation, Zoom lifecycle synchronization, and deeper Flow Map integration are deferred.

**Status:** Development only. Do not merge, deploy to production, invite clients, or apply migrations without explicit owner approval.

## Verified in repository and database

- Existing server auth helpers `requireUser(req)` and `requireOwner(req)` in `server/guest-house-server.js` validate a user token and owner Concierge RPC. Use them rather than defining parallel Flowtel authorization.
- Draft `owner-handler.DRAFT.cjs` lives outside `api/`, so it is **not** a deployed API endpoint.
- `owner-repository.cjs` now supports listing offerings, creating drafts, listing enrollments, updating draft dates, and saving a client-visible monthly focus. These functions **still need integration and end-to-end testing**.
- The `flowtel_mentorship_%` tables are **absent** from the connected Supabase public schema (read-only SQL verification). Draft SQL is unapplied.
- Demo Enrollment Workspace uses browser-local storage; the fictional dashboard is static. Neither provides secure client login.
- 13 Moons development is isolated on `feature/13-moons-vortex-release1`, with draft migration numbers 085–092. Client Suite draft SQL remains unnumbered.

## Essential launch integration order

1. Correct and test owner repository and handler contracts using actual shared helper exports. Enforce request-body limits and authorization for every action.
2. Reconcile database migration number against **current main** and 13 Moons branch; review table constraints, DML grants, indexes, status transitions, RLS, and service-role read/write access. Request owner authorization **before application**.
3. Add a server-only mentorship-client authorization check: authenticated Supabase user `id` must match the enrollment's `client_user_id`; never infer access from an email supplied by a browser. No Queendom/Flow FM/13 Moons entitlement required or granted.
4. Implement an invitation-to-existing-account/first-login linking process with single-use verification and expiration, duplicate-email handling, revocation, and tests. Avoid exposing client data by email alone.
5. Publish protected owner and client endpoints only after the schema is approved and tests cover unauthorized user, unrelated mentorship user, and owner.
6. Connect owner dashboard to persisted drafts, enrollment details, manually entered sessions, focus and replay metadata. Provide actionable error states.
7. Connect client suite to actual **client-visible** fields. Never emit `private_mentor_notes`, replay `storage_path`, or other users' data to browser.
8. Secure replay storage with a private bucket and short-lived signed URLs for the entitled client and authorized owner; do not make the bucket public.
9. Test with fictional owner and client accounts; regression-test Flowtel auth, Stay/check-in, existing calendar and 13 Moons separation.
10. Request explicit release approval before merging into main, applying migrations, or enrolling real clients.

## Explicit exclusions for initial launch

- Automated Acuity booking and cancellation
- Zoom meeting creation/synchronization
- Automatic cyclical/Flow Map display and analytics
- Beginning & Becoming reflection questionnaire

## Findings requiring fixes before activation

- `ownerContext(ctx)` only checks the shape of the supplied context. The surrounding handler must always invoke `requireOwner(req)`; do **not** export a public route that takes owner context from client JSON.
- The existing draft database `status` enum has `draft,invited,active,paused,completed,archived,cancelled`; the UI's `Scheduled` is only a workflow label and must not be persisted as an unrecognized status.
- Session dates are stored as `scheduled_at timestamptz`; timezone/DST resolution is needed before creating confirmed sessions. The current planner remains proposal-only.
- Write operations must reject edits to active/completed enrollments unless explicitly allowed by policy.
- Draft helper tests were committed previously, but CI green status and complete coverage still require verification.
