# Flowtel Release 0.6.2c - Bridge membership upgrade

## Replace

- `client/app.js`

## What changed

- `I'm New` no longer dead-ends when the email already exists.
- Existing bridge-created users can enter through a higher membership doorway, such as Flow FM, and the profile can upgrade safely.
- `I've Stayed Before` first tries the temporary bridge password automatically before opening the manual password login.
- Developer/returning login upgrades the profile from the current doorway when appropriate.
- Lower doorway access will not downgrade higher memberships because `ensureProfile()` still uses membership ranking.

## Commit message

`Release 0.6.2c - Bridge membership upgrade`
