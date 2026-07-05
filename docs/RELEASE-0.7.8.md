# Release 0.7.8 — Concierge Queue Routing Repair

## Purpose
Repair Concierge Desk beta routing and queue visibility before Flow FM practitioner testing.

## Changes
- Restored the Awaiting Turndown stat pill.
- Merged New Connections into the Your Clients stat pill.
- Added alert styling to active Awaiting Turndown and Your Clients pills.
- Updated turndown routing to match requested stays by the practitioner's assigned/tending wing.
- Normalized wing comparisons so casing/spacing mismatches do not hide requests.
- Updated Guests in House to count and list all open stays for the current Flowtel date.
- Kept the wing polarity model: a practitioner clocked into one wing tends the opposite wing.

## Beta rule
A practitioner should see every pending turndown request where:

```
stay.wing = practitioner.assigned_wing
stay.turndown_status = requested
```

## Test case
1. Clock practitioner into North Wing.
2. Confirm Today's Flow says she is tending South Wing.
3. Check in a guest in South Wing.
4. Request turndown service.
5. Concierge Desk should show:
   - Awaiting Turndown count increases.
   - Queue contains the guest.
   - Guests in House shows all current open stays for the Flowtel date.
