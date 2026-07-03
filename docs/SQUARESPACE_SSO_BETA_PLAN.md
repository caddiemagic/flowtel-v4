# Flowtel Release 0.5.3 — Squarespace SSO Beta Plan

## Important beta distinction

Flow FM initiation data is only for Flow FM practitioner members.
Queendom members are Flowtel guests and should not see Flow FM initiation status.

## SSO testing sequence

1. Keep Flowtel authentication working while we test.
2. Create member-only Squarespace pages:
   - `/check-into-the-flowtel` for Queendom members.
   - `/flow-fm-clock-in` or Flow FM member area link for practitioners.
3. Link those pages to:
   - `https://flowtel-v4.vercel.app/client/`
   - `https://flowtel-v4.vercel.app/manager/`
4. Verify Squarespace gates access correctly:
   - Queendom members can access guest page.
   - Flow FM members can access practitioner page.
   - Non-members cannot access either page.
5. Next release should add the identity bridge:
   - receive Squarespace member email,
   - match/create Supabase profile,
   - assign `client` or `practitioner` role based on member area,
   - remove beta login tools after real users are validated.

## Note

True SSO requires a trusted identity handoff. Do not rely on plain URL parameters for production because users can edit them.
For beta, we can test the user flow behind Squarespace member-only pages first, then add a secure server-side bridge.
