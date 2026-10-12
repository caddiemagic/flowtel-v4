# Flowtel v0.10.93.2 — Instinctive Cardinal Clubs + Compass Consecration

Base: GitHub main 238ac1096f660d082c6126a11be358f1b0457252. Keeps previous Lobby, password recovery, player entry repair and public answering machine.

## Player experience

The public Kingdom Lobby asks for one typed club at a time. Enter or Next Club accepts the current club and automatically focuses the next prompt; the final entry reveals the NEWS compass with Putter in the center. Only the current club is visible, not the four direction fields. Custom names are supported, limited to 60 characters; duplicates ignoring case/spacing/hyphens and putter names are rejected. No par/course capture is added.

After revelation, a name/email/consent form invites the visitor to Submit My Caddie Compass to the Golf Priestess for Consecration. Submission confirmation says Awaiting Consecration. Name, email, NEWS clubs, consent timestamp/version, and status are stored privately. Submit does not create an account, grant Kingdom access, overwrite a private player compass, or automatically perform consecration.

Styled Lobby doorways: Already a member of the Kingdom? Enter the Clubhouse. Not a member yet? Join Here. Leave Your Caddie a Message. Join points to the existing invitation-based account creation surface; an open paid membership checkout has not yet been configured. Choices are not transferred automatically into a private profile in this release.

## Concierge notification

Pending compasses contribute to the existing Caddie Master notification count at the Flowtel Concierge Desk. Opening that queue shows submitter name/email and all four clubs. Mark Consecrated requires confirmation and records Concierge identity/time. A refresh button reloads requests; no realtime subscription or email alert is added. Consecrated submissions remain in the database but leave the pending queue. Existing Concierge authorization is reused.

## Security and infrastructure

Migration 082 creates a private RLS-protected submission table. Public callers can submit only through a narrow action in existing /api/caddie-acuity; the RPC is service-role-only. Signed origin checks, honeypot, required consent, validation, HMAC connection hashing and 8 submissions/hour limit are reused/adapted. No raw IP stored. Authenticated select is Concierge-only and omits the IP hash. Consecration RPC independently checks auth and Concierge role. No new Vercel function (12/12), environment variable, Twilio, or payment enforcement.

## Deployment / live verification

Apply migration-082-cardinal-compass-consecration.sql before frontend/API deployment. Migrations through 082 are then present in source, 083 is next. Verify prior production migrations before applying this file. Overlay patch at repository root, push, wait for Ready, hard refresh.

Test incognito desktop/mobile typed first-through-fourth prompts; custom wedge names; duplicate/putter rejection; Enter-key progression; Start Again. Submit one test compass. Confirm a success receipt and one pending Concierge alert; confirm its NAME/EMAIL/NEWS values; personally review then mark consecrated. Confirm the pending count decreases and database retains the record. Confirm anon/non-Concierge cannot read submissions or consecrate them. Recheck player login, password recovery and public mailbox original routes.

Source checks: NEWS and validation tests; mocked API tests (origin, consent, honeypot, email, duplicate, putter); JS syntax; function budget; diff whitespace; ZIP integrity; binary patch reproduction against exact 238ac10 base. SQL safeguards were reviewed but not executed against a database. Browser rendering, migrations and production end-to-end flow are not verified. No production write/deployment performed.
