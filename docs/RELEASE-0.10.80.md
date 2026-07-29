# Flowtel v0.10.80 — Priestess Profile Personalization + Mailbox Room

Release date: 2026-07-28

Caddie Magic remains **v0.5.2**. This release lets each Flow FM Priestess begin with prepared profile language and personalize it without facing a blank page. It also gives the member Priestess Mailbox its own private room and places that doorway inside the existing Concierge Team Rooms.

## Editable prepared bios

Profile Studio now separates the prepared description from the member’s final profile bio:

1. choose a Priestess title;
2. choose one of the prepared descriptions for that title;
3. begin with the selected description already inside **Make It Your Own**;
4. keep it exactly as written or edit any portion;
5. preview and save the personalized bio through the existing profile draft and witnessing flow.

The selected template key remains stored in the existing `framework_language` metadata while the customized text remains stored in the existing `bio` field. No new profile table or second identity source is introduced.

## Edit protection

- Changing a title or prepared-description selection does not silently erase a personalized bio.
- When the current text still matches the previous prepared description, a new selection can populate the editor automatically.
- When personalized edits exist, Flowtel keeps them and asks the Priestess to press **Use This Description** before replacing them.
- **Restore Original Description** returns the editor to the currently selected prepared description.
- The live profile preview reads directly from the editable bio field.

## Dedicated Priestess Mailbox room

The full member mailbox is removed from beneath the Profile Studio form and now lives at:

```text
/flow-fm/priestess-mailbox/
```

The private room preserves the existing mailbox system:

- send audio privately to Megan;
- receive owner-delivered private files and returned recordings;
- download through signed private URLs;
- preserve thread, delivery, received, and downloaded history;
- keep the existing private Storage bucket, RPCs, RLS, and migration-046 foundation.

A quiet Profile Studio doorway remains so Flow FM members do not lose access when they are not currently clocked into the Concierge Team.

## Concierge Team Rooms

The existing **Visible to approved Priestesses** section now includes a **Priestess Mailbox** card. It opens the dedicated member mailbox and does not expose the owner-wide Priestess Mailbox administration queue.

The owner-only mailbox remains under Owner Administration because it contains recipient selection, all Priestess threads, incoming practitioner audio, and owner return-file controls.

## Privacy and access

- The dedicated mailbox is private and no-store.
- Flow FM, Council, and established practitioner-level members may open their own mailbox.
- Each member sees only her own mailbox rows under existing RPC/RLS rules.
- Owner Administration and other members’ files remain inaccessible.
- Legal names, Flow Map data, cycle history, and cross-product access are unchanged.

## Migration

**No new migration is required.**

The release uses the existing Profile Studio fields and the existing migration-046 Priestess Mailbox system. Do not rerun migration 046 merely for this release.

## First test checklist

1. Deploy v0.10.80 and hard-refresh Profile Studio.
2. Choose a prepared profile description and confirm it appears inside **Make It Your Own**.
3. Edit the bio and confirm the live profile preview updates.
4. Change the prepared-description selection and confirm personalized text is preserved until **Use This Description** is pressed.
5. Press **Restore Original Description** and confirm the selected prepared copy returns.
6. Save the profile, refresh, and confirm both the customized bio and selected description remain aligned.
7. Open the Concierge Desk as an approved Priestess and confirm the Priestess Mailbox card appears under Team Rooms.
8. Open `/flow-fm/priestess-mailbox/`, send audio, refresh, and confirm the thread remains.
9. Send a private owner file to the Priestess and confirm it appears and downloads from the dedicated room.
10. Confirm the full mailbox interface no longer appears beneath Profile Studio and the owner mailbox administration remains owner-only.
11. Confirm Caddie Magic v0.5.2 is unchanged.
