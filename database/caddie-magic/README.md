# Caddie Magic Migration Registry

Caddie Magic migrations remain in the root `database/` directory because the project currently installs migrations manually in numerical order. This folder is an index only; do not duplicate SQL files here.

Current Caddie Magic sequence:

1. 030 — Moon Score Tracker
2. 040 — Reflections + Collective Swing Map
3. 041 — Review Service
4. 042 — Compass + Assignments + Dispatches
5. 043 — Portal Polish + Upcoming Golf
6. 044 — Player-Only Access + Private Beta Invitations
7. 045 — Player Invitation Code Hotfix

The next globally available migration number after this integrated release is **046**. Check the root database directory before assigning it because Flowtel and Caddie Magic share one migration sequence.
