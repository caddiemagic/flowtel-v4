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
