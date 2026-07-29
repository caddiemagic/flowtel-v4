# Flowtel v0.10.80.1 — Priestess Mailbox Delivery Alert

Release date: 2026-07-29

Caddie Magic remains **v0.5.2**. This focused release surfaces private owner-delivered files for each Priestess without adding email notifications or changing the private mailbox foundation.

## Concierge Team Rooms alert

The **Priestess Mailbox** card now reads the signed-in member’s own mailbox rows.

When one or more files have been delivered to her and have not yet been downloaded, the card:

- changes from **OPEN** to **1 NEW FILE**, **2 NEW FILES**, and so on;
- receives the existing restrained gold alert treatment;
- announces the unread count through an accessible card label;
- remains scoped to the signed-in Priestess rather than the owner-wide mailbox queue.

The owner-only Priestess Mailbox card continues to show incoming practitioner audio waiting for the owner. The two counts remain separate.

## Profile Studio doorway alert

The quiet Priestess Mailbox doorway beneath Profile Studio now shows the same member-specific delivery count and gold alert treatment. This preserves visibility even when the Priestess is not currently clocked into the Concierge Desk.

The alert is hidden when the owner is viewing another member’s Profile Studio record.

## Mailbox-room alert

Inside `/flow-fm/priestess-mailbox/`:

- a private-delivery panel appears when files are waiting;
- the count uses singular and plural language correctly;
- every undownloaded delivery is highlighted;
- opening the mailbox does not clear the alert;
- the alert clears only after the download action succeeds and the existing `downloaded_at` acknowledgment is recorded.

Existing thread history, signed URLs, private Storage, RPCs, RLS, and delivery records remain unchanged.

## Migration

**No new migration is required.**

This release uses the existing `direction = 'to_practitioner'` and `downloaded_at` mailbox state. Do not rerun migration 046.

## Minimal live deployment

Deploy these nine runtime files while preserving folder paths:

```text
manager/index.html
manager/app.js
manager/styles.css

flow-fm/profile-studio/index.html
flow-fm/profile-studio/page.js
flow-fm/profile-studio/styles.css

flow-fm/priestess-mailbox/index.html
flow-fm/priestess-mailbox/page.js
flow-fm/priestess-mailbox/styles.css
```

## First test checklist

1. Send a private file from the owner Priestess Mailbox to an approved Priestess.
2. Sign in as that Priestess and open the Concierge Desk.
3. Confirm the Team Rooms Mailbox card shows **1 NEW FILE** with the gold alert treatment.
4. Open Profile Studio and confirm its Mailbox doorway shows the same count.
5. Open the Priestess Mailbox and confirm the private-delivery panel and highlighted file appear.
6. Leave the page without downloading and confirm the alert remains.
7. Download the private file successfully.
8. Refresh the Mailbox, Profile Studio, and Concierge Desk and confirm the alert clears.
9. Send two files and confirm plural language and a count of two.
10. Confirm the owner mailbox still reports incoming practitioner audio separately.
