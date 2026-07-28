# Flowtel v0.10.78.2 — Priestess Access + File Delivery Hotfix

Release date: 2026-07-28

Caddie Magic remains **v0.5.2**. This hotfix does not alter database permissions, owner administration, Turndown authorization, Flow FM history, or Caddie Magic.

## Summary

This hotfix repairs two browser-side gaps discovered during live testing of v0.10.78.1: an approved Priestess could be granted Concierge Team access but still could not see **Clock Into the Flowtel**, and a private file preserved in the Priestess Inbox draft was rejected by the browser as though no file had been selected.

## Approved-Priestess Clock In

- Reads the existing migration-062 Concierge Team capability when an authenticated room opens.
- Shows Clock In to the Flowtel owner and to a `practitioner` whose Concierge Team access is active.
- Keeps Clock In hidden for ordinary Flow FM members, Queendom-only members, paused practitioners, and Caddie-only accounts.
- Applies the same decision to the arrival page, Suite, and Lounge.
- Refreshes the server permission again when Clock In is pressed, preventing a stale page from overriding a newly granted or paused capability.
- Preserves the existing manager route, Team-Room-only practitioner audience, owner-only administration, current-day stay, clock session, and assigned-wing rules.

## Priestess Inbox preserved-file delivery

- Treats the **Ready for Private Delivery** file as the active file after the Inbox form redraws.
- Removes the browser `required` constraint only while a real preserved file exists.
- Continues to require a file when neither the browser picker nor the preserved draft contains one.
- Uses an explicit file check before upload and displays an inline Flowtel message rather than an incorrect browser warning.
- Preserves recipient, subject, private note, selected filename, upload progress, Clear File behavior, and private mailbox delivery.

## Migration

**No new migration is required.**

Migration 062 remains the required database foundation for Concierge Team access. Do not rerun it merely for this hotfix.

## First test checklist

1. Deploy v0.10.78.2 and hard-refresh the member Suite and Concierge Desk.
2. Grant a Flow FM member with role `practitioner` Concierge Team access.
3. Sign in as that Priestess and confirm **Clock Into the Flowtel** appears on Check-In, Suite, and Lounge surfaces where applicable.
4. Click Clock In and confirm she enters the existing Concierge Desk with only **Visible to approved Priestesses**.
5. Pause her Team Access, refresh, and confirm Clock In disappears and Desk entry is blocked.
6. In the owner Priestess Inbox, choose a recipient, subject, and file.
7. Confirm **Ready for Private Delivery** appears after the form redraws.
8. Press **Send Through the Flowtel** without choosing the same file again.
9. Confirm the upload begins and the recipient receives the private file.
10. Clear a selected file and confirm submission is blocked until a new file is chosen.
11. Recheck the v0.10.78.1 Turndown cancellation safety.
12. Confirm Caddie Magic v0.5.2 remains unchanged.
