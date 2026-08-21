# Flowtel v0.10.86.2 — Moon Mail Route Hotfix

**Release type:** narrow routing hotfix  
**Base release:** v0.10.86.1 — Personal Cosmology Storage Policy Hotfix  
**Migration:** No migration required

## Why this hotfix exists

Flowtel v0.10.86 introduced **Moon Mail** as an alias for the existing `/moonbox/` room. Member-facing Suite/Lounge links correctly used `/moon-mail/`, but the Vercel alias only declared the exact `/moon-mail` rewrite. The trailing-slash route and relative asset paths were not covered by a companion catch-all rewrite, so the deployed alias could return **404 Not Found**.

The alias also was not listed in the shared Flowtel protected-route prefixes, even though `/moonbox/` already was.

## Fix

- Keep `/moonbox/` as the existing physical Moonbox/Moon Mail implementation.
- Keep `/moon-mail/` as a transparent member-facing alias; no second unsent-message system is created.
- Add an exact Vercel rewrite from `/moon-mail` to `/moonbox/`.
- Add `/moon-mail/:path*` → `/moonbox/:path*` so `/moon-mail/`, CSS, JavaScript, and any future nested Moon Mail assets resolve through the same existing room.
- Add `/moon-mail/` to the shared Flowtel protected-route prefixes beside `/moonbox/`.
- Cache-bust the Moon Mail import of the shared access guard so deployed browsers pick up the protected alias immediately.

## Privacy and product contract preserved

This hotfix does not change Moon Mail data, collective anonymity, seven-day return privacy, append-only history, Personal Cosmology permissions, Stay history, Flowtel Time, Womb Magic, event access, or Caddie Magic Player-first behavior.

## Deployment instructions

1. Deploy the v0.10.86.2 source to Vercel.
2. **Do not run a Supabase migration.** Migrations 071 and 072 remain unchanged.
3. Open `/moon-mail/` from the Suite/Lounge.
4. Confirm the page renders rather than returning 404.
5. Confirm its CSS/JavaScript load and a signed-in Flowtel member can open her existing Moon Mail archive.
6. Confirm `/moonbox/` still works for legacy bookmarks.

**Next migration remains 073.**

## First live verification

- Open **Moon Mail** from the Suite.
- Open **Moon Mail** from the Lounge.
- Load `/moon-mail/` directly.
- Confirm `/moon-mail/styles.css` and `/moon-mail/app.js` resolve through the alias.
- Confirm `/moonbox/` still works.
- Confirm a non-Flowtel product session cannot use the alias to bypass the shared product-access guard.
- Confirm a due seven-day return link with `?return=<message-id>` stays on the Moon Mail room and opens the requested return when eligible.

**Source validated** and **live production verified** remain separate states.

## Source validation

Passed:

- `node --check` on every changed JavaScript/MJS file;
- `validate-moon-mail-route-hotfix.mjs`;
- `validate-moon-mail-personal-cosmology.mjs`;
- `validate-personal-cosmology-storage-hotfix.mjs`;
- canonical Flowtel entry;
- private Lounge video;
- event access / beta-exit static validation;
- Acuity Womb Magic;
- Womb Magic recording consent;
- member integrity;
- canonical **Caddie Magic v0.6.0** validator (45 canonical files + route/role/SQL/UI boundaries);
- `git diff --check`.

The older historical `validate-flowtel-010813-caddie-060.mjs` contains a stale hard-coded Acuity bridge version assertion and already fails unchanged on the v0.10.86.1 base snapshot. That pre-existing validator drift is not caused by this route hotfix; the canonical Caddie Magic v0.6.0 validator passes.
