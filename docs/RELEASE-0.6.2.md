# Flowtel Release 0.6.2 — Temporary Bridge Paths

## What changed

This release cleans up the temporary Squarespace bridge while the full Squarespace API bridge is blocked by plan/API access.

### Client

- Replaces the single bridge action with two clear beta paths:
  - **I'm New**
  - **I've Stayed Before**
- New members create a temporary Flowtel profile using the beta bridge password.
- Returning members are sent to the Passport/Developer login with their email prefilled.
- Changes the Passport button copy to **Enter the Flowtel**.
- Keeps the future `openMemberBridge()` function for later API/auto-bridge support.
- Improves the existing-user message so users are not shown a generic bridge failure when their account already exists.

## Files changed

- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `docs/RELEASE-0.6.2.md`

## Commit message

```text
Release 0.6.2 - Temporary bridge paths
```
