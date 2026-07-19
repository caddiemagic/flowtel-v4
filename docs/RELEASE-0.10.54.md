# Flowtel v0.10.54 — The Moonbox

Release date: 2026-07-19

## Summary

This release opens **The Moonbox**, a separate authenticated room inside Flowtel for unsent letters to lovers and other masculines. A woman can write the first true version of the message she wants to send, allow the Moon to receive it, and choose whether the letter belongs in the anonymous Collective Moonbox or only in her private archive.

The Moonbox is intentionally separate from the Flow Map and Powder Rooms. It does not reuse their entries, consent flags, filters, or anonymous feeds.

## The Moonbox experience

Route:

`/moonbox/`

The room includes:

- **SEND TO THE MOON** — saves the letter and releases it anonymously into the authenticated Collective Moonbox;
- **KEEP BETWEEN ME & THE MOON** — saves the letter only in the signed-in member’s private archive;
- **COLLECTIVE MOONBOX** — an anonymous feed of collectively released letters;
- **MY MOONBOX** — the member’s personal archive of both private and collective letters;
- **I WITNESS YOU** — one silent anonymous acknowledgement per member, with no comments, threads, or direct messages.

The page can be entered directly from both the current Suite and the Flowtel Lounge.

## Moon and cycle context

When a letter is created, the authenticated RPC snapshots broad context from the member’s current Flowtel stay when one exists:

- Flowtel date using `America/Los_Angeles`;
- actual Inner Season;
- Feels Like Inner Season;
- moon phase;
- moon day;
- actual cycle day for the author’s private archive only.

The Moonbox never creates, modifies, closes, or reopens a Flowtel stay.

## Collective privacy boundary

The Collective Moonbox deliberately returns only:

- Moonbox message ID for internal button actions;
- message text;
- broad recipient archetype;
- Flowtel date;
- actual and Feels Like Inner Season;
- moon phase;
- anonymous witness count;
- whether the signed-in reader has already witnessed the message;
- whether the message belongs to the signed-in reader.

It does **not** return:

- author/member UUID;
- name or `display_name`;
- email;
- legal identity;
- profile photo or profile content;
- exact timestamp;
- cycle day;
- stay ID;
- reflections or checkout notes;
- mentor relationships;
- Team Map data;
- Powder Room data.

Collective submission performs both browser-side and authenticated RPC validation for obvious phone numbers, email addresses, links, and social handles. Members are reminded to remove names, workplaces, locations, and other identifying details before collective sharing. Private letters may retain the author’s original wording.

## Database model

Migration 042 adds:

- `public.flowtel_moonbox_messages`;
- `public.flowtel_moonbox_witnesses`;
- `flowtel_create_moonbox_message(...)`;
- `flowtel_get_my_moonbox_messages()`;
- `flowtel_get_collective_moonbox_messages(...)`;
- `flowtel_witness_moonbox_message(...)`.

Message rows remain owned by the authenticated author. Direct message-table selection is limited to the author’s own rows. Collective reading is available only through the anonymous-field RPC. Witness rows are accessible only through the secured RPC.

## Preserved systems

This release does not change:

- one stay per Flowtel Day;
- append-only stay history;
- Flowtel Time (`America/Los_Angeles`);
- current and historical Concierge-note continuity;
- Turndown Service and owner all-wing routing;
- personal passwords or remembered sessions;
- canonical `display_name` identity;
- owner-only Concierge access for `mm.johnson@icloud.com`;
- Team Map membership or public-safe boundary;
- mentor relationship logic;
- Powder Room anonymity and master sharing;
- Flow Map entries or filtering;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day logic.

Migration 037 remains retired and must not be rerun.

## Supabase migration

Run, in order:

1. Confirm corrected migration 041 has already been applied.
2. Run `database/migration-042-the-moonbox.sql`.
3. Deploy the v0.10.54 project.

Do **not** rerun migration 037.

## Files changed

- `client/index.html`
- `client/styles.css`
- `database/migration-042-the-moonbox.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.54.md`
- `moonbox/app.js`
- `moonbox/index.html`
- `moonbox/styles.css`
- `vercel.json`

## First test

1. Confirm corrected migration 041 has already run, then run migration 042.
2. Deploy v0.10.54 and enter Flowtel with an authenticated member.
3. Open **Enter The Moonbox** from the Suite and confirm `/moonbox/` loads.
4. Send a private letter with **KEEP BETWEEN ME & THE MOON**.
5. Confirm the letter appears only in **MY MOONBOX** and does not appear in the collective feed.
6. Send a second letter with **SEND TO THE MOON**.
7. Confirm it appears in both the author’s archive and the Collective Moonbox.
8. Confirm the collective card contains no member name, email, profile photo, UUID, cycle day, stay ID, or exact timestamp.
9. Sign in as a second member and press **I WITNESS YOU**.
10. Confirm the count increases once and the same member cannot add a duplicate witness.
11. Confirm the author cannot witness her own letter.
12. Paste an email address, phone number, URL, and social handle into a test letter and confirm collective sharing is blocked.
13. Confirm that same unedited letter can still be saved privately.
14. Confirm current Suite, Lounge, Concierge notes, Turndown Service, Powder Rooms, Flow Map, Team Map, Profile Studio, and Previous Visits continue loading normally.
