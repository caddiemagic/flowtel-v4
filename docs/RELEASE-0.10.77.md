# Flowtel v0.10.77 — 13 Moons Curriculum Consolidation

Release date: 2026-07-23

Caddie Magic remains **v0.5.2**. This release does not change Player access, Caddie permissions, scores, invitations, courses, messages, or Caddie Magic history.

## Summary

This release condenses the Flow FM curriculum into one clear member path. **13 Moons** is now the single curriculum hub. Each Moon card holds its paired **Womb Work** and **Busy Work**, and the former standalone Womb Work and Assignments rooms no longer compete as separate curriculum destinations.

The database and RPC names remain assignment-based for historical compatibility. The member-facing experience now uses **Busy Work** throughout.

## 13 Moons curriculum hub

- Every personalized Moon card shows the Moon name, season, dates, Womb Work, Busy Work, and current Busy Work status.
- Womb Work and Busy Work open inside the same Moon portal.
- Each card has one restrained **Open Moon** action while preserving direct links to each curriculum part.
- Current-Moon highlighting, personalized order, Moon dates, Ouroboros timing, and work-ahead access remain intact.
- The layout is compact and responsive rather than splitting the curriculum into separate document-like rooms.

## Busy Work naming

- Changes member-facing **Assignments** and **Business Assignments** language to **Busy Work**.
- Updates the current curriculum card, Moon portal, submission messages, review queue, labels, links, and empty states.
- Preserves existing `flow_fm_assignment_submissions`, RPC names, stored statuses, review history, and completion records.

## Navigation and compatibility

- Removes Womb Work and Assignments from the primary Flow FM navigation.
- Keeps `/flow-fm/womb-work/` and `/flow-fm/assignments/` alive as compatibility routes that forward into 13 Moons.
- Updates admin review links to open the selected member record and Busy Work month directly.
- Repairs the malformed browser-module import that existed in the legacy Assignments and Review Desk pages.

## Migration

**No new migration required.**

Migration 061 from v0.10.76 must be live before relying on the Availability day-state and owner Hourly Flow Rate additions from that release. This curriculum consolidation does not change tables, RPC signatures, RLS, or Storage.

Do not rerun migrations 058, 059, 060, either historical migration 052 body, or retired migration 037.

## Protected behavior

This release preserves Flowtel Time, one stay per Flowtel Day, append-only history, personal passwords, remembered sessions, canonical display names, membership rank, owner-only Concierge, mentor consent, Powder Room anonymity, Flow Map history, frozen Medicine Wheel geometry, Actual versus Recorded cycle logic, explicit Flow FM Start Date, the `(month - 1) / 12` progress marker, the fixed Hourly Flow Rate formula, and all Caddie Magic v0.5.2 boundaries.

## First test checklist

1. Deploy v0.10.77 after confirming the v0.10.76 migration state.
2. Open 13 Moons as a practitioner-level member and confirm all 13 Moon cards render in personalized order.
3. Confirm every unlocked Moon card contains one Womb Work section and one Busy Work section.
4. Confirm the current Moon is marked and Busy Work status matches saved assignment history.
5. Open Womb Work and Busy Work from a Moon card and confirm both land in the correct Moon portal section.
6. Save and submit Busy Work, refresh, and confirm status/history persist.
7. Open the Review Desk and confirm the queue says Busy Work and deep-links to the correct member/Moon.
8. Open the old Womb Work and Assignments URLs and confirm they forward to 13 Moons.
9. Confirm Womb Work and Assignments no longer appear as separate top navigation items on all Flow FM pages.
10. Confirm Moon 13 remains locked until the established anniversary rule opens it.
11. Recheck Profile Studio, Planning Room, Availability, Hourly Flow Rate, Living Map, Time + Space, Suite return, and remembered sessions.
12. Confirm Caddie Magic v0.5.2 remains unchanged.
