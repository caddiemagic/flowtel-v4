# Flowtel v0.10.86 — Moon Mail + Personal Cosmology

Released: August 21, 2026

## Purpose

Extend the existing Moonbox into **Moon Mail** without duplicating its unsent-message system, and add a deliberately private **Personal Cosmology** room for birth data and Human Design source files.

This release is intentionally narrow. It does not calculate astrology or Human Design, does not add SMS/email scheduling, and does not reopen Flowtel identity, Stay history, event-access, Mentor-consent, Womb Magic, or Caddie Magic foundations.

## Moon Mail — the existing Moonbox evolves

Moon Mail continues to use the v0.10.54 Moonbox foundation at `/moonbox/` and the existing `flowtel_moonbox_messages` / witness system. A new `/moon-mail/` route points to that same room; `/moonbox/` remains valid for old bookmarks.

### Long-form letters

- The practical message cap increases from **4,000 to 16,000 characters** in both the browser and database boundary.
- The original `flowtel_create_moonbox_message(text,text,boolean)` RPC signature and return shape are preserved for compatibility.
- Existing private-vs-collective choice, recipient archetypes, Flowtel/moon/season snapshot context, Collective Moonbox anonymity, and **I WITNESS YOU** behavior remain intact.

### Seven-day private return

New Moon Mail receives a private `return_due_at` timestamp exactly seven days after submission. Legacy Moonbox letters are preserved and are not retroactively assigned a due state.

A new append-only `flowtel_moonbox_returns` record may be created once, only by the original author, after the due time. The original message row is never overwritten by the return.

The private return asks:

1. **How do you feel now, seven days later?**
2. **What has happened since you sent this message to the Moon instead of him?**
3. Optional: **What do you know now that you could not hear when you first wrote it?**

The return outcome remains private even when the original letter was released anonymously to the Collective Moonbox. The collective RPC was not expanded to include return data.

### In-app due doorway

When one or more returns are due, the signed-in member's Suite and Lounge can show:

**THE MOON HAS MAIL FOR YOU**

with a **RETURN TO YOUR MESSAGE** doorway. Multiple due letters are presented as a calm queue rather than stacked alerts. No email, SMS, cron job, or background scheduler is required for this first version.

## Personal Cosmology

Adds `/personal-cosmology/` as a private Birth + Design source room.

Member-entered fields:

- birth date;
- birth time;
- birth-time confidence: Exact / Approximate / Unknown;
- birthplace;
- optional private notes;
- Human Design chart upload.

Accepted chart files are PNG, JPG/JPEG, WebP, or PDF, up to 15 MB. Flowtel does **not** calculate astrology, cast a chart, interpret Human Design, or infer chart fields in this release.

### Privacy architecture

Birth/design data lives in dedicated `flowtel_member_cosmology`, not broadly reused profile fields. Human Design files live in the private `flowtel-personal-cosmology` Storage bucket and are opened through short-lived signed URLs only after authorization.

The member may always view/edit her own Personal Cosmology. Practitioner access requires **both**:

- the member's explicit **Share my Birth + Design details** consent; and
- an active authorized care relationship: a connected/consented Mentor relationship or active consented Womb Magic appointment access.

There is no generic Owner/Admin bypass in the Personal Cosmology helper. Event hosting alone does not grant access. Personal Cosmology is not added to Team Map, public Priestess profiles, the Queendom directory, or general practitioner directories.

Authorized preparation doorways are added to the existing Client Snapshot and Upcoming Calls experiences; the server remains the permission authority.

## Database / routing

Run exactly once, after migration 070:

`database/migration-071-moon-mail-personal-cosmology.sql`

Migration 071:

- extends the existing Moonbox message-length constraint;
- adds private return due state + append-only return records/RPCs;
- adds the dedicated Personal Cosmology table/RPCs;
- creates the private Human Design Storage bucket and authorization policies.

No new Vercel environment variables are required.

## Preserved boundaries

This release does not change:

- canonical Flowtel Time (`America/Los_Angeles`);
- one Stay per Flowtel Day;
- historic Stay/reflection/Turndown behavior;
- Powder Room anonymity;
- Flow Map consent;
- existing Mentor relationship rules;
- Womb Magic booking/recording/appointment access;
- event visibility vs. membership vs. payment vs. registration vs. private-room access;
- Caddie Magic v0.6.0 or the rule that every Caddie remains a Player first.

## Beta-exit verification remains a live prerequisite

Source validation of v0.10.86 does not prove the remaining production beta-exit checklist. Before calling beta exit green, confirm migration 070 live, eligible first-time signup + Confirm Signup, completed password recovery, production Squarespace Commerce permissions/product mappings, Movie Night paid/included access, refund/revocation, Event Pass isolation, and the canonical Squarespace `/client/` CTA.

## First live test

1. Run migration 071 once after confirming migration 070 is live.
2. Send a private and a collective Moon Mail; confirm both accept a message longer than 4,000 characters and reject more than 16,000.
3. Confirm the collective feed still omits author identity, cycle day, exact timestamps, and all seven-day return data.
4. For a test letter, set its due time safely in the test database or wait seven days; confirm the Suite/Lounge due doorway appears only for its author.
5. Complete the seven-day return; confirm the original message is unchanged, the return is shown only in **My Moon Mail**, and a second return cannot be added.
6. Save Personal Cosmology as the member and upload an allowed private chart file; confirm a signed chart link opens and no public URL is stored.
7. With sharing OFF, confirm Mentor/Priestess access is denied even when the relationship/appointment is active.
8. Turn sharing ON and confirm only the connected consented Mentor or active appointment-holding Priestess can open the Birth + Design details/chart.
9. Revoke sharing and confirm practitioner access stops immediately.
10. Confirm Team Map/public profile/directory surfaces contain no Personal Cosmology data.
11. Re-run core Flowtel, Womb Magic/event, and Caddie Magic regressions.

## Next priority

After beta-exit live verification and v0.10.86 production verification, the next high-priority feature is **Front Desk / Concierge Messages**. Twilio Wake Up Text + event reminders remain deferred after that unless reprioritized.
