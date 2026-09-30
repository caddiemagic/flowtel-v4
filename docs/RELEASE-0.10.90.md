# Flowtel v0.10.90 — Cyclical Calendar + Event Operations

**Release date:** September 30, 2026
**Source base:** v0.10.89.1 / GitHub `main` `9badeb0869c393a60997387bad72c85731cc6b68`
**Database migration:** **076 — Cyclical Calendar + Event Operations**
**Vercel functions:** **12 / 12**
**Caddie Magic:** v0.6.0 unchanged

## Release purpose

v0.10.90 turns the Queendom Calendar into a public discovery + Flowtel-owned event doorway while keeping Acuity as the operational schedule/reminder engine.

The unshipped v0.10.89.1 login-doorway isolation repair is folded into this release. There is no separate v0.10.89.1 deployment step.

## Event shapes

Flowtel now distinguishes three event contracts:

- **Single Event** — one gathering, one seat.
- **Recurring Event** — one parent event with independent occurrences. Each occurrence is claimed/booked separately. This is the intended shape for a weekly class such as Moon Magic Meditation.
- **Series / Vortex** — one registration commits the member to the whole multi-session container. This preserves the v0.10.89 Womb Magic Committee behavior.

Recurring events do not reuse series enrollment semantics merely because they repeat.

## Public calendar + entitlement-aware Claim My Seat

The calendar remains publicly discoverable. Public visibility does not grant admission.

`CLAIM MY SEAT` resolves the event's configured tier:

- public unavailable + Queendom included/paid → non-member receives the Queendom doorway;
- public included → a limited Event Pass may be created and used only for that event;
- public paid → Flowtel verifies the mapped Squarespace ticket/order first;
- entitled Queendom / Flow FM member → Flowtel proceeds directly to the linked Acuity booking;
- Acuity-linked events are not confirmed in Flowtel until the Acuity appointment/enrollment is successfully mapped.

This preserves the existing rule:

> visibility ≠ membership ≠ payment ≠ registration ≠ private room access

Complimentary Stay remains rank 0. A signed-in trial identity may browse the public calendar but does not gain Queendom event entitlement.

## Acuity import / linked registration

Owner Event Administration now treats Acuity as the scheduling source of truth for linked group events.

The owner creates the actual group class/series dates in Acuity once, then uses **IMPORT / REFRESH ACUITY SCHEDULE** in Flowtel. Flowtel reads the mapped Acuity class/series + calendar and imports upcoming offerings instead of requiring dates to be retyped.

Acuity `class` offerings import as:

- one offering → Single Event;
- multiple offerings → Recurring Event, with each occurrence independent.

Acuity `series` remains a Series / Vortex and retains the existing Flowtel session-count/cadence itinerary because Acuity's public API does not expose a supported series-definition creator suitable for replacing that owner configuration.

For linked single/recurring seats, Flowtel:

1. verifies event entitlement;
2. checks the exact Acuity class offering/capacity;
3. searches for an existing matching member appointment to remain idempotent;
4. creates the Acuity appointment only when needed;
5. stores the Acuity appointment ID + protected meeting doorway;
6. confirms the Flowtel seat only after the Acuity mapping exists.

The booking call does **not** set `noEmail=true`, so Acuity's configured confirmation/reminder email remains active.

Full/unavailable offerings are included during import so a sold-out date does not silently disappear from the recurring Flowtel calendar.

## Universal Acuity email doorway

Owner Event Administration exposes one reusable member-facing reminder doorway:

`/queendom-events/?enter=1`

The intended Acuity reminder email uses **ENTER THE FLOWTEL** rather than exposing the private Zoom URL.

When an authenticated member follows the doorway, Flowtel opens her next registered gathering. For a recurring event it chooses the next occurrence she actually claimed, not merely the next recurrence on the master schedule.

## Protected entry + attendance snapshot

The private Zoom doorway remains inside Flowtel.

For a normal member, `JOIN ZOOM` requires a current Flowtel Day check-in. If today's Stay does not exist, Flowtel returns her to `/client/` to check in and preserves the event/occurrence return context.

At entry, Flowtel snapshots only the minimum cyclical context needed to facilitate the gathering:

- member identity;
- event + occurrence;
- entry time;
- Flowtel date;
- actual/recorded Cycle Day;
- Inner Season.

It does **not** copy reflections, Moon Mail, Personal Cosmology, Flow Map notes, or practitioner-care data.

A limited public Event Pass does not have Suite access, so the event doorway requests only a current cycle-day number before entry and derives the Inner Season for that event snapshot.

## Event Flow Map

Host, co-host, and Owner/Admin receive an Event Flow Map for the specific gathering. They may open and refresh this operational host view without claiming an attendee seat or creating an Acuity appointment for themselves.

The visual follows the requested four-chamber Flowtel map:

- **NORTH · INNER AUTUMN**
- **EAST · INNER SUMMER**
- **WEST · INNER WINTER**
- **SOUTH · INNER SPRING**

Each chamber has a count badge and attendee tiles with display name, photo/initial, Cycle Day, and entered time. Empty chambers say **This chamber is quiet.**

The host view separately shows:

- **CLAIMED SEATS** — registered people;
- **IN THE ROOM** — only people who actually entered that occurrence through the Flowtel Zoom doorway.

The Event Room includes the disclosure:

> When you enter this gathering, your current Cycle Day and Inner Season are shared with the event host to support the group experience.

## Moon-aware calendar

The public/member month calendar now automatically marks the four Flowtel Moon thresholds:

- 🌑 **NEW MOON**
- 🌓 **HALF FULL MOON**
- 🌕 **FULL MOON**
- 🌗 **HALF NEW MOON**

Owner Event Administration also shows the selected event date's lunar context and Moon Day.

The calendar uses the existing Flowtel Moon framework and Flowtel Time. The existing 2027 moon-calendar maintenance requirement remains open; this release does not pretend the current fallback is an ephemeris service.

## Login-doorway repair folded in

The v0.10.89.1 repair is included here rather than shipped separately:

- Queendom Events remains dynamically loaded from `/client/` instead of being a hard dependency of auth/session boot;
- remembered-session entry, Sign In, account creation, password recovery, and Complimentary Stay boot remain isolated from event-module failures;
- the corrected iCalendar escaping helper remains in place;
- client/event cache keys advance to v0.10.90.

## Database / architecture

Migration 076 adds:

- recurring event format support;
- imported occurrence capacity/sync metadata;
- independent recurring-occurrence registrations;
- append-oriented event attendance snapshots;
- owner event-operations configuration;
- Acuity-first booking/confirmation boundary;
- protected event-entry boundary;
- host Event Flow Map boundary;
- updated public/member/admin calendar feeds.

Migration 075 remains historical and must not be renamed or rerun casually.

No new `/api/*.js` function is added. Existing `api/acuity.js`, `api/acuity-webhook.js`, and `api/event-ticket-verify.js` are extended. The Vercel Hobby function count remains **12/12**.

## Environment variables

No new Vercel environment variables are required.

Keep existing values unchanged, including Acuity, Supabase, Squarespace, and Flowtel origin/trusted-doorway configuration.

## Deployment order

**Run migration 076 before deploying the v0.10.90 website files.**

Then deploy v0.10.90 and wait for Vercel to report Ready before performing the first live test.

## Source validation vs production verification

This release can be declared **SOURCE VALIDATED** after the release package checks pass.

It is **not LIVE PRODUCTION VERIFIED** until the owner deploys it and confirms a real single/recurring/series event flow, Acuity email/appointment behavior, protected Zoom entry, and Event Flow Map behavior in production.
