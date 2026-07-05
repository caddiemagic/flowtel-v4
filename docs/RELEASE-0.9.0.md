# Flowtel Release 0.9.0 — Choose Your Mentor

## Purpose

This release begins the next product phase: the guest-facing **Choose Your Mentor** relationship layer.

The product language remains:

- Guest-facing: **Mentor**, **Mentor to the Moon**, **Choose Your Mentor**, **Connect**
- Internal/technical: practitioner, relationship records, Supabase role checks

This release does not add scheduling, payments, mentor profile management, or automated matching. It creates the stable relationship foundation those features will build on later.

## Files changed

- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`
- `shared/relationships.js`
- `shared/flowtel.js`
- `database/migration-014-choose-your-mentor.sql`
- `docs/RELEASE-0.9.0.md`
- `docs/CHANGELOG.md`

## Guest Suite updates

The Suite card now behaves as **Your Mentor to the Moon**:

1. If no mentor is chosen:
   - Shows “No mentor chosen yet.”
   - Button says **Choose Your Mentor**.
   - Opens a mentor directory.

2. Mentor directory:
   - Shows mentor cards instead of plain buttons.
   - Displays name, title, bio, initiation/wing line, and optional specialty tags.
   - Button says **Choose [First Name]**.

3. If a mentor request is pending:
   - Shows “Invitation sent to [Name].”
   - Explains that the request is waiting at the Concierge Desk.
   - Button changes to **Invitation Sent**.

4. If connected:
   - Shows the mentor name.
   - Explains the relationship persists across future stays until intentionally changed.
   - Button changes to **Mentor Connected**.

## Concierge Desk updates

The Clients tab has been softened into mentor relationship language:

- **Your Clients** becomes **Your Guests**.
- **New Connections** becomes **Mentor Requests**.
- Request copy says: “Would like you to be her Mentor to the Moon.”
- Button remains **Connect**, not Accept.

## Database updates

Run:

```sql
-- database/migration-014-choose-your-mentor.sql
```

This migration adds optional mentor directory fields to `profiles`:

- `mentor_title`
- `mentor_bio`
- `mentor_photo_url`
- `mentor_specialties`
- `mentor_accepting_clients`
- `mentor_sort_order`
- `serving_wing`

It also hardens relationship logic with two RPCs:

- `flowtel_choose_mentor(p_mentor_id uuid)`
- `flowtel_connect_mentor_relationship(p_relationship_id uuid)`

## Product rules introduced

- A guest may have only one active Mentor to the Moon relationship at a time.
- A pending request may be superseded before connection.
- A connected mentor relationship persists until an intentional change feature is added.
- Relationship history is preserved; superseded requests are marked disconnected rather than deleted.
- The mentor must Connect from the Concierge Desk before the relationship becomes active.

## Test plan

1. Guest account opens Suite.
2. Guest clicks **Choose Your Mentor**.
3. Mentor directory appears with cards.
4. Guest clicks **Choose [Name]**.
5. Suite card changes to pending invitation state.
6. Mentor logs into Concierge Desk.
7. Mentor opens **Your Guests** / mentor relationships.
8. Mentor sees the request.
9. Mentor clicks **Connect**.
10. Guest returns to Suite and sees connected mentor state.

## Notes

This release does not change Turndown Service, stay creation, Flowtel Time, Moon Magic, or append-only stay history.
