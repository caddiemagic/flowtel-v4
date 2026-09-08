# Flowtel Roadmap

Updated: September 7, 2026

This roadmap records intentional future work without making unfinished ideas part of the current live release contract. Source code and current release notes remain authoritative for shipped behavior.

## Current — v0.10.87.4 Squarespace Pricing Plan Purchase-Shape Diagnostic Hotfix

v0.10.87.4 follows live v0.10.87.3 testing, which successfully moved first-time signup past Squarespace Contacts authorization and exposed the next mismatch: Flow FM is sold as a Squarespace Pricing Plan while the beta-exit verifier currently expects membership entitlements to appear as mapped Commerce Order `productId` values. Before changing the membership boundary, Flowtel now performs the read-only Orders lookup and records only sanitized order/line-item structure so the actual Pricing Plan representation can be identified. No membership is granted from product names or diagnostic output. No migration is required; migration 073 remains latest and 074 remains next.

v0.10.87.3 added the read-only Contacts list fallback and website authorization probe after the Contacts query returned 403 despite a correctly scoped API key.

v0.10.87.2 added stage-specific first-time signup diagnostics so Contacts and Orders authorization failures could be distinguished without weakening the membership boundary.

v0.10.87.1 keeps the **4-Week Womb Magic Portal** release intact and adds a deployment-only hotfix for the Vercel Hobby function budget. The retired `api/beta-request.js` function was removed because `/beta-request/` has already redirected to `/client/` since v0.10.85.1. Flowtel now deploys with 12 `/api` functions, matching the Hobby-plan limit. A validator protects this ceiling until infrastructure is consolidated or the hosting plan changes.

The next narrow Flowtel extension is the **4-Week Womb Magic Portal**. A Queendom member chooses one Flow FM Priestess and one standing weekly time. Flowtel checks the existing Acuity calendar for that same local time across four consecutive weeks and schedules all four Womb Magic calls together. The monthly complimentary Womb Magic call remains separate.

One member may hold one active Portal at a time, and one Flow FM Priestess may hold one active Portal client at a time. Either the client or the assigned Priestess may reschedule one week's appointment without shifting the other three. The Portal keeps the existing recording disclosure and extends consented preparation access across the 28-day container; Personal Cosmology still requires its own explicit sharing switch.

Migration 073 is the database boundary for the Portal. It follows migration 071 (Moon Mail + Personal Cosmology) and migration 072 (Personal Cosmology Storage-policy hotfix). The deferred Moon Mail doorway correction is consolidated into v0.10.87 by linking current Flowtel doorways directly to `/moonbox/`. Caddie Magic remains v0.6.0 and Player-first.

### Priority 0 — finish beta-exit live verification

Source validation does not replace live verification. Before beta exit is considered green, confirm migration 070, eligible first-time signup + Confirm Signup, completed password recovery, Squarespace Commerce permissions/product IDs, Movie Night paid and Flow FM included access, refund/revocation, Event Pass isolation, remembered-session behavior, legacy redirects, and the visible Squarespace ENTER THE FLOWTEL CTA pointing to `/client/`. Use v0.10.85.x only for launch-critical hotfixes discovered in that verification.

## Next Priority — Front Desk / Concierge Messages

Build a Flowtel-owned support inbox rather than making Squarespace Forms the source of truth.

Desired first contract:

- a pre-login **Message the Front Desk** doorway for login/account/event/technical help;
- a logged-in **Front Desk / Concierge Messages** room with thread history and replies;
- Concierge inbox states such as Needs Response / Open / Waiting on Guest / Resolved;
- staff assignment, unread state, and verified-member association after sign-in;
- optional Resend notification that a reply is waiting while the canonical thread remains in Flowtel;
- public-form rate limiting/CAPTCHA;
- no automatic exposure of private cycle, reflection, client, Moon Mail, or Personal Cosmology data to support staff.

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
