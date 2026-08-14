# Flowtel Roadmap

Updated: August 14, 2026

This roadmap records intentional future work without making unfinished ideas part of the current live release contract. Source code and current release notes remain authoritative for shipped behavior.

## Current — v0.10.85 Event Access + Beta Exit

Focus: close the open Queendom-event access and member-authentication work before the next project handoff. Flowtel now separates event visibility, entitlement, registration, payment, preparation, and private-room access; adds Host + Co-host, editable preparation, attendee guides, separate live-room timing, Flowtel Time + member-local time, and a within-the-hour registered-event doorway.

Ticketed events support separate Public / Queendom / Flow FM rules. Squarespace Orders API verification is the current payment authority. A paid order creates an event entitlement; a refund revokes it while preserving history. Public paid attendees can use a limited Event Pass without receiving Queendom/Flow FM product access. A true push webhook remains optional future work because Squarespace webhook subscriptions require OAuth; v0.10.85 uses secure API-key verification when the attendee returns/checks/opens the event.

The member-facing beta password doorway is removed from the normal Flowtel arrival experience. Returning sessions auto-enter; signed-out members use email/password; first-time members use an existing verified Flowtel profile or a PAID mapped Squarespace membership product before account creation; a short-lived server-only signup admission prevents public Auth metadata/URL parameters from granting product access; Forgot Password uses Supabase Auth recovery. Production launch requires custom SMTP/redirect configuration documented in `docs/SUPABASE-AUTH-EMAIL-SETUP.md`.

### Immediate closeout after live verification

After migration 070, SMTP, Squarespace Commerce API permissions, and the v0.10.85 live test checklist are green, stop feature development long enough to produce the requested **complete project handoff**, current release roadmap, migration/environment register, regression watchlist, and exact next-development recommendation.

## Deferred — Flowtel Messaging + Wake Up Text

### Shared messaging foundation

Preferred messaging provider: Twilio Programmable Messaging, implemented server-side so provider credentials never enter browser code.

The messaging layer should eventually support separate consented use cases rather than one broad all-texts permission:

- Request Wake Up Text;
- saved-event reminders;
- optional Womb Magic appointment reminders.

Each use case must keep its own consent/opt-out state and delivery history.

### Request Wake Up Text

The existing **REQUEST WAKE UP TEXT** action should become a real one-time SMS request.

When a member requests it:

1. Flowtel stores a request for the next local morning;
2. delivery is scheduled for **6:00 AM in that member's saved timezone**;
3. timezone conversion must be DST-aware and use the named timezone rather than a fixed UTC offset;
4. the message is generated near send time from current Flowtel data rather than frozen the night before.

The morning message should include:

- current cycle day;
- current Inner Season;
- current moon day;
- current moon phase;
- one canonical affirmation paired with that Flowtel/cycle day;
- a short doorway back into the member's Flowtel room.

### Affirmation library

Create a canonical **Day 1–28 affirmation library**. Affirmations should be intentionally authored/stored rather than randomly generated on each send.

The library may later become more season-aware, but the first contract should remain deterministic: a defined affirmation for each day.

### International phone support

Store mobile numbers in normalized international/E.164 form and capture country code explicitly in the member experience.

Do not assume one sender configuration works identically in every country. International rollout should be limited to destinations configured and approved in the messaging provider account.

### Consent and safety

- Wake-up texts are explicitly requested by the member and are not automatically enabled from merely providing a phone number.
- Event reminders are a separate opt-in from wake-up texts.
- Store consent timestamp/context and opt-out state.
- Never put private Flowtel cycle data into an SMS unless the member explicitly requested the wake-up message.
- Never place protected Zoom passcodes in routine SMS reminders.

### Delivery model

Flowtel remains the intelligence layer:

`Flowtel data + timezone + consent -> compose message -> messaging provider sends`

Twilio should not become the source of truth for cycle, moon, membership, event, appointment, or consent logic.

### Event reminders later

After My Upcoming Events is stable, an eligible registered member may opt into event reminders, with a restrained initial cadence such as:

- 24 hours before;
- 1 hour before.

The reminder should direct the member back to **My Upcoming Events** rather than exposing a protected Zoom room in the text itself.
