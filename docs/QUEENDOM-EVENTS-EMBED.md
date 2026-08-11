# Queendom Upcoming Events Embed

Flowtel v0.10.84.2 turns the Queendom embed into a concise marketing module instead of an indefinitely long agenda.

## Embed route

Use:

`https://app.theflowtel.com/queendom-events/?embed=1`

The embed shows:

- the next upcoming event as the featured event;
- the following 3 events under **COMING UP**;
- **SAVE MY SEAT** for event registration;
- **VIEW ALL UPCOMING EVENTS** for the full chronological public agenda.

The full `/queendom-events/` page still shows all future events with filters and month navigation.

## Recommended Squarespace Code Block

This version listens for Flowtel's height message so the iframe grows or shrinks to fit the rendered events instead of reserving a large fixed blank area.

```html
<iframe
  id="flowtel-queendom-events"
  src="https://app.theflowtel.com/queendom-events/?embed=1"
  title="Upcoming Events in the Queendom"
  loading="lazy"
  style="width:100%; height:760px; border:0; border-radius:20px; background:transparent; display:block;"
></iframe>

<script>
(function () {
  var frame = document.getElementById('flowtel-queendom-events');
  if (!frame) return;

  window.addEventListener('message', function (event) {
    if (event.origin !== 'https://app.theflowtel.com') return;
    if (!event.data || event.data.type !== 'flowtel:queendom-events-height') return;

    var height = Number(event.data.height);
    if (!Number.isFinite(height)) return;
    frame.style.height = Math.max(320, Math.min(height + 8, 1800)) + 'px';
  });
}());
</script>
```

The starting `760px` height is only a safe initial value while the iframe loads. Once the Flowtel event module renders, it reports its real content height to Squarespace.

## Artwork

Event cards preserve the full Flowtel event artwork rather than cropping it. Continue creating artwork at the established **1600 × 1000 px (16:10)** master size.

## Save My Seat

**SAVE MY SEAT** exits the iframe into the first-party Flowtel client using `target="_top"`.

The URL carries only the event UUID and requested Flowtel destination. Flowtel performs the membership-gated registration after authentication or remembered-session recovery.

## Audience behavior

- Queendom events are visible and registrable by eligible Queendom/Flow FM members.
- Flow FM events remain visible for marketing, but the existing Flowtel database membership gate prevents Queendom-only members from registering for or obtaining the Zoom room.

## Privacy

The embed contains only the sanitized public event feed. It never receives:

- Zoom URLs or passcodes;
- member registration identity;
- personal Womb Magic appointments;
- private member data.

## Maintenance

Do not create another Squarespace calendar. Continue creating/editing each event once in Flowtel Owner Event Administration; the same record powers this embed, the Lounge, My Upcoming Events, and the full Upcoming Events agenda.
