# Flowtel v0.9.1 — Mentor Migration Fix

This is a database-only patch for the Choose Your Mentor release.

## Why this exists

Some beta Supabase projects had not yet created `public.flowtel_practitioner_relationships`, which was originally introduced in migration 007. Migration 014 assumed that table already existed and therefore failed with:

`ERROR: 42P01: relation "public.flowtel_practitioner_relationships" does not exist`

## What changed

- Adds a defensive bootstrap at the top of `migration-014-choose-your-mentor.sql`.
- Creates `public.flowtel_practitioner_relationships` if it does not exist.
- Recreates the original relationship indexes if needed.
- Leaves the rest of the Choose Your Mentor migration unchanged.

## How to use

Replace your local `database/migration-014-choose-your-mentor.sql` with this corrected file, then rerun it in Supabase.

No frontend files changed.
