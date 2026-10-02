# Flowtel v0.10.93 — Public Call Your Caddie Recorder + Radio Show Polish

## Release boundary

Flowtel v0.10.93 advances Caddie Magic to **v0.7.1**. Only the Call Your Caddie recorder becomes public. The Caddie Mailbox, Show Queue, Studio Mode, mailbox metadata, and all recording reads remain private to The Caddie Master.

Expected base: Flowtel v0.10.92.1 / GitHub `main` commit `3ed3931e7345da54594a0fb201447d1a4747d68f`.

## Public recorder

A caller no longer needs a Flowtel or Caddie Magic account to leave a message. The recorder still collects first name, handicap, combined recording/media-use consent, optional **Please do not use my name in the podcast**, and a browser voice note capped at five minutes.

Signed-in Caddie Magic Players may still receive quiet first-name/handicap prefill, but authentication is optional and failure to resolve a Player Profile never locks the recorder.

## Private upload architecture

No public Storage policy was added. The `caddie-mailbox-audio` bucket remains private.

The existing `/api/caddie-acuity` serverless function now also handles two narrow actions:

- `public-mailbox-init` — validates the request, applies rate limiting, registers one pending upload, and issues a short-lived signed upload token scoped to one private object path.
- `public-mailbox-finalize` — validates consent/name/handicap, verifies the staged upload through migration 081, and creates the final private mailbox row.

The browser never receives the Supabase service-role key and receives no bucket list/read capability.

## Abuse controls

The public recorder adds:

- same-origin request checks;
- a hidden bot honeypot;
- HMAC-SHA256 connection hashing using the existing server-only service key, so raw IP addresses are not stored;
- a maximum of 8 public upload starts per connection per rolling hour;
- a 15 MB public upload ceiling;
- existing supported-audio MIME validation;
- the existing 1–300 second duration rule;
- a two-hour signed-upload/finalization window.

## Migration 081

`database/migration-081-call-your-caddie-public-recorder.sql`:

- makes `submitted_by_user_id` and `player_profile_id` nullable for true public submissions;
- adds `public_browser_voice_note` to the mailbox source contract;
- adds the server-only `caddie_magic_public_mailbox_uploads` staging/rate-limit ledger;
- adds service-role-only begin/finalize RPCs;
- preserves the private bucket and owner-only read path.

Migration 081 must run before the frontend/API deployment. Migration 082 is next.

## Radio-show visual polish

The public page now has a voicemail-line / call-in-show treatment with broadcast indicators, waveform/meter details, and three icon-led How It Works cards. The approved copy is:

1. **You have a problem or an observation**
2. **Leave me a message**
3. **Tune in to the Call Your Caddie podcast for my response**

The number and text are visually grouped rather than split across lines.

## Infrastructure

- New Vercel functions: **0**
- Current Vercel function count: **12/12**
- New environment variables: **0**
- Twilio: **not included**
- Acuity scheduling behavior: unchanged; the existing Caddie function is reused rather than duplicated.

## Status

**SOURCE VALIDATED** after the release checks pass. Do not call this **LIVE PRODUCTION VERIFIED** until migration 081 is applied and the incognito/public recorder + owner Mailbox/Studio checks are completed in production.

## Source validation notes

The current Call Your Caddie validator/test, Caddie Magic canonical validator, v0.10.93 release validator/test, Acuity/Womb Magic validator/test, automatic membership validator/test, event-claim validator/test, v0.10.91.2 mobile-event validator/test, member-integrity validator, Vercel function-budget validator, changed-file syntax checks, all API syntax checks, and `git diff --check` pass.

Two historical checks remain pre-existing baseline drift and reproduce unchanged on the pristine v0.10.92.1 base:

- `validate-flowtel-010813-caddie-060.mjs` asserts the old exact Acuity bridge version string `0.10.81.3-0.6.0`.
- `test-member-integrity.mjs` imports the intentionally retired `api/beta-request.js`.
