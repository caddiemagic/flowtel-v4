# Flowtel v0.10.94 — Kingdom Experience

Caddie Magic v0.8.0. Built against GitHub main e274668 (v0.10.93.2). This is a source release; production has not been migrated, deployed or emailed by this work.

## Included

- Red Call Your Caddie button in the player profile; Return to Locker Room on the public recorder. Player login and public mailbox remain separate.
- Assignment studio linked from Caddie Master: individual player, active players, active players with 28+ completed rounds, or active Caddies. Preview recipients before sending. Players save reflections and complete assignments; the owner reads and reviews responses. A completed 9-hole or 18-hole round counts once; reflections and unfinished rounds do not count.
- 9/18-hole rounds, total-only or hole scores, saved unfinished rounds and resuming from the Hole Wheel. Raw scores mapped around a wheel and filtered by moon phase. No par or course metadata. Historical totals retain unknown length; different round lengths are separated in the Score Map. Partial rounds remain private.
- Sequential typed Cardinal Clubs with the approved four-club question, no yellow instinct text, exact p/putter rejection, NEWS placement and putter center. Existing public consecration and owner review preserved.
- Sea of Sirens: private audio library with Meditations, Hypnosis, Breathwork and Siren Calls. Owner upload, publication and management; Kingdom or VIP access. VIP is currently one manually managed entitlement, not multiple paid VIP offers.
- Staged $69 one-time Kingdom purchase verification, account reuse/invitation, refund reconciliation, signed Squarespace purchase webhook, and separate Kingdom/Flowtel email branding through Resend and a signed Supabase auth hook.

## Database and deployment

Read-only production introspection found migration 082's compass submission table absent. The unchanged 082 is included in the patch ZIP. Run 082, then 083, then 084 before publishing this frontend. Source migrations now end at 084; 085 is next. Back up the production database before applying migrations.

No new Vercel function: 12/12. No Twilio. Existing Flowtel Time, one-Stay-per-day logic, mailbox and other product grants are preserved. Existing player access is retained; refund reconciliation does not remove pre-existing access.

Paid registration remains off until configured. Email customization is staged; the existing auth mail continues until you activate the new hook. See KINGDOM-LAUNCH-SETUP.md and LIVE-TEST-v0.10.94.md.

## Validation

Actual migrations 082–084 executed against local PostgreSQL fixtures using PGlite, including role/RLS, storage access, assignment audiences, partial scores, paid grants, refunds, preserved access and deduplication. Chromium exercised desktop/mobile UI with mocked backend calls. Email, purchase and webhook tests used provider mocks; no live payment, invitation or message was sent. Existing mailbox, Acuity/Womb Magic, member/event and function-budget checks passed. Historical exact-version validators are not proof of this release and may retain baseline drift.

ZIP integrity, binary patch reproduction from e274668, JavaScript syntax and git diff whitespace checks are part of packaging. Live auth, Storage upload, real purchase and email delivery require the deployment checklist.
