# Flowtel v0.10.85 — Event Access + Beta Exit

Released: August 14, 2026

## Purpose

Close the current event-design and beta-access loop before the next full project handoff. This release teaches Flowtel the difference between **seeing an event, being entitled to it, saving a seat, paying for it, preparing for it, and entering the private room**. It also replaces the member-facing shared beta-password doorway with a normal remembered-session / sign-in / first-time account flow and completes the browser-side password recovery experience.

Caddie Magic remains **v0.6.0**.

## Event access tiers

Every Queendom event can now define access independently for three tiers:

- **Public**
- **Queendom**
- **Flow FM**

Each tier can be:

- **Included / free**
- **Ticket required**
- **Not available**

A ticket-required tier no longer receives **SAVE MY SEAT** before payment is verified. It receives **BUY TICKET** plus a ticket-check/access path instead. Membership and registration are therefore no longer mistaken for payment.

### Movie Night reference configuration

Movie Night can be configured as:

- Public → Ticket required → `$111`
- Queendom → Ticket required → `$111`
- Flow FM → Included / free
- Experience/showtime start → `10:00 AM`
- Live room / Zoom gathering → `1:00 PM`
- Host → linked Flow FM Priestess
- Co-host → optional linked Flow FM Priestess
- Recording → Yes/No
- Editable How to Prepare guidance
- Optional registered-attendee guide
- Private Zoom/passcode and/or private location details
- Squarespace ticket/download product URL + exact Squarespace Product ID

The separate live-room time is intentional: an experience may begin earlier than the group Zoom or in-person gathering.

## Squarespace ticket verification

Ticketed events map to the exact Squarespace product ID used for the ticket/download product.

When an authenticated attendee checks or opens a ticketed event, Flowtel:

1. uses the attendee's authenticated email;
2. finds the exact Squarespace contact;
3. reads that customer's Squarespace orders;
4. finds the mapped product in the order line items;
5. confirms the order payment state is `PAID`;
6. writes a verified event entitlement;
7. saves the attendee's seat;
8. opens the registered Event Room.

If the latest matching order is `REFUNDED`, Flowtel revokes the active entitlement and cancels the saved registration while retaining the entitlement history.

When an already signed-in member clicks **BUY TICKET**, Flowtel remembers the pending event in that browser. When she returns to Flowtel, the calendar automatically attempts to verify the mapped Squarespace order so the normal purchase-return path does not require another manual registration step. **CHECK MY TICKET** remains available as a fallback.

### Why this release does not claim a Squarespace webhook

The Squarespace Webhook Subscriptions API requires OAuth. API keys cannot create webhook subscriptions. v0.10.85 therefore ships secure Orders API verification with an API key rather than pretending an API-key webhook exists. A true push webhook can be added later if Flowtel is registered/configured as a Squarespace OAuth application.

## Event Pass accounts for public ticket buyers

A public purchaser does not need to become a Queendom member merely to attend a paid public event.

The full Upcoming Events page now supports a limited **Event Pass** account:

- the purchaser creates/signs into an Event Pass using the same email used at Squarespace checkout;
- Supabase email confirmation proves control of that email;
- after authentication, Flowtel verifies the paid Squarespace order;
- the Event Pass can access only entitled public event rooms;
- it does **not** grant Suite, Lounge, Queendom, Flow FM, Council, or Caddie Magic access;
- if the same person later receives a real Flowtel membership, the normal membership path can upgrade the limited account without replacing its auth identity.

No public endpoint reveals whether a named email purchased an event. Paid-ticket verification occurs after authentication.

## Registered Event Room

A registered and entitled event opens into a private Event Room with:

- event title and details;
- **FLOWTEL TIME** (`America/Los_Angeles`, automatically PST/PDT for the event date);
- **YOUR TIME** when the member has saved a different timezone;
- separate live-room/gathering time when different from experience start;
- Host;
- optional Co-host;
- **Will this be recorded? Yes / No**;
- **HOW TO PREPARE**;
- optional attendee guide download;
- registered-only Zoom/passcode;
- registered-only exact private location details for in-person/hybrid events.

Private preparation/download/location/Zoom data is never returned by the public calendar feed and is not returned by the normal member event-list feed.

## How to Prepare

New events default to:

> Find a private space. Light a candle + incense. Make tea. Grab a journal + pen. Arrive a few minutes early and let yourself settle in.

Owner/Admin may edit this text per event.

An optional **Attendee guide URL** can be attached. Flowtel returns that guide only from the registered Event Room after entitlement is confirmed. For a free/included event, it is available as soon as the member saves her seat. For a paid event, it remains behind verified payment.

If Squarespace itself is being used to deliver the purchased PDF/download product, the Flowtel guide URL can be left empty; Squarespace can continue its normal digital-product fulfillment while Flowtel uses the same product ID as the admission receipt.

## Within-the-hour doorway

Registered events can now surface two useful countdown moments when the event experience and the live gathering do not start at the same time:

- within one hour of the **event/experience start**, Flowtel shows `[Event title] starts in …` with **OPEN EVENT**;
- within one hour of a later **live room / gathering time**, Flowtel shows the live-gathering countdown with the type-aware join action.

When the event start and live-room time are the same, Flowtel shows only one countdown.

The live action adapts to the experience:

- **JOIN WORKSHOP**
- **JOIN CEREMONY**
- **JOIN CALL**
- **OPEN EVENT**

This is what allows Movie Night to begin/showtime at **10:00 AM** while separately surfacing the **1:00 PM** Zoom gathering. Both countdowns open the private Registered Event Room rather than exposing Zoom/location credentials directly in the calendar overview.

## Host + Co-host

Owner Event Administration now includes a linked optional **Co-host** dropdown using the same Flow FM host directory as Host.

Host and Co-host:

- are stored as linked Flowtel member IDs plus historical name snapshots;
- appear across Event Administration, Lounge event views, full Upcoming Events, My Upcoming Events, and the Queendom calendar/embed;
- link to their Priestess profiles where authenticated/profile links are appropriate;
- may show their current local time only when the existing Flow FM team-map/time-location privacy setting allows it.

## Timezone clarity

Event displays now treat `America/Los_Angeles` as **FLOWTEL TIME**, not as a permanently hard-coded `PST` label. The browser formats the actual event timestamp, so Pacific Standard Time and Pacific Daylight Time follow the event date correctly.

When a signed-in member has a saved timezone and it differs from Flowtel Time, event views also show **YOUR TIME**. This reuses the existing named-timezone model rather than storing a fixed UTC offset.

## Beta exit — member arrival

The member-facing beta login barrier is removed from the main `/client/` arrival experience.

Current arrival behavior:

- valid remembered Supabase session → Flowtel continues automatically;
- signed out → normal email + private password sign-in;
- first time → **Create your account** with email + a private password;
- first-time Queendom signup first honors an existing verified Flowtel profile; otherwise it requires a `PAID` Squarespace membership product mapped in Vercel before creating the Supabase Auth account;
- after that server verification, Flowtel writes a **24-hour, server-only signup admission** for the exact email; public Supabase signup metadata or a membership-looking URL can never grant Flowtel product access by itself;
- after the member proves control of the same email through Supabase Auth, `flowtel_claim_default_access()` consumes that admission and establishes the canonical membership/product-access row;
- **Forgot your password?** sends the Supabase recovery email and returns the member to Flowtel to choose a new private password.

Historical beta/admin compatibility code and historical beta migrations remain in the repository for release history and internal compatibility, but the normal member UI no longer presents the shared beta password/test-account doorway.

## Supabase email requirement

The password-reset and first-time email-confirmation code is included in this release, but production delivery requires Supabase Auth email to be configured correctly.

See:

`docs/SUPABASE-AUTH-EMAIL-SETUP.md`

Recommended production posture:

- custom SMTP enabled;
- production Site URL set to `https://app.theflowtel.com`;
- `/client/` and `/queendom-events/` allowed as auth redirect destinations;
- email/password signup enabled;
- Confirm Email enabled;
- Confirm Signup and Reset Password templates branded for Flowtel.

## Squarespace/Vercel requirement

Ticket and first-time membership verification require a Squarespace API key with at least:

- Contacts — Read Only
- Orders — Read Only

Set the key in Vercel as:

`SQUARESPACE_COMMERCE_API_KEY`

If the existing `SQUARESPACE_API_KEY` already has both permissions, the server can fall back to it, but a dedicated Commerce key is recommended for clear least-privilege ownership.

For **brand-new members who do not already have a verified Flowtel profile**, also configure the Squarespace membership product IDs in Vercel:

- `SQUARESPACE_QUEENDOM_PRODUCT_IDS`
- `SQUARESPACE_FLOWFM_PRODUCT_IDS`
- `SQUARESPACE_COUNCIL_PRODUCT_IDS` (only if Council is sold/verified through Squarespace)

Each value may contain one or more comma-separated product IDs. Existing beta members with a verified Flowtel profile do not have to re-prove a historical purchase simply to create their private Auth password. A random Squarespace contact/newsletter subscriber is **not** enough to claim Flowtel membership.

The bridge stores successful first-time verification in `flowtel_member_signup_admissions` for 24 hours. That table is server-only/RLS-protected and is intentionally separate from Auth user metadata, so calling Supabase signup directly cannot manufacture a Queendom or Flow FM entitlement.

See:

`docs/SQUARESPACE-EVENT-TICKET-SETUP.md`

## Database

Run exactly:

`database/migration-070-event-access-beta-exit.sql`

Migrations 067, 068, and 069 must already be live.

Do not rerun or rename either historical migration 052 file.

Next migration number after this release: **071**.

## New server routes / helpers

- `api/event-ticket-verify.js`
- `server/squarespace-commerce.js`

No API-key webhook route ships in v0.10.85.

## Environment changes

New recommended Vercel variables:

- `SQUARESPACE_COMMERCE_API_KEY`
- `SQUARESPACE_QUEENDOM_PRODUCT_IDS`
- `SQUARESPACE_FLOWFM_PRODUCT_IDS`
- `SQUARESPACE_COUNCIL_PRODUCT_IDS` (only if applicable)

Existing required server variables remain unchanged, including Supabase service access and existing Flowtel configuration.

Supabase custom SMTP is configured in the Supabase Auth dashboard/provider settings rather than as a Flowtel browser variable.

## First live-test order

1. Run migration 070.
2. Configure/test Supabase custom SMTP and redirect URLs.
3. Add `SQUARESPACE_COMMERCE_API_KEY` in Vercel and redeploy.
4. Confirm a remembered member still auto-enters Flowtel.
5. Confirm signed-out member login works with her private password.
6. Confirm Forgot Password email arrives and password recovery returns to Flowtel.
7. Configure the Queendom/Flow FM membership product IDs in Vercel, then confirm a first-time paid member can create an account while a Squarespace contact with no verified membership purchase is refused.
8. Configure Movie Night as Public ticket / Queendom ticket / Flow FM included, 10 AM start, 1 PM live room.
9. As a Queendom member before purchase: confirm Movie Night shows BUY TICKET and cannot Save My Seat/open private details.
10. Buy the mapped Squarespace product with the same email, return to Flowtel, and confirm the ticket auto-check/fallback check creates the entitlement and registration.
11. Confirm HOW TO PREPARE, attendee guide, Zoom/passcode/private location are available only after entitlement + registration.
12. As a Flow FM member: confirm Movie Night is included and Save My Seat works without payment.
13. As a public/nonmember purchaser: create/confirm an Event Pass and verify it can open only the paid event, not the Suite/Lounge.
14. Refund a test ticket and confirm reopening the paid event revokes the room.
15. Confirm Host + Co-host and Flowtel Time / Your Time render correctly, including the separate 10 AM experience start and 1 PM live gathering.
16. Confirm the within-hour countdown opens the registered Event Room.
17. Run the full Flowtel/Caddie regression suite and then create the requested project handoff.
