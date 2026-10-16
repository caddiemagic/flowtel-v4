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
