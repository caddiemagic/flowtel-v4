# Flowtel v0.10.84 — My Upcoming Events

Release date: August 10, 2026

## Purpose

This release makes Queendom event discovery and registration easier without creating another calendar to maintain. The existing Flowtel event record remains the source of truth; v0.10.84 adds a chronological marketing agenda for Squarespace/Queendom, a remembered-session registration doorway into Flowtel, and personal-calendar handoff from My Upcoming Events.

## Queendom upcoming-events agenda

Adds a dedicated `/queendom-events/` route for a chronological agenda of published Queendom and Flow FM events.

The agenda:

- reads from the existing sanitized public Queendom event feed;
- lists future events in chronological order and groups them by month;
- keeps event artwork, title, date, named timezone, host, type, audience, and description visible;
- provides All / Queendom / Flow FM filters and month jump links;
- uses `?embed=1` for the compact Squarespace/Queendom embed treatment;
- never receives Zoom URLs, Zoom passcodes, registration state, private appointments, or member identity.

The recommended Squarespace embed source is:

`/queendom-events/?embed=1`

The existing monthly `/queendom-calendar/` remains available inside Flowtel; the new agenda is the marketing-first view.

## Save My Seat continuation doorway

Every published event in the public agenda can send an eligible member into Flowtel with only the public event UUID in the URL.

The doorway does not put credentials, access tokens, Zoom data, or member data in the URL.

When the browser already has a remembered Flowtel/Supabase session:

1. the member selects **SAVE MY SEAT** in the Queendom agenda;
2. Flowtel opens using the existing remembered session;
3. Flowtel calls the existing membership-gated registration RPC;
4. the event is saved;
5. the member is taken to **My Upcoming Events**.

When the browser does not have a Flowtel session, the existing Flowtel login remains required. The event ID stays in the doorway URL, so after authentication Flowtel completes the registration automatically.

The established one-stay-per-Flowtel-Day arrival rule remains intact. If the member has not checked in that Flowtel Day, the seat is saved after authentication, she completes the normal daily check-in, and Flowtel then opens My Upcoming Events. The event doorway does not bypass arrival/check-in.

Flow FM event registration remains protected by the existing database membership rule. Queendom-only members may see Flow FM events in the public agenda but cannot register for or receive the protected room.

## My Upcoming Events

Renames the Lounge's **My Calendar** section to **MY UPCOMING EVENTS** and makes it the landing destination for an event registration doorway.

The section continues to combine:

- saved Queendom community events;
- saved Flow FM events the member is entitled to attend;
- the member's personal upcoming Womb Magic call.

## Add to personal calendar

Saved community events in My Upcoming Events now include **ADD TO CALENDAR**.

Members can choose:

- **GOOGLE** — opens a prefilled Google Calendar event;
- **APPLE / OUTLOOK** — downloads a standards-based `.ics` file.

Calendar handoff includes event title, date, time, timezone, and a Flowtel return doorway. It intentionally does **not** include the event's protected Zoom URL or passcode. Members still return to Flowtel to enter the room.

If an event has no explicit end time, personal-calendar handoff uses a one-hour default duration without changing the saved Flowtel event record.

## Database and environment

No database migration is required for v0.10.84. The release reuses migrations 067–069 and the existing event registration/member-access RPCs.

No new environment variables are required.

The next migration number remains **070**.

## Deferred roadmap: Flowtel Messaging + Wake Up Text

Twilio/SMS work is explicitly deferred from this release. The roadmap specification is recorded in `docs/FLOWTEL_ROADMAP.md` so event/calendar work can stabilize first.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie Magic files, schemas, roles, or product behavior are changed by v0.10.84.
