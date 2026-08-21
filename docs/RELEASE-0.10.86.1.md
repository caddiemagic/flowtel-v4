# Flowtel v0.10.86.1 — Personal Cosmology Storage Policy Hotfix

**Release type:** narrow production hotfix
**Base release:** v0.10.86 — Moon Mail + Personal Cosmology
**Migration:** `database/migration-072-personal-cosmology-storage-policy-hotfix.sql`

## Why this hotfix exists

Migration 071 correctly made `public.flowtel_member_cosmology` private by revoking direct `anon` and `authenticated` table access. Its first Human Design Storage SELECT policy, however, directly queried that revoked table from a `storage.objects` policy.

Supabase can evaluate SELECT policies on `storage.objects` while authorizing signed/private reads from other buckets. As a result, opening an existing private asset such as the **Four Seasons Flowtel Workshop** could fail with:

`permission denied for table flowtel_member_cosmology`

The Lounge video itself was not the problem. The new Personal Cosmology Storage policy was interfering with the shared Storage authorization surface.

## Fix

Migration 072:

- keeps direct browser-role access to `flowtel_member_cosmology` revoked;
- adds `public.flowtel_can_read_cosmology_storage_object(bucket_id, object_name)` as a `SECURITY DEFINER` authorization helper;
- returns `false` immediately for every bucket except `flowtel-personal-cosmology`;
- safely derives the chart owner only inside the Personal Cosmology bucket;
- delegates the actual member/practitioner decision to the existing `flowtel_can_view_member_cosmology` consent/relationship boundary;
- replaces the active Human Design `storage.objects` SELECT policy so it no longer directly queries the private table as `authenticated`.

This is intentionally safer than granting `authenticated` SELECT access to the cosmology table.

## Privacy contract preserved

Personal Cosmology remains:

- private to the member by default;
- visible to a practitioner only after explicit member sharing plus an active authorized Mentor or Womb Magic relationship;
- absent from Team Map/public profile/directory data paths;
- stored in a private Human Design chart bucket;
- unrelated to event-host or general Flow FM practitioner permissions.

The hotfix does not change Moon Mail, Stay history, Flowtel Time, Powder Room anonymity, event access, Womb Magic consent, or Caddie Magic Player-first rules.

## Migration instructions

1. Confirm migration 071 has already run.
2. Run **`database/migration-072-personal-cosmology-storage-policy-hotfix.sql` once** in the same Supabase project.
3. Do **not** rerun or edit migration 071 in production.
4. Refresh the Flowtel Lounge and verify the private workshop loads without the cosmology permission error.

No environment-variable changes are required.

## First live verification

- Open the Flow FM Lounge and confirm **Four Seasons Flowtel Workshop** receives a signed video URL and plays.
- Confirm the red `permission denied for table flowtel_member_cosmology` message is gone.
- Open Personal Cosmology as the member and confirm birth/design data still loads.
- Upload/open a Human Design chart as its owner.
- With sharing OFF, confirm an otherwise active practitioner cannot open the member's chart.
- With sharing ON plus an authorized active relationship, confirm the practitioner can open it.
- Revoke sharing and confirm practitioner access ends.
- Regression-check another private Storage surface if available (event artwork/guide or Guest House/Lounge asset).

## Source validation

- `scripts/validate-personal-cosmology-storage-hotfix.mjs` verifies the active replacement policy contains no direct `flowtel_member_cosmology` subquery and that no browser SELECT grant was introduced.
- Existing v0.10.86 Moon Mail + Personal Cosmology validator remains required.
- Relevant Flowtel and Caddie Magic regression validators remain required before packaging.

**Source validated** and **live production verified** remain separate states. The screenshot/report establishes the production bug; migration 072 still needs to be run live before the fix is considered production-verified.
