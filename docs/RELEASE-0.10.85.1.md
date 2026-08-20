# Flowtel v0.10.85.1 — Canonical Flowtel Entry

Released: August 20, 2026

## Purpose

Close the final visible Phase 1 beta doorway before the project handoff. The Queendom now has one canonical entrance into Flowtel: `/client/`.

## Canonical member arrival

The intended Queendom CTA is now simply:

**ENTER THE FLOWTEL**

pointing to:

`https://app.theflowtel.com/client/`

From there Flowtel owns the arrival state:

- a valid remembered Supabase session continues automatically;
- an existing member who is signed out sees email/password sign-in;
- a first-time eligible member uses **FIRST TIME HERE? CREATE YOUR ACCOUNT** and is verified against the server-side Squarespace membership boundary before account creation;
- **Forgot your password?** uses the Supabase Auth recovery flow;
- an unverified/non-member email cannot manufacture Queendom/Flow FM access.

## Retired beta doorway

The member-facing **Request Flowtel Access** branch is retired from the normal product journey.

- `/enter` now redirects to `/client/`.
- `/beta-request` now redirects to `/client/`.
- the old static entry/request files also contain immediate `/client/` fallback redirects so direct legacy file URLs do not reopen the beta form.
- primary member-facing Flowtel links that previously passed through `/enter` now point at `/client/` directly; legacy/internal callers are safely caught by the canonical redirect.
- the legacy request-access API/files remain in source only for historical compatibility and old release validation; they are no longer the public member entrance.

Old bookmarks therefore remain safe instead of producing a dead page.

## Squarespace / Queendom action

Update the Queendom **ENTER THE FLOWTEL** button to use:

`https://app.theflowtel.com/client/`

This is optional for immediate compatibility because the old `/enter` URL now redirects, but it should be updated so Squarespace itself reflects the canonical architecture.

## Database / environment

No migration is required.

No environment-variable changes are required.

The next migration remains **071**.

## Preserved boundaries

This release does not change:

- v0.10.85 Squarespace membership verification;
- first-time signup admissions;
- Supabase email confirmation/recovery;
- event access / Event Pass rules;
- Womb Magic;
- one Stay per Flowtel Day;
- Flowtel Time;
- Caddie Magic v0.6.0.

## First test

1. Open the old Queendom `/enter` URL in a signed-out browser and confirm it lands on `/client/` without showing **Request access**.
2. Open `/beta-request` and confirm it also lands on `/client/`.
3. With a remembered valid session, open `/client/` and confirm Flowtel continues automatically.
4. Sign out and confirm email/password, **Forgot your password?**, and **First time here? Create your account** are available.
5. Confirm an eligible first-time Queendom member can continue through membership verification.
6. Confirm a non-member email remains blocked from creating Queendom access.
