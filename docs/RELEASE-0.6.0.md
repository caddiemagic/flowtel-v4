# Flowtel Release 0.6.0 — Squarespace Identity Bridge

## What changed

This release adds the first Squarespace → Flowtel identity bridge.

Squarespace still protects the member-only doorway. Flowtel now reads the doorway source:

- `membership=queendom`
- `membership=flowfm`
- `membership=council`

and uses it to create or update the member's Supabase profile.

Existing Supabase profiles always win. A lower doorway cannot downgrade a higher membership.

## Entry links

Use these buttons inside the matching Squarespace member areas:

Queendom:

```text
https://flowtel-v4.vercel.app/client/?membership=queendom
```

Flow FM:

```text
https://flowtel-v4.vercel.app/client/?membership=flowfm
```

Council:

```text
https://flowtel-v4.vercel.app/client/?membership=council
```

## Optional auto bridge

If Squarespace code injection later exposes the member email, Flowtel can auto-enter with:

```text
https://flowtel-v4.vercel.app/client/?membership=flowfm&email=MEMBER_EMAIL&auto=1
```

For now, the bridge asks for the member email once.

## Install

Replace/add:

```text
client/index.html
client/app.js
client/styles.css
shared/profiles.js
shared/flowtel.js
shared/membership.js
database/migration-006-squarespace-identity-bridge.sql
```

Run the migration in Supabase SQL Editor before testing the bridge.

## Commit

```text
Release 0.6.0 - Squarespace identity bridge
```
