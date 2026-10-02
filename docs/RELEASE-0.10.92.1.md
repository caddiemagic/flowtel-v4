# Flowtel v0.10.92.1 — Call Your Caddie Form + Anonymity Polish

Release date: October 1, 2026

## Purpose

Small launch polish for the native Call Your Caddie voice-note experience. This release does not alter the mailbox audio architecture, five-minute limit, first-listen behavior, OBS workflow, or no-Twilio Phase 1 boundary.

## Player experience

- Removes **Got a golf problem? / Leave it with your Caddie.** from the hero.
- Replaces the previous explainer with exactly:
  1. **You have a problem or an observation**
  2. **You record a voicemail and tell me about it**
  3. **Tune in to the Call Your Caddie podcast for my response**
- Enlarges the First Name and Handicap inputs.
- Combines recording + media-use consent into one required checkbox.
- Adds optional **Please do not use my name in the podcast**.

## Privacy behavior

The submitted first name remains private Caddie Master metadata even when anonymity is requested. The owner Mailbox displays **ANONYMITY REQUESTED** so the request is explicit, while Studio Mode uses **ANONYMOUS** anywhere the caller identity could appear during a public-facing recording workflow.

## Migration

Run `database/migration-080-call-your-caddie-anonymity.sql` once before deploying the frontend patch. Migration 080 adds the `anonymity_requested` flag and a v2 submission RPC while preserving the migration-079 submission overload for stale in-progress clients. Migration 081 is next.

## Infrastructure

- No Twilio dependency.
- No new environment variables.
- No new Vercel function.
- Vercel remains 12/12.
