# Flowtel v0.10.83.1 — Flowtel Calendar Polish

Release date: August 7, 2026

## Purpose

This hotfix polishes the first live Flowtel Calendar experience and repairs the database/storage setup revealed during testing. It keeps the v0.10.83 architecture intact while making the Lounge additions feel native to the existing Lounge, replacing technical timezone IDs with human-readable names, linking event hosts to Flow FM Priestess profiles, and hardening event saving when artwork storage is unavailable.

## Lounge polish

- **Upcoming Events in the Queendom** and **My Calendar** now use the same 760px centered content width as the established Lounge content below them.
- Removes the line: `Everyone can see what is happening; membership protects the rooms themselves.`
- Event timezone display now uses the real timezone name for the event date, for example **Pacific Daylight Time (PDT)** in August and **Pacific Standard Time (PST)** in winter.
- Linked Flow FM event hosts open their Flowtel Priestess profile from authenticated Lounge/calendar views.

## Event administration

### Human-readable timezone selector

The event editor keeps IANA timezone IDs internally for correct date math, but Owner/Admin now chooses from named timezone options such as:

- Pacific Time — Pacific Standard / Daylight Time
- Mountain Time — Mountain Standard / Daylight Time
- Central Time — Central Standard / Daylight Time
- Eastern Time — Eastern Standard / Daylight Time
- Arizona Time — Mountain Standard Time
- Hawaii Time — Hawaii Standard Time
- United Kingdom Time — GMT / British Summer Time
- Central European Time — CET / CEST
- Australian Eastern Time — AEST / AEDT

### Flow FM host dropdown

The free-text Host field is replaced by a dropdown of current Flow FM/Council members.

Each event may now store `host_member_id` in addition to the historical host-name snapshot. The server derives the host name from the selected member and the authenticated event feed can link that host directly to:

`/flow-fm/team-map/profile/?member=<member_id>`

This prepares the calendar for future Flow FM members to host workshops, ceremonies, and calls without creating disconnected text-only host records.

## Event artwork reliability

Live testing showed `bucket not found` when an event image was selected. Migration 067 is responsible for creating the public `flowtel-queendom-event-images` bucket, so that error is a strong signal that migration 067 was not fully installed in the live Supabase project.

Migration 068 idempotently re-asserts:

- the `flowtel-queendom-event-images` bucket;
- its 10 MB JPG/PNG/WebP boundary; and
- Owner/Admin insert/update/delete policies.

The client save flow is also safer now: Flowtel saves the event record **before** attempting optional artwork upload. A Storage problem can therefore no longer erase the entire event submission. If artwork fails, the event remains saved and the owner receives a specific Storage setup message.

## Schema-cache repair

The Lounge error:

`Could not find the function public.flowtel_list_queendom_events(...) in the schema cache`

indicates the v0.10.83 event RPCs were not visible to PostgREST in the live project. Migration 068 recreates the member event-list RPC with the new host field and ends with:

`NOTIFY pgrst, 'reload schema';`

This explicitly asks Supabase/PostgREST to refresh its function schema cache after the migration completes.

## Database

Migration required:

`database/migration-068-flowtel-calendar-polish.sql`

**Migration 067 remains a prerequisite.**

- If migration 067 was never successfully run, run **067 first**, then **068**.
- If migration 067 was already completed, run **068 only**.
- Migration 068 contains a guard and will stop with a clear message if the v0.10.83 event table from migration 067 does not exist.

Do not rename or rerun either historical migration 052 file.

Next migration number after this release: **069**.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie files, permissions, schemas, or product behavior are changed by this hotfix.
