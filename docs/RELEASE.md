# 🌹 Flowtel Release 0.4.6

## Feature
Wheel proof patch only

## Changed Files

- `client/app.js`
- `docs/RELEASE.md`

## Database

None.

## What Changed

This release intentionally makes only a tiny proof patch so we can confirm the live app is receiving the updated release files.

Inside `renderWheel()`, the Medicine Wheel now renders two visible inline proof labels:

- `Compass Medicine Wheel 0.4.6`
- `WHEEL PATCH 0.4.6`

The labels are rendered directly inside `medicineWheel.innerHTML` with inline styles so they cannot be hidden by existing CSS.

No design refinements are included in this release.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.6/client/app.js
```

Copy:

```txt
Release-0.4.6/docs/RELEASE.md
```

into:

```txt
flowtel-v4/docs/RELEASE.md
```

## Commit

```bash
git add .
git commit -m "Release 0.4.6 - Wheel proof patch only"
```
