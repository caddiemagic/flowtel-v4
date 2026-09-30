# Flowtel v0.10.90.1 — First Live Test Checklist

This hotfix is **SOURCE VALIDATED** only until the owner deploys it and confirms the browser behavior in production.

## Event Editor validation

- [ ] Vercel deployment is Ready.
- [ ] Hard-refresh Owner → Queendom Events.
- [ ] Choose **Single Event** and confirm Series sessions / Days between series sessions are not visible.
- [ ] Map/import one Acuity class occurrence and save/publish without a `minimum 2` browser error.
- [ ] Choose **Recurring Event** and confirm the two Series-only fields remain absent.
- [ ] Import/refresh a recurring Acuity schedule and save/publish.
- [ ] Choose **Series / Vortex** and confirm Series sessions + interval become visible.
- [ ] Confirm Series sessions still rejects values below 2.

## Regression spot-check

- [ ] Public calendar still loads.
- [ ] One Queendom member can claim an eligible event seat.
- [ ] Acuity-linked booking still creates/syncs normally.
- [ ] Event Flow Map still loads for host/co-host/Owner.
- [ ] Remembered-session login still works.

Do not call v0.10.90.1 **LIVE PRODUCTION VERIFIED** until these production checks pass.
