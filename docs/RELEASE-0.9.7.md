# Flowtel v0.9.7 — Cycle Data Pill Rendering Repair

## Purpose

Repairs the Cycle Data pill display so the Actual vs Recorded Cycle Day information renders immediately inside the Suite.

## Changes

- Renders Actual Cycle Day and Recorded Cycle Day immediately before any stay-history lookup runs.
- Keeps streak, previous-cycle, and welcome-back lines as enhancement data after history loads.
- Adds a small two-column Cycle Data layout for the two values.
- Adds a cache-busted client script reference so the deployed Suite loads the updated app bundle.

## Database

No new Supabase migration required. Migration 018 is still required for the underlying Actual vs Recorded fields.
