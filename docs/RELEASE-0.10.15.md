# Flowtel v0.10.15 — Login Recovery + Rollout Hardening

Emergency recovery release after v0.10.14 Phase 1 rollout.

## Why this release exists

v0.10.14 introduced a new shared rollout helper. If the deploy missed that new file, or if cache/deploy order loaded an old bundle against a new import, the browser could fail module loading before the client login app initialized.

This release keeps the Phase 1 gates in place but removes the guest login app's fragile dependency on that new helper during initial load.

## What changed

- Removed the direct `client/app.js` static import of `shared/rollout.js`.
- Made Clock In gating local inside the guest/client app.
- Removed the `shared/relationships.js` static import of `shared/rollout.js`.
- Made Phase 1 mentor filtering local inside the relationships helper.
- Preserved the Phase 1 behavior:
  - Guest flow open.
  - Profile Studio open.
  - Clock In disabled.
  - Mentor list narrowed to admin/owner accounts.
  - Full Flow FM curriculum remains sealed for guest testers.

## Supabase

No Supabase migration required.

## Syntax checks

Run before shipping:

```bash
node --check client/app.js
node --check shared/relationships.js
```

## First test after deploy

1. Open `/client/`.
2. Hard refresh once.
3. Confirm the login panel appears.
4. Sign in with a known test account.
5. Confirm Clock In is still hidden.
6. Open mentor selection and confirm only the founding admin/owner mentor appears.
7. Open `/flow-fm/profile-studio/` and confirm Profile Studio still loads.
