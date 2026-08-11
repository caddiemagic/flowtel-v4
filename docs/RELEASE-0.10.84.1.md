# Flowtel v0.10.84.1 — Womb Magic Recording Consent

Released: August 10, 2026

## Purpose

Make the recording and Flow FM Library training use of Womb Magic calls explicit at the moment a member consents to and books the call.

## What changed

- Extends the canonical Womb Magic consent language to state that the call **will be recorded and uploaded to the Flow FM Library for training purposes**, where it will be shared with care and integrity.
- Updates the booking checkbox so the member explicitly acknowledges both:
  - the temporary Priestess access to her Flowtel data for call preparation; and
  - the recording and Flow FM Library training use of the Womb Magic call.
- Keeps the existing **CONSENT + BOOK MY CALL** gate: booking remains disabled until the member checks the consent box.
- Persists the updated canonical consent language on newly booked Womb Magic appointment records and appointment access grants through the existing `consent_language` fields.

## Important scope note

This release updates consent for **new bookings made after deployment**. Existing Womb Magic appointments that were booked under the previous consent language are not retroactively treated as having consented to recording/library use.

## Database

No migration is required. Existing consent-language and consent-timestamp fields are reused.

Next migration number remains **070**.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie Magic behavior or consent language is changed by this release.
