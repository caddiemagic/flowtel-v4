# Flowtel Roadmap

Updated: September 8, 2026

This roadmap records intentional future work without making unfinished ideas part of the current live release contract. Source code and current release notes remain authoritative for shipped behavior.

v0.10.89.1 is a narrow client-entry hotfix over v0.10.89. It removes the Queendom Events module from the `/client/` authentication bundle's hard static import chain so remembered-session boot, Sign In, account creation, password recovery, and Complimentary Stay initialization cannot be blocked by event-module loading. It also repairs the v0.10.89 iCalendar escaping helper. No database or server boundary changes; migration 075 remains latest, 076 next, and Vercel remains 12/12.

### Feature foundation retained from v0.10.89

## Current — v0.10.89.1 Login Doorway Isolation Hotfix

v0.10.89 extends the existing Queendom Calendar with **Multi-Session Series**. One Flowtel parent event now holds a repeatable occurrence itinerary while preserving one canonical member registration. Flowtel owns eligibility, Event Room access, and the protected member-facing Zoom doorway; Acuity owns the existing group-class series, class capacity, enrollment, and configured confirmation/reminder emails. Migration 075 adds the private occurrence/enrollment sync layer. No new Vercel function is added; the project remains at 12/12.

The first intended use is **Womb Magic Committee**, a four-week Queendom group vortex. This group-event series is intentionally separate from the private **4-Week Womb Magic Portal**, which remains one Queendom member → one Flow FM Priestess → four private Womb Magic appointments.

A series is created in Acuity first, including its dates, Zoom/location integration, capacity, and reminder emails. Owner Event Administration then maps the existing Acuity appointment type of `series` + calendar to the Flowtel event. A member joins the Flowtel vortex once; the existing `/api/acuity.js` boundary verifies the mapping, searches Acuity before creating anything, validates the class offering, and enrolls the member without suppressing Acuity email. My Upcoming Events keeps one vortex card visible through the final gathering and advances the protected session doorway automatically.

v0.10.88.1 remains the current Complimentary Stay access foundation beneath this release. The public login separates Queendom-member account creation, the 14-day stay, and joining the Queendom; monthly Womb Magic is visible to active trial guests only as a locked Queendom benefit; and an eligible verified purchase upgrades the same Auth identity. v0.10.88 / migration 074 remains the trial database boundary.

v0.10.87.4 confirmed through live diagnostics that Squarespace Pricing Plan purchases surface as `PAYWALL_PRODUCT` Commerce line items with stable `productId` values. Flow FM is `47815dfc-d06e-45bb-8581-332cdff0fbff`; The Queendom | Feminine Mystery School Portal is `9ebc509d-6678-43d0-9162-df7f4cb505e4`. These IDs remain the server-side paid-membership mapping boundary.

Caddie Magic remains **v0.6.0** and Player-first. Migration **075** is latest after this release; **076** is next.

### Priority 0 — live verification

Source validation does not replace live production verification. Keep the existing v0.10.88.1 access checks open: first-time paid Queendom / Flow FM signup, Complimentary Stay desktop/mobile UI, Day-15 closure, same-account trial → paid conversion, password recovery actual save, remembered session, Event Pass isolation, refund/revocation, and the full private 4-Week Womb Magic Portal regression.

Also verify v0.10.89 with one real Womb Magic Committee member: the mapped Acuity series exists at the exact first-session time, one Flowtel registration creates/synchronizes the full Acuity series enrollment, Acuity confirmation/reminder emails arrive, every session receives the correct protected Zoom doorway, refresh is idempotent, the event remains in My Upcoming Events through Session 4, and existing single events / monthly Womb Magic / Caddie Magic remain unchanged.

## Next Priority — v0.10.90 Front Desk / Concierge Messages

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
