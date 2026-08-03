# Concierge Specification

The Flowtel Concierge is a hospitality presence, not an admin function.

## Suite Concierge Card

Initial state:

```txt
Concierge

Your Concierge is available.
Need a little extra care today?

🌙 Request Turndown Service

A concierge will be notified that you've requested a little extra love today.
```

After request:

```txt
🌙 Turndown Service Requested

A concierge has been notified.
```

After fulfillment:

```txt
🌹 Your Concierge stopped by today.

✨ A note has been left in your room.

Read Note →
```

The note should feel like a handwritten card left in a beautifully prepared hotel room.

## Concierge Desk

The Concierge Desk queue is only for guests who requested Turndown Service.

Normal check-ins should not appear in the Turndown queue.

Queue language:

```txt
Guests Awaiting Turndown Service
These guests have requested a little extra witnessing today.
```

Remove:

- Witnessed Today
- Task language
- Admin language

## Guest Cards

Each card should display:

- Guest Name
- Today’s Room
- Cycle Day
- Actual Inner Season
- Open Room button

Do not repeat feels-like or inner-season flags beside the action button.

## Practitioner State

The practitioner may clock into the Concierge Desk and clock out back to her Suite.

The Desk may include a placeholder for future assigned clients:

```txt
My Guests
Assigned clients will live here soon.
```

No full assigned-client data model should be built until the Passport and practitioner network model are ready.

## Owner Administration Roadmap

### Profile Review Desk

Add a dedicated **Profile Review Desk** card beneath Owner Administration.

The card should:

- open `/flow-fm/review/`;
- show the number of Priestess Profiles currently submitted for witnessing;
- use a quiet gold alert treatment while profiles are awaiting review;
- clear each alert only after the owner approves the profile or requests refinement;
- preserve the existing Profile Studio status and review history rather than creating a second review system.

### Priestess Planning Activity

Add a private owner activity feed for meaningful member planning updates.

Track when a member saves:

- Hourly Flow Rate changes;
- Availability rhythm changes.

Each activity item should show the member, the area changed, the Flowtel timestamp, and a link to her owner Priestess profile. Repeated saves made as part of one editing session should be condensed so the Concierge Desk remains calm. Owner acknowledgment may clear the alert, but the activity history must remain append-only.

These roadmap items are owner visibility features. They must not expose one member's private planning data to another member or broaden approved-Practitioner permissions.
