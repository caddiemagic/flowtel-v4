# Flowtel v0.10.90.1 — Event Editor Validation Hotfix

**Release date:** September 30, 2026  
**Base source:** v0.10.90 — Cyclical Calendar + Event Operations  
**Database:** No migration required. Migration 076 remains latest; 077 remains next.  
**Vercel functions:** 12/12 unchanged.

## Purpose

Fix Owner Event Administration incorrectly exposing and validating the **Series sessions** controls while editing a Single or Recurring event.

The v0.10.90 HTML correctly marked the series-only labels with the `hidden` attribute, but the page stylesheet applied `display:grid` to every form label. That CSS rule overrode the browser's normal hidden rendering, so the `Series sessions` number input could remain visible and its `min="2"` constraint could block saving/importing a Single Event with the browser message **“Value must be greater than or equal to 2.”**

## Changes

- Series-only controls now have an explicit `[data-series-field][hidden] { display:none !important; }` guard.
- `Series sessions` and `Days between series sessions` are now disabled whenever Event Format is not `Series / Vortex`.
- Series/Vortex keeps the intended minimum of 2 sessions and retains its existing validation.
- Single Event and Recurring Event no longer participate in series-only browser constraint validation.
- Event Admin JS/CSS cache keys advance to v0.10.90.1.

## Boundaries preserved

No changes to:

- migration 076 or event schema;
- Acuity booking/import behavior;
- public / Queendom / Flow FM access resolution;
- Event Flow Map / attendance capture;
- Moon phase calendar layer;
- Womb Magic;
- Complimentary Stay;
- Caddie Magic;
- Vercel environment variables;
- serverless function count.

## First live test

1. Open Owner → Queendom Events.
2. Choose **Single Event**.
3. Confirm `Series sessions` and `Days between series sessions` are not visible.
4. Map/import one Acuity class occurrence and save/publish.
5. Confirm the browser does not show the minimum-2 validation error.
6. Switch to **Recurring Event** and confirm the two series-only controls remain absent.
7. Switch to **Series / Vortex** and confirm the controls appear and still require at least 2 sessions.

**Source validated does not mean live production verified.**
