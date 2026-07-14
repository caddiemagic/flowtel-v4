# Flowtel v0.10.24 — Smart Flowtel Entry

Shipped: July 2026

## Summary

This release adds a clear smart entry page between the Queendom Moon Magic widget, returning Flowtel login, and the beta access request form.

## What changed

- Added `/enter/` as the new Flowtel entry doorway.
- Updated the Moon Magic widget CTA from **Check Into the Flowtel** to **Enter the Flowtel**.
- The Moon Magic widget now sends guests to `/enter/?membership=queendom` instead of directly to `/client/`.
- If a Supabase session already exists, `/enter/` displays **“We’re logging you in.”** and routes the guest into Flowtel.
- If no remembered session exists, `/enter/` shows two clear beta actions:
  - **I’ve checked in before** → Flowtel login
  - **Request access** → beta access request form
- Removed room-key language from the beta request form and replaced it with clearer Flowtel access language.
- The beta request page now honors `?membership=` in the URL and keeps the guest’s doorway context when sending them to login.
- Updated client-facing copy from “room key” to “Flowtel access” in the beta doorway where clarity matters.
- Added the `/enter` Vercel rewrite.

## Supabase

No migration required.

## Syntax checks

- `node --check enter/app.js`
- `node --check beta-request/app.js`
- `node --check client/app.js`
- `node --check moon-widget/app.js`
