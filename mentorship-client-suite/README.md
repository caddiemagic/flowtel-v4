Current launch status and remaining acceptance checks: [LAUNCH-REVIEW.md](LAUNCH-REVIEW.md).

# Flowtel Mentorship Client Suite — development

Use `/mentorship-client-suite/` for the cohesive preview entrance:
- Owner: `connected-concierge/` (existing owner Concierge authorization).
- Client: `my-mentorship/` (existing Supabase account; enrollment ownership required).
- Earlier fictional design tools remain under `planning-preview.html`, `enrollment-workspace/` and `client-suite-preview/`.

## Implemented

Automatic calendar end dates, persisted enrollment drafts, prepared verified-email claim with an optional owner-triggered access email, session plans, Pacific time proposals/rescheduling, confirmation/completion/cancellation, client-visible monthly focus, private owner uploads, explicit recording publication/hiding, and five-minute client playback links. Uploads bypass Vercel body limits using the existing private bucket's signed upload protocol. Recordings start hidden; finalization checks actual object metadata. Storage MIME and 500 MB limits remain unchanged.

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

The initial suite is live in Flowtel after the owner-authorized October 17 release. The access-email follow-up adds explicit owner-triggered sending; no messages are sent by creating or preparing an enrollment. Automated Acuity bookings remain outside scope. Acuity and Zoom synchronization, automatic cycle analytics in the mentorship dashboard, and Beginning & Becoming reflections remain outside this increment. Existing Flowtel cycle/Flow Map navigation is available subject to the existing product gates.

Signed playback links remain usable for up to five minutes after hiding a recording; hiding blocks issuance of new links immediately. Interrupted uploads can leave private unlisted objects; no client can discover them through this feature.

## Connected client dashboard

`my-mentorship/` opens My Dashboard. The My Suite tab is replaced by an on-dashboard cycle summary and Check into the Flowtel today button. My Flow links directly to `/flow-map/` in a new browsing context. My Calls combines upcoming sessions, session history and the private replay library. The single-enrollment case opens automatically. Program titles come from a restricted projection of the enrollment offering snapshot; the full snapshot is not sent to the client. The dashboard selects the current Pacific month focus and excludes historical calls from the next-call card. Recorded cycle information is explicitly dated and fetched through the existing consent-aware RPC using the client's JWT. Existing check-in behavior is unchanged.

Zoom links are shown only for confirmed sessions linked to a scheduled external appointment belonging to that client, and only HTTPS Zoom hosts are accepted. This does not create or synchronize appointments.

`client-suite-preview/` uses the identical rendering code with an explicitly fictional, in-memory adapter. It does not load real authentication, fetch client data, send invitations, book appointments, or play real recordings. Use it to review the layout without a client account.

The owner-triggered live Supabase diagnostic passed, including temporary account creation, private upload/media delivery, cross-client isolation, and cleanup; the owner supplied the successful report screenshot. Automated Vercel browser access remains restricted. Current automated results and the exact verification scope are recorded in LAUNCH-VERIFICATION.md.

## Session details and calendar downloads

Clients can open a session detail dialog, see that session month's client-visible focus when present, jump directly to its published recordings, and download a private iCalendar file for confirmed sessions. Calendar files use UTC start/end instants, escaped/folded text, stable session UIDs, and no attendees, invitation delivery, or signed playback links. The dashboard section is preserved in the URL fragment on refresh and supports browser back/forward. The separate Call Replay Library shows all authorized recordings in descending call-date order, with added-date fallback; no recording search or session filter is shown. Switching rooms pauses playback, and starting a recording pauses other players.

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

## Dashboard cycle summary and direct links

The dashboard shows cycle day, Inner Season and count of saved reflections on that cycle day across visits. It reuses the consent-aware cycle-data RPC, the existing cycle-start/Pacific-date convention and shared Inner Season rules, including Receiving Season. It does not infer a new period or reset the cycle. Without a start date, it labels the last recorded day. Last check-in is shown explicitly. Reflection totals use an authenticated HEAD count scoped to the user's reflections and stays, including legacy cycle-day fallback, without retrieving reflection text. Count failure appears as unavailable, not zero. No check-in or reflection is written.

The two bottom cards are simply Call Replays and My Flow Map. Both open separately with noopener/noreferrer; the dashboard stays open. The replay link retains the selected enrollment and opens the library; the new page still checks client ownership. Browser settings decide whether a new context is a window or tab.

## Direct replay library

My Dashboard and My Calls link to a separate library view (`?view=replays&enrollmentId=…`). It displays every published recording in the selected authorized mentorship on one page, newest call date first; records without a call date use their saved date, and undated records follow last. The selected enrollment is verified through the normal client API. No signed playback URLs are passed between windows. My Calls shows two destination cards: Call Replay Library and My Flow Map. Both open separately, retaining the dashboard. The My Flow tab and recording search/filter controls are removed. Session-detail recording access also opens the full library.

## Owner-triggered access email
After preparing access, Manage shows the server-generated recipient, subject, full welcome text and access link. Only Send access email contacts Resend; database recipient/status are rechecked on every send. Existing Flowtel sender configuration is reused (RESEND_API_KEY and FLOWTEL_FROM_EMAIL, with the existing Guest House sender fallback; optional FLOWTEL_EMAIL_REPLY_TO). No secret values are exposed. Missing configuration disables sending and leaves the copyable access link available.

The message explains existing-account sign-in and directs new users to the unchanged /client/ membership/account entrance, then back to their exact mentorship. This is a welcome/access message, not a magic-login link or an Auth account invitation. No account creation, password reset, membership grants, or check-in writes occur. Provider acceptance is reported separately from inbox delivery. No persistent delivery/open tracking is added.

Repeated identical sends use a stable Resend idempotency key; Resend retains keys for 24 hours. A later deliberate send can deliver again. Reference: https://resend.com/docs/dashboard/emails/idempotency-keys .

## Archive old clients
Owner Manage includes Archive client with a confirmation. The Current clients view excludes archived enrollments at the server query; Archived clients has its own query so archived records do not consume the current-list limit. Archive changes only mentorship status/updated_at, retaining recordings, sessions, focus, account and other product permissions. Existing client suite/playback/claim eligibility excludes archived records; no new replay URLs can be issued. Previously signed playback links may remain usable for up to five minutes; external appointments are not cancelled.

Restore client is available in the archived view: linked enrollments return paused (with mentorship access), while unclaimed ones return draft and require access preparation again. Original pre-archive status is not persisted. Both actions require owner authorization and use conditional status writes to reject concurrent changes. No migration or deletion is performed.

## Private Flowtel suite doorway
My Mentorship starts hidden in the existing Flowtel suite HTML. A feature-local controller shows it only after authenticated client API responses confirm a linked eligible mentorship or verified-email prepared access. It does not consult editable user metadata, email URL parameters, or broad Queendom membership. Draft, archived, cancelled and unrelated guest accounts do not qualify; paused/completed linked clients retain access until archived, matching existing replay retention behavior. Sign-out clears immediately; return focus and suite rendering recheck eligibility. Failures stay hidden, and stale account responses cannot restore the link after sign-out. Server-side authorization still protects all mentorship data.

My Mentorship opens separately from the Flowtel suite; the mentorship header and footer have clearly labelled My Flowtel Suite links that also open separately. Daily check-in, product permissions and session authentication logic are unchanged.

## Client connection Concierge
The Concierge now uses the same blush, ivory, warm earth and rose gold palette as the client dashboard, with the existing Flowtel wax seal. The directory opens each client’s space rather than a management form. Her overview shows the mentorship’s client-visible monthly focus, dates, session/replay metrics, upcoming calls and current/recorded cycle context. Calls have a direct replay-upload selector and a compact, expandable schedule editor. Dates/access/email/archive and monthly focus editing are separate expandable controls.

Owner profile reads resolve the subject from the selected enrollment. The shared client suite projection supplies identical published dashboard content and linked appointment details, without minting a client token or impersonating her. /owner-dashboard/ uses the actual client renderer in explicit read-only owner-preview mode; the server always requires owner authorization. Private owner playback validates enrollment/session/replay ownership and issues a five-minute URL. Hidden recordings remain owner-only.

Cycle names, current rhythm and recent check-ins/reflections use existing flowtel_get_cycle_subject_snapshot and flowtel_get_cycle_data_entries RPCs with the owner’s JWT and their existing consent/role checks. The latest reflection from each of up to 60 recent check-ins is shown, with more entries revealed in batches. A full authorized Flow Map link is provided. Total check-ins use a scoped HEAD count under owner-user RLS; missing counts are not fabricated. No service-role bypass is used for cycle/reflection reads; no SQL schema/policy changes are needed. Unclaimed accounts and denied/unavailable sharing have explicit states.

Both browser journeys run in CI: browser-e2e.cjs preserves the owner/session/focus/private-media workflow; concierge-browser.cjs covers collapsed editors, direct upload/publication/playback, read-only client preview, mobile fit and stale-client isolation.
