# Flowtel v0.10.18 — Squarespace API Bridge for Phase 1 Beta

Server-side Squarespace member verification applied to the latest v0.10.17 Phase 1 beta build.

## What changed

- Added `/api/squarespace-bridge` as a Vercel serverless endpoint.
- The Flowtel member doorway now verifies the entered email through the Squarespace Contacts API before preparing the Flowtel room.
- The Squarespace API key stays server-side in Vercel and is not exposed in browser code.
- The bridge can optionally prepare a confirmed Supabase Auth user when `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are configured in Vercel.
- Flowtel stores Squarespace contact metadata on the profile:
  - `squarespace_contact_id`
  - `squarespace_contact_email`
  - `squarespace_contact_synced_at`
  - `squarespace_verified_at`
- Updated the member bridge copy from temporary beta language to Squarespace member bridge language.
- Preserved Phase 1 rollout gates from v0.10.14–v0.10.17: guest flow and Profile Studio stay open; Clock In, Concierge Desk, and broader practitioner ecosystem stay closed.

## Required Vercel environment variables

Add these in Vercel Project Settings → Environment Variables:

```bash
SQUARESPACE_API_KEY=your_squarespace_api_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_URL=https://your-project.supabase.co
FLOWTEL_BRIDGE_PASSWORD=FlowtelMemberBridge!2026
```

Optional:

```bash
FLOWTEL_ALLOWED_ORIGIN=https://your-flowtel-domain.vercel.app
FLOWTEL_BRIDGE_ALLOW_UNVERIFIED=0
```

## Supabase

Run:

```sql
database/migration-027-squarespace-api-bridge.sql
```

This migration only adds Squarespace contact metadata columns and indexes to `public.profiles`.

## First test after deploy

1. Confirm a tester email exists in Squarespace Contacts.
2. Confirm Vercel environment variables are set.
3. Redeploy Vercel.
4. Run migration 027 in Supabase.
5. Open `/client/?membership=queendom` or `/client/?membership=flowfm`.
6. Enter the same tester email used in Squarespace.
7. Click `I'm New`.
8. Confirm the bridge says it is checking Squarespace membership.
9. Confirm the tester reaches the Flowtel check-in screen.
10. Confirm the tester profile stores the Squarespace contact metadata.
11. Test `I've Stayed Before` with the same email.

## Syntax checks

- `node --check api/squarespace-bridge.js`
- `node --check client/app.js`
- `node --check shared/profiles.js`
