# Flowtel Release 0.5.1 — Beta Tools + Concierge Permissions

## Changed files

Replace:

- `flowtel-v4/client/index.html`
- `flowtel-v4/client/app.js`
- `flowtel-v4/client/styles.css`
- `flowtel-v4/manager/index.html`
- `flowtel-v4/manager/app.js`
- `flowtel-v4/manager/styles.css`
- `flowtel-v4/shared/profiles.js`

## What changed

- Adds beta quick-login panels for 4 guest accounts and 4 practitioner accounts.
- Beta accounts use the shared password: `FlowtelBeta!2026`.
- Beta accounts can be created through Supabase Auth on first use if email confirmation is disabled.
- Test-local beta users can have their intended role restored through `ensureProfile`.
- Concierge Desk now shows the practitioner's clocked-in wing and the opposite wing they are tending.
- Turndown queue filters to the practitioner's assigned wing when a wing assignment is present.
- "View Guest" only appears for hard-coded beta client relationships.
- Guests outside the practitioner's assignment show a non-action status instead of a fake button.

## Beta accounts

Practitioners:

- `flowtel.practitioner1@test.local` — Inner Winter / West Wing → tends East Wing
- `flowtel.practitioner2@test.local` — Inner Spring / South Wing → tends North Wing
- `flowtel.practitioner3@test.local` — Inner Summer / East Wing → tends West Wing
- `flowtel.practitioner4@test.local` — Inner Autumn / North Wing → tends South Wing

Guests:

- `flowtel.guest1@test.local` — Winter / West Wing
- `flowtel.guest2@test.local` — Spring / South Wing
- `flowtel.guest3@test.local` — Summer / East Wing
- `flowtel.guest4@test.local` — Autumn / North Wing

Password for all:

`FlowtelBeta!2026`

## Notes

If Supabase email confirmation is enabled, the quick-login signup may fail. In that case, create the 8 users manually in Supabase Authentication with the password above, then use the beta buttons.

## Commit message

`Release 0.5.1 - Beta tools and concierge permissions`
