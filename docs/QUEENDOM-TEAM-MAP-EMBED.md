# Queendom Team Map Embed

The public-safe iframe route is:

`https://app.theflowtel.com/flow-fm/team-map/embed/`

Add this code to a Squarespace Code Block on the Queendom members-only page:

```html
<div style="width:100%;overflow:hidden;">
  <iframe
    id="flowtel-team-map"
    src="https://app.theflowtel.com/flow-fm/team-map/embed/"
    title="Flow FM Team Map"
    loading="lazy"
    style="display:block;width:100%;height:1200px;border:0;background:transparent;"
  ></iframe>
</div>
<script>
  window.addEventListener('message', function (event) {
    if (event.origin !== 'https://app.theflowtel.com') return;
    if (!event.data || event.data.type !== 'FLOWTEL_TEAM_MAP_HEIGHT') return;
    var frame = document.getElementById('flowtel-team-map');
    if (frame && Number(event.data.height) > 0) {
      frame.style.height = Math.ceil(Number(event.data.height)) + 'px';
    }
  });
</script>
```

## What the embed exposes

- Priestess display name
- Profile photo or the pink rose fallback
- Actual seasonal placement for today
- A translucent Feels Like presence when different
- The member-supplied External Website URL

## What the embed never exposes

- Email address
- Cycle day
- Reflections or checkout notes
- Stay history
- Mentor relationships
- Member UUIDs
- Draft bio or private Profile Studio content
- Administrative information

The embed is marked `noindex` and refreshes when loaded, every 60 seconds while open, and when its browser tab becomes visible again. A member's existing Living Map visibility opt-out removes her from both authenticated and embedded views.
