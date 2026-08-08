# Flowtel v0.10.83.3 — Event Artwork + Quarter-Hour Time Picker Hotfix

Release date: August 7, 2026

## Purpose

This hotfix closes two live Owner Event Administration issues discovered while publishing the first Queendom calendar event:

1. event artwork saved the event record but failed at Storage with a row-level security violation;
2. the native browser time control exposed every minute from `00` through `59`, creating unnecessary friction for event entry.

## Event artwork Storage repair

The event artwork uploader intentionally uses a stable object path (`<event-id>/cover`) with `upsert=true` so replacing an event image does not create a new URL/path contract each time. Supabase Storage requires `SELECT`, `INSERT`, and `UPDATE` object permissions for an upsert. Migrations 067/068 included Owner/Admin `INSERT`, `UPDATE`, and `DELETE` policies but omitted `SELECT`.

Migration 069 adds the missing Owner/Admin `SELECT` policy for the `flowtel-queendom-event-images` bucket and idempotently re-asserts the bucket plus companion write policies. Public calendar artwork remains publicly servable by URL because the bucket is intentionally public for the sanitized Squarespace calendar embed; only Flowtel Owner/Admin accounts may change its objects.

The event editor also translates future Storage RLS failures into a direct Flowtel setup instruction instead of exposing a raw row-level-security error.

## Quarter-hour event editor

Start and End time now use compact 12-hour controls:

- hour: `1`–`12`
- minutes: `:00`, `:15`, `:30`, `:45` only
- period: `AM` / `PM`

End time remains optional. The editor converts the chosen values back into the existing canonical 24-hour `HH:MM` payload, so no event-table schema change is needed for time selection.

## Database instructions

Run exactly:

`database/migration-069-queendom-event-artwork-storage.sql`

Migration 069 assumes migrations 067 and 068 are already live. Do not rerun historical migration 052 files.

After this release, the next migration number is **070**.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie files, schemas, permissions, or behavior change in this hotfix.
