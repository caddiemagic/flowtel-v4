# Queendom Upcoming Events Embed

Flowtel v0.10.84 adds a chronological, marketing-first agenda for the Queendom.

## Embed route

Use the deployed Flowtel origin plus:

`/queendom-events/?embed=1`

Example Squarespace Code Block (replace `https://YOUR-FLOWTEL-DOMAIN` with the live Flowtel origin):

```html
<iframe
  src="https://YOUR-FLOWTEL-DOMAIN/queendom-events/?embed=1"
  title="Upcoming Events in the Queendom"
  loading="lazy"
  style="width:100%; min-height:1200px; border:0; border-radius:20px;"
></iframe>
```

The embed intentionally shows only the sanitized public event feed. It contains no Zoom URL/passcode, member registration state, personal Womb Magic appointments, or member identity.

## Save My Seat

**SAVE MY SEAT** exits the iframe into the first-party Flowtel client using `target="_top"`.

The URL carries only the event UUID and the requested Flowtel destination. Flowtel performs the actual membership-gated registration after authentication/remembered-session recovery.

## Audience behavior

- Queendom events are visible in the agenda and may be registered for by eligible Queendom/Flow FM members.
- Flow FM events are also visible for marketing, but the existing Flowtel database membership gate prevents Queendom-only members from registering for or obtaining the Zoom room.

## Maintenance

Do not create a separate Squarespace calendar for this agenda. Continue creating/editing the event once in Flowtel Owner Event Administration; the same record powers this embed, the Lounge, My Upcoming Events, and the existing monthly Queendom Calendar.
