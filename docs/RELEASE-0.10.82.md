# Flowtel v0.10.82 — Enter Womb Magic

Release date: August 7, 2026

## Purpose

This release makes Flowtel the doorway into the live Womb Magic appointment. Acuity remains the scheduling authority, each Priestess calendar remains responsible for its own Acuity video-conferencing connection, and Zoom remains the meeting host. Flowtel now surfaces the Zoom room to the booked client and the Priestess holding that exact appointment.

## Client experience

Once a scheduled Womb Magic appointment has a Zoom location in Acuity, the Suite shows a prominent **ENTER WOMB MAGIC** action on the member's upcoming-call card and inside the appointment details.

The action opens the Zoom room in a new browser/app handoff without embedding Zoom inside Flowtel.

If Acuity has not supplied a Zoom room yet, Flowtel keeps the scheduling details visible and shows a gentle room-preparing message rather than exposing a broken or untrusted link.

## Priestess experience

The existing **Upcoming Calls** room now adds **BEGIN WOMB MAGIC** to each appointment that has a valid Zoom room.

The Priestess can continue to use **Open Client Snapshot** and **Open Flow Map** for appointment-scoped preparation, then launch the correct Zoom room from the same call card.

## Acuity + Zoom bridge

- The existing Acuity appointment payload remains the source of virtual-location data.
- Flowtel reads only the Acuity appointment `location` value for this doorway.
- If an active stored appointment does not yet contain a Zoom location, Flowtel performs a server-side refresh of that exact Acuity appointment and updates the existing `external_payload` snapshot.
- Rescheduling continues to replace the stored Acuity payload so the doorway follows the current appointment state.
- Cancellation continues to revoke appointment access and cancelled appointments do not expose a meeting link.
- The existing signed Acuity `changed` webhook remains in place and continues refreshing the appointment payload after Acuity-side changes.

## Link safety and permission boundaries

Flowtel never sends the raw Acuity `external_payload` to the browser.

The server extracts a meeting URL only when it is:

- HTTPS; and
- hosted on `zoom.us`, a `zoom.us` subdomain, `zoom.com`, a `zoom.com` subdomain, `zoomgov.com`, or a `zoomgov.com` subdomain.

Lookalike domains such as `zoom.us.evil.example` are rejected.

Member access remains limited to the member's own Womb Magic appointments. Priestess access continues to begin with the existing provider-authorized Upcoming Calls query; Flowtel only merges meeting data for appointment IDs that query already authorized for that signed-in provider. Owner behavior remains governed by the existing owner/provider permissions.

## Required Acuity setup

For every Priestess who will hold Womb Magic calls:

1. Her Flowtel scheduling profile must already be mapped to the correct Acuity calendar.
2. That Acuity calendar must have the intended Zoom/video host connected.
3. Video conferencing must be enabled for the Womb Magic appointment type on that calendar/account configuration.
4. Test with a newly booked appointment and confirm Acuity's appointment location contains the generated Zoom meeting URL.

Appointments created before the Acuity video integration was enabled may not receive a generated meeting room automatically; rebooking may be required for those historical appointments.

## Database

**No database migration is required for Flowtel v0.10.82.**

The release reuses `flowtel_external_appointments.external_payload`, the existing appointment/access tables, migration 064 scheduling foundation, migrations 065–066 extensions, and the existing Acuity webhook.

The next unused migration number remains **067**.

## Environment

No new Vercel environment variables are required. Continue using:

- `ACUITY_USER_ID`
- `ACUITY_API_KEY`

Flowtel does not store Zoom credentials and does not call the Zoom API in this release.

## Caddie Magic

Caddie Magic remains **v0.6.0**. This release does not add Zoom launch actions to Caddie Magic and does not change Caddie Magic scheduling, Player identity, pairings, permissions, or appointment access.

## First live test checklist

1. Confirm migration 066 is already live before testing the existing scheduling system.
2. In Acuity, confirm the test Priestess calendar is connected to the intended Zoom host and Womb Magic is enabled for video conferencing.
3. Book a brand-new Womb Magic appointment from the member Suite.
4. Confirm the Suite displays **ENTER WOMB MAGIC**.
5. Click it and confirm it opens the exact Zoom room shown in that Acuity appointment's location.
6. Sign in as the booked Priestess and open **Upcoming Calls**.
7. Confirm the matching card displays **BEGIN WOMB MAGIC** and opens the same Zoom room.
8. Confirm a different Priestess cannot see the call through her provider view.
9. Reschedule the appointment; refresh both views and verify the current Acuity/Zoom room remains launchable.
10. Cancel the appointment and confirm the call/launch doorway disappears from active views and appointment-scoped data access is revoked.
11. Test a second Priestess mapped to a different Acuity calendar/Zoom host and confirm her booking launches her own Zoom room rather than the first Priestess's room.
12. Confirm Caddie Magic v0.6.0 still passes its validator and has no new Zoom UI.
