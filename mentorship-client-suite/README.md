# Flowtel Mentorship Client Suite — development

Use `/mentorship-client-suite/` for the cohesive preview entrance:
- Owner: `connected-concierge/` (existing owner Concierge authorization).
- Client: `my-mentorship/` (existing Supabase account; enrollment ownership required).
- Earlier fictional design tools remain under `planning-preview.html`, `enrollment-workspace/` and `client-suite-preview/`.

## Implemented

Automatic calendar end dates, persisted enrollment drafts, prepared verified-email claim without email delivery, session plans, Pacific time proposals/rescheduling, confirmation/completion/cancellation, client-visible monthly focus, private owner uploads, explicit recording publication/hiding, and five-minute client playback links. Uploads bypass Vercel body limits using the existing private bucket's signed upload protocol. Recordings start hidden; finalization checks actual object metadata. Storage MIME and 500 MB limits remain unchanged.

Owner/client handlers are already dispatched by `api/caddie-acuity.js?mentorship=owner|client`. Their historical DRAFT filenames do not indicate unrouted endpoints.

Flowtel client and owner navigation additions are additive. Existing auth, check-ins, Stay rules, product access and Caddie Magic APIs are unchanged. Mentorship-only users may sign into the mentorship page directly without gaining unrelated product access. Existing cycle/Flow Map rooms retain their own membership gates.

## Tests

```
node --test mentorship-client-suite/*.test.*
node scripts/test-call-your-caddie.mjs
node scripts/test-kingdom-membership.cjs
node mentorship-client-suite/browser-e2e.cjs
```

The browser command requires Playwright and its Chromium binary; branch CI installs a pinned runner. The HTTP and browser journeys use a local in-memory Supabase/Auth/Storage contract double and fictional owner/client A/client B identities. They never create live accounts or send invitations. These tests do not substitute for deployed integration verification against real Supabase services.

## Database

Read `DATABASE-APPLICATION-RECORD.md`. The base and private replay bucket migrations are already applied. No new schema migration is needed for this increment. All five mentorship tables remain RLS enabled with direct client grants revoked; server handlers authorize before service-role access. No mentorship storage policies permit direct client access.

## Release boundary

Development branch only. No production merge, real-client enrollment, invitations, or automated Acuity bookings are authorized. Acuity and Zoom synchronization, automatic cycle analytics in the mentorship dashboard, and Beginning & Becoming reflections remain outside this increment. Existing Flowtel cycle/Flow Map navigation is available subject to the existing product gates.

Signed playback links remain usable for up to five minutes after hiding a recording; hiding blocks issuance of new links immediately. Interrupted uploads can leave private unlisted objects; no client can discover them through this feature.

## Connected client dashboard

`my-mentorship/` now uses the shared dashboard layout with four rooms: My Suite, My Calls, My Recordings and My Flow. The single-enrollment case opens automatically. Program titles come from a restricted projection of the enrollment offering snapshot; the full snapshot is not sent to the client. The dashboard selects the current Pacific month focus and excludes historical calls from the next-call card. Recorded cycle information is explicitly dated and fetched through the existing consent-aware RPC using the client's JWT. Existing check-in behavior is unchanged.

Zoom links are shown only for confirmed sessions linked to a scheduled external appointment belonging to that client, and only HTTPS Zoom hosts are accepted. This does not create or synchronize appointments.

`client-suite-preview/` uses the identical rendering code with an explicitly fictional, in-memory adapter. It does not load real authentication, fetch client data, send invitations, book appointments, or play real recordings. Use it to review the layout without a client account.

Current dashboard verification: 61 unit/security/HTTP tests and the owner/client A/client B Playwright journey passed locally, including the fictional dashboard and mobile overflow check. Desktop and mobile screenshots were visually inspected. Real protected deployment verification remains subject to the previously recorded Vercel connection restriction.
