# Caddie Magic v0.4.2 — Player Invitation Code Hotfix

## Problem repaired

Creating a player invitation returned:

`function gen_random_bytes(integer) does not exist`

The `pgcrypto` extension already existed in the Supabase `extensions` schema, while the invitation function used a restricted search path that did not include that schema. Because `CREATE EXTENSION IF NOT EXISTS` does not relocate an existing extension, the unqualified function call could not be resolved.

## What changed

- Added `database/migration-045-caddie-magic-player-invite-code-hotfix.sql`.
- Replaced the invitation-code generator with two PostgreSQL UUID values combined into a 36-character random code.
- Removed the invitation function's dependency on `gen_random_bytes()`.
- Updated migration 044 so fresh installs use the repaired generator from the beginning.
- Did not change invitation claiming, Player-Only Access, Flowtel blocking, expiration dates, email matching, or manager controls.

## Supabase

Run:

`database/migration-045-caddie-magic-player-invite-code-hotfix.sql`

Migration 044 has already been installed in the affected project, so migration 045 is the repair to run now. Do not rerun migration 044 solely for this issue.

## First test checklist

1. Run migration 045 in Supabase SQL Editor.
2. Refresh the Concierge Desk.
3. Open **Caddie Players**.
4. Enter the tester's email and optional name / expiration.
5. Select **Create Player Invite**.
6. Confirm an invitation link appears with no database-function error.
7. Copy the invitation link and open it in a private browser.
8. Confirm the invited email and invitation code are accepted.
