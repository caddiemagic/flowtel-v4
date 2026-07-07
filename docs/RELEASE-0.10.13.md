# Flowtel v0.10.13 — 13 Moon Path Time Vault + Row Layout Polish

Follow-up polish release built from v0.10.12. This release restructures the 13 Moon Path visually and turns the Ouroboros Moon into a true one-year mystery vault.

## What changed

- Reworked the Initiation Hall temple-door layout into:
  - Row 1: Months 1–6
  - Row 2: Months 7–12
  - Final row: the centered Ouroboros Mystery Moon / Time Vault
- Locked the Ouroboros Moon until the same calendar day one year after the member joined Flow FM.
- Updated initiation status logic so Month 13 does not open early just because the anniversary month has started.
- Added a sealed Time Vault presentation on `/flow-fm/portal/?portal=13` until the anniversary date arrives.
- Updated the 13 Moons Path page to reflect the same mystery-vault behavior.

## Supabase

No Supabase migration required.

## Syntax checks

Run before shipping:

```bash
node --check flow-fm/app.js
node --check flow-fm/portal/page.js
node --check flow-fm/moons/page.js
node --check shared/initiation.js
node --check shared/flowtel.js
```

## First test after deploy

1. Open `/flow-fm/`.
2. Confirm the first twelve moon doors render as two rows of six.
3. Confirm the final Ouroboros door renders separately as a centered mystery Time Vault.
4. Confirm the Time Vault is sealed before the member's one-year anniversary date.
5. Attempt `/flow-fm/portal/?portal=13` before the anniversary and confirm it shows a locked vault state, not the live Month 13 content.
6. Open `/flow-fm/moons/` and confirm the Mystery Moon is also shown as sealed before the anniversary.
7. Confirm no timezone, review desk, or database structure changed.
