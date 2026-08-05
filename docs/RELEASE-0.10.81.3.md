# Flowtel v0.10.81.3 — Suite Action Harmony + Availability Detail + Siren Profiles

Release date: August 4, 2026

## Purpose

This release completes the next Flowtel polish batch without changing the live Womb Magic Acuity booking rules. It aligns the Suite actions, makes the owner Availability room useful as an Acuity reference, and expands Priestess Profile Studio identity guidance.

## Updates

### Unified Suite actions

- **Save Reflection**, **Choose Your Mentor**, and **Schedule Womb Magic** now share the established soft-pink, full-width Suite action style.
- The empty decorative pill beneath the Womb Magic action is removed.
- Existing inline Womb Magic booking, monthly eligibility, consent, cancellation, and rescheduling remain unchanged.

### Owner Availability room

- Replaces the dark administration shell with the established cream, rose, brown, and gold Flowtel visual system.
- Uses the restrained page-title scale instead of an oversized hero heading.
- Shows the member's full human-readable timezone.
- Shows exact available weekdays and exact start/end times for every Inner Season.
- Distinguishes saved resting seasons from incomplete rhythms.
- Preserves Available Now, Accepting Clients, Incomplete, and Recently Updated filters.
- Remains owner-only and read-only.

### Siren Priestess and editable title

- Adds **Siren Priestess** as a guided archetype centered on voice alchemy, sound, magnetic expression, speaking, singing, storytelling, and being heard.
- Adds aligned bio templates and offering suggestions.
- Separates the guided archetype from the public title.
- Members may keep the suggested title or publish a custom title such as Voice Alchemist or Sacred Expression Guide.
- Uses the existing `modalities` field for the published title and existing `framework_language` metadata for the archetype, preserving current profile storage and review behavior.

## Database

The Flowtel-only updates use existing profile and Availability storage. Migration 066 is required only because this coordinated release also contains Caddie Magic v0.6.0 scheduling.

## Protected behavior

- One Mentor to the Moon per member.
- Womb Magic appointment consent and seven-day access.
- Flowtel membership boundaries.
- Legal-name privacy and published display-name rules.
- Availability remains a planning preference; Acuity remains the source of real bookable times.
