# Development verification — 2026-10-15

Base inspected: ac923ee48440e379c89a508a590eb9e93c478b93.
Parallel branch inspected: feature/13-moons-vortex-release1 at 9396a9c0a39aaa535ef5d3f914707161353f09e8.
Main inspected: 5076049e90de13683703086d7c69ee063e8eb170.

## Verified locally

- Baseline: 31 passing, 3 failing. Fixed unauthenticated handler responses without changing shared authentication and corrected overescaped timestamp parsing.
- 52 unit/security/HTTP integration tests pass.
- Call Your Caddie behavior and Kingdom membership bridge regression tests pass.
- Owner/client inline module syntax checks pass.
- HTTP journey exercises owner auth, status transitions, rescheduling, focus, private upload metadata, publication, client playback, hiding, and cross-client denial with fictional local identities.
- Supabase read-only inspection confirms five RLS-enabled mentorship tables and the existing private 500 MB replay bucket. Existing owner RPC remains owner-restricted. No schema or live client data changed.

## CI and deployment evidence

- Browser journey passed in GitHub Actions run 38826781370 for implementation commit 88b76dd2d18567bce83bd44a47cf7ef90a67b514. All 52 tests and the Playwright owner/client A/client B journey succeeded. Chromium remains unavailable locally.
- Vercel Git integration reports a successful preview deployment for implementation commit 88b76dd (deployment dpl_DN6VaZ86GZRKM2nExm7MShx1faM2).
## Not yet verified

- Real Supabase Auth/Storage end-to-end upload/playback with disposable accounts has not run. Local tests use service contract doubles.
- Vercel connector sees the Caddie Magic team but returns no Flowtel project or branch deployments; direct lookup by team ID and project name returns 404. GitHub reports the base commit's Vercel deployment succeeded. The preview URL reaches Vercel login protection. The authenticated web-fetch tool returned 403 at read_protection_bypass for the exact deployment. The connected Vercel account cannot authorize access to this project/deployment. Reauthorize existing flowtel-v4 under caddie-magic before deployed verification. No protection setting was changed.
- Legacy `scripts/test-member-integrity.mjs` cannot start because its referenced `api/beta-request.js` is absent in the base branch; no unrelated module was added to make it pass.

## Shared surfaces

Only additive links in client/index.html and manager/index.html, plus private/noindex headers scoped to mentorship-client-suite in vercel.json. No shared authentication JS, entitlement logic, check-in code, Stay code, Caddie Magic code, 13 Moons files or migrations were edited. The parallel branch currently changes neither these HTML files nor vercel.json, so no conflict is present on those surfaces at the inspected heads. Recheck all heads before eventual integration.

## Remaining release gate

Browser CI is green. This record does not claim a launch-ready deployed preview until actual Supabase/Vercel integration verification succeeds. No production deployment, merge, invitations or live-client onboarding.

## Client dashboard increment

Connected four-room dashboard, safe program-title projection, progress and next-call logic, current-month focus, replay library, existing cycle snapshot via the user's JWT, and client-owned linked Zoom access. No new tables, storage policies, product permissions, Stay logic or shared auth code changed. Historical sessions and cancelled-session reopening remain supported. The fictional design preview uses the same rendering module and never touches real auth or data.

61 automated tests and the expanded Playwright journey passed locally. A pinned Chromium runner is now available locally; desktop and mobile screenshots were inspected. The earlier statement that local Chromium was unavailable describes the initial pass, not the current environment. No production merge or deployment was performed.

## Session detail and recording navigation increment

Added accessible session detail dialogs, session-specific monthly focus and recording links, private iCalendar downloads for confirmed calls, recording title/session filters, URL-fragment room navigation, and playback pause behavior. No database schema, authentication, entitlement, check-in, Stay, or 13 Moons files changed.

65 unit/security/HTTP tests passed locally. The expanded browser journey passed locally, including calendar download, recording filtering, session detail navigation and preserving My Recordings on refresh. Mobile session-detail and recording-library screenshots were visually inspected. The calendar tests cover Pacific offsets, UTC end times, UTF-8 line folding, property injection, and exclusion of private playback links and attendees.

## Existing appointment linking and owner class mapping

Configured the two exact class names supplied by the owner: four 45-minute sessions use `1:1 Intuitive Coaching + Energy Reading`; empowerment calls use `Madly In Love Mentorship Call`. Activation remains manual because no activation class has been supplied. Added owner-only existing-booking matching, linking, refresh and unlink. Clients see the latest saved appointment status/time and Zoom URL after repeated ownership/class validation. Wrong-class or unavailable records fail closed.

76 automated tests and the expanded browser journey passed locally. The journey now links a fictional empowerment booking, verifies the client's Zoom link, and unlinks it without changing the original appointment. No migrations, service catalog writes, Acuity booking API writes, imports, invitations, shared authentication edits, or production changes were made. Matching currently uses existing Flowtel appointment records; this does not claim live Acuity catalog-ID verification.

## Preview owner connection check

Added a preview-only, owner-authorized diagnostic in the Connected Mentorship Desk. It creates two disposable confirmed fictional accounts through Auth Admin (no mail), prepares/claims an isolated mentorship, checks dashboard ownership and owner denial, uploads a generated silent MP3 through a signed token, verifies hidden/published/private media delivery and cross-client denial, hides it, and removes its own object, enrollment (cascading sessions/replays), and accounts. Credentials and signed links never appear in the report. Generated IDs are tracked before writes, including uncertain responses. Failed cleanup produces resource references instead of success. Production rejects this action. It never runs automatically.

Existing live Auth creation triggers and foreign keys were inspected read-only. No migrations or permission changes were applied. Test metadata does not invoke invitation, event-pass, or Guest House claiming. Profile creation uses the existing hook and cascades on account deletion. The process rejects overlapping runs from the same owner; this is not a distributed lock across serverless instances.

Fixed playback URL construction for Storage REST's `/object/sign/…` response relative to `/storage/v1`, verified against Supabase storage-js source. The fictional server now emits that format.

79 automated tests plus the expanded Chromium journey passed locally, covering the diagnostic, production/non-owner denial, service failures, cleanup and cleanup failure reporting. The live diagnostic has NOT yet run against the connected Supabase project: automated access to the protected Vercel deployment remains unavailable. Its button permits the check from the authenticated owner preview. Success verifies signed media bytes, not browser audio decoding or live Acuity synchronization. A transport timeout leaves cleanup unverified and the UI says so. Hiding blocks new playback links; previously issued links may remain usable until expiry/cache eviction.

## Connected-project result and dashboard resilience

On October 15, 2026 (Flowtel Time), the owner supplied a screenshot of the deployed diagnostic reporting every live step and all cleanup steps passed: private bucket, two disposable accounts, owner denial for clients, prepared/claimed dashboard access, signed upload, hidden recording, published media bytes, cross-client isolation, hiding, and removal of media, mentorship/session records, and both accounts. This closes the connected-project diagnostic gate described above. The screenshot is evidence of the owner-triggered report; it does not add a claim of browser audio/video decoding or live Acuity API synchronization.

Added All / Upcoming and to be arranged / Session history filters in My Calls, including historical confirmed/proposed sessions and terminal statuses. Fixed prepared-access discovery failures blocking already linked suites, and cleared previous media sources and session dialogs immediately on program refresh/switch. No authentication, database, product-permission, shared navigation, check-in, Caddie Magic, or 13 Moons changes.

80 automated tests and the expanded local Chromium owner/client journey passed. New browser checks cover call filters, existing-suite availability during prepared-access discovery failure, and clearing an open private session dialog/media on a failed refresh.

## Preview route collision correction

The owner's screenshot revealed Vercel cleanUrls was resolving `/mentorship-client-suite/client-suite-preview/` to the older sibling `client-suite-preview.html`, ahead of the new directory index. Renamed the older prototype to `client-suite-preview-legacy.html`, preserving it while removing the collision. The test server now models extensionless HTML precedence and the browser journey asserts the updated navigation and luxury stylesheet at the canonical preview URL. All 80 automated tests and the browser journey passed locally. No Vercel project settings or shared routes were changed.
