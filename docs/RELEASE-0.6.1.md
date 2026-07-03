# Release 0.6.1 — Hospitality, Manual Bridge, Relationships, Public Tracker

## Install

Replace/add the files from this ZIP, then run:

`database/migration-007-hospitality-relationships.sql`

Commit:

`Release 0.6.1 - Hospitality relationships and public tracker`

## What changed

- Changes “message Maddie” to “Message the Front Desk.”
- Keeps the manual Squarespace bridge active while the API key is blocked.
- Adds a public `/tracker/` page using the existing cycle tracker framework unchanged.
- Adds practitioner connection requests with “Connect” language.
- Adds relationship infrastructure so guests can choose a practitioner and practitioners can connect.
- Keeps reflection entries append-only through `flowtel_reflections`.
- Keeps the checkout farewell screen.
