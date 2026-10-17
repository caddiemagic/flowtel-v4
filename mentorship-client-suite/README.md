Current launch status and remaining acceptance checks: [LAUNCH-REVIEW.md](LAUNCH-REVIEW.md).

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

`my-mentorship/` opens My Dashboard. My Suite links directly to `/client/?suite=1`; My Flow links directly to `/flow-map/`. My Calls combines upcoming sessions, session history and the private replay library. The single-enrollment case opens automatically. Program titles come from a restricted projection of the enrollment offering snapshot; the full snapshot is not sent to the client. The dashboard selects the current Pacific month focus and excludes historical calls from the next-call card. Recorded cycle information is explicitly dated and fetched through the existing consent-aware RPC using the client's JWT. Existing check-in behavior is unchanged.

Zoom links are shown only for confirmed sessions linked to a scheduled external appointment belonging to that client, and only HTTPS Zoom hosts are accepted. This does not create or synchronize appointments.

`client-suite-preview/` uses the identical rendering code with an explicitly fictional, in-memory adapter. It does not load real authentication, fetch client data, send invitations, book appointments, or play real recordings. Use it to review the layout without a client account.

The owner-triggered live Supabase diagnostic passed, including temporary account creation, private upload/media delivery, cross-client isolation, and cleanup; the owner supplied the successful report screenshot. Automated Vercel browser access remains restricted. Current automated results and the exact verification scope are recorded in LAUNCH-VERIFICATION.md.

## Session details and calendar downloads

Clients can open a session detail dialog, see that session month's client-visible focus when present, jump directly to its published recordings, and download a private iCalendar file for confirmed sessions. Calendar files use UTC start/end instants, escaped/folded text, stable session UIDs, and no attendees, invitation delivery, or signed playback links. The dashboard section is preserved in the URL fragment on refresh and supports browser back/forward. Recording search and a session filter operate only on already authorized replay metadata. Switching rooms pauses playback, and starting a recording pauses other players.

## Existing Acuity booking links

Owner-defined class names:
- `four_sessions` flexible calls → `1:1 Intuitive Coaching + Energy Reading`.
- Empowerment calls → `Madly In Love Mentorship Call`.
- Activation calls have no configured class and retain manual date entry.

The owner can list matching existing Flowtel appointment records, link one to a mentorship session, refresh its saved details, or unlink it. Matching requires a verified linked client account, the correct Flowtel source product, exact normalized Acuity class name, matching duration, and an unused booking. Unclaimed clients cannot be matched by browser-supplied email. Duplicate and concurrent links are rejected through the existing appointment uniqueness constraint and conditional writes.

No requests create, cancel, reschedule, or import appointments in Acuity. This increment does not add service types or change shared scheduling configuration. It uses appointments already received into Flowtel. Once linked, clients read the saved appointment's latest time/status and safe Zoom location, with ownership and class checks repeated. Wrong-class or unavailable appointments do not display a stale confirmed time or Zoom link. Manual time edits require unlinking first.

76 automated tests and the expanded fictional owner/client browser journey passed locally.

## Owner monthly focus editing

The owner desk loads the saved client-visible focus for the selected enrollment and Pacific calendar month. An enrollment/month-scoped read returns only month and client-visible text after owner authorization. Unsaved edits are retained in memory while switching months or clients, then cleared on sign-out; they are not stored in browser storage. Stale lookup responses cannot fill another client/month editor, and saving is disabled until the requested month loads. No schema migration or product-access change is needed.

## Recording upload recovery

The owner sees authorization, transfer and saving stages. If transfer succeeds but saving details fails, Retry saving recording reuses the uploaded file while this editor remains open. It does not persist signed tokens or files to browser storage. Empty browser MIME values can use supported filename extensions; server Storage metadata validation still applies. New replay IDs use the randomized upload UUID and the existing primary key to prevent duplicate finalization, including concurrent attempts. Existing recordings retain their original title and visibility on retry. A transferred file is still private until explicitly published. Page reload or leaving the editor can discard recovery state; interrupted uploads can leave private unlisted objects.
