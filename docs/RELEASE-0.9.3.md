# Flowtel Release 0.9.3

## Mentor Connection Repair + Consent Foundation

This release repairs the dead visible **Connect** button and prepares the consent-aware foundation for mentor/client cycle data access.

## Root cause fixed

The visible Mentor Request card could inherit a `data-bound-connect="true"` marker from the hidden relationship cache. Because event listeners do not copy with `innerHTML`, the visible button looked active but had no click handler. v0.9.3 now tracks bound buttons with an in-memory `WeakSet` instead of a copied DOM attribute.

## Product decisions implemented

- A guest can have one active Mentor to the Moon at a time.
- A mentor can have many connected clients.
- Inviting a mentor records explicit consent to share Flowtel cycle data, check-ins, reflections, and stay history while connected.
- Connected clients now show a **View Data** button.
- Practitioners are treated as guests first and mentors second: the new dashboard shell supports a mentor's own data and connected client data.
- Profile photos remain URL-ready but upload/source behavior is intentionally deferred.

## Files changed

- `manager/index.html`
  - Renames the practitioner stat card to **Your Clients**.

- `manager/app.js`
  - Repairs Connect button binding.
  - Renames practitioner relationship language to **Your Clients**.
  - Adds **View Data** buttons for connected clients only.
  - Keeps pending mentor requests separate from connected clients.

- `client/app.js`
  - Updates pending mentor copy from “she” to “they.”
  - Shows the exact consent language in the mentor directory.
  - Changes **Invitation Sent** to **Cancel / Change Request** and supports cancelling pending requests.

- `shared/relationships.js`
  - Adds shared mentor consent language.
  - Adds consent-aware mentor invite RPC call.
  - Adds pending mentor request cancellation.

- `shared/flowtel.js`
  - Exports the new relationship helpers.

- `cycle-data/`
  - Adds the first Flow Map / Cycle Data dashboard shell.
  - Supports My Data, connected client views, and admin All Clients placeholder routing.

- `vercel.json`
  - Adds `/cycle-data` and `/flow-map` routes.

- `database/migration-016-mentor-connection-consent-foundation.sql`
  - Adds consent/data-access fields.
  - Adds `flowtel_choose_mentor_with_consent`.
  - Adds `flowtel_cancel_mentor_request`.
  - Recreates `flowtel_connect_mentor_relationship` defensively.

## Supabase

Run:

```sql
database/migration-016-mentor-connection-consent-foundation.sql
```

Migration 014 and 015 should already be installed before this release.

## Test path

1. Guest chooses a mentor and sees explicit consent copy.
2. Supabase row remains `requested` until mentor connects.
3. Mentor opens Concierge Desk and clicks **Your Clients**.
4. Mentor clicks **Connect**.
5. Button should change to **Connecting...**.
6. Supabase row should change from `requested` to `connected`.
7. Request disappears from Mentor Requests.
8. Guest appears under **Your Clients** with a **View Data** button.
9. **View Data** opens `/cycle-data/?client=<client_id>`.
10. Guest Suite shows connected Mentor to the Moon.
