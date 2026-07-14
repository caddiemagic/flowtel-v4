# Flowtel v0.10.23 — Queendom Moon Magic Widget

Shipped: July 2026

## Summary

This release adds the embeddable Moon Magic widget for the Queendom homepage and lightens the beta request form before broader beta testing.

## What changed

- Added `/moon-widget/`, a public iframe-friendly Moon Magic card for Squarespace.
- The widget displays the current Moon phase, Moon day, theme/action guidance, Next New Moon date, and Flowtel Time date.
- Added a **Check Into the Flowtel** button that routes to `/client/?membership=queendom`.
- Removed **How are you currently tracking?** from the beta request form.
- Changed remembered-room-key login copy from “Your Flowtel room key is still warm” to **“We’re logging you in.”**
- Added the `/moon-widget` Vercel rewrite.

## Squarespace embed

Add this to a Squarespace Code Block after deployment:

```html
<iframe
  src="https://app.theflowtel.com/moon-widget/"
  style="width:100%; border:0; min-height:360px;"
  loading="lazy"
></iframe>
```

## Supabase

No migration required.

## Syntax checks

- `node --check beta-request/app.js`
- `node --check client/app.js`
- `node --check moon-widget/app.js`
