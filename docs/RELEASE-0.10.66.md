# Flowtel v0.10.66 — Squarespace Replay Notes Session Bridge

Release date: 2026-07-20

## Summary

The Squarespace replay-notes iframe now displays the comment/reflection room immediately instead of replacing it with a large login card. The form remains softly disabled until the member connects her Flowtel session, preserving private notes and product-access boundaries.

Modern browsers may partition storage used by `app.theflowtel.com` when it is embedded inside a Squarespace page. A remembered Flowtel session from a normal Flowtel tab therefore may not be visible inside the iframe even though the member is already signed in.

This release adds a first-party connection window that safely bridges the remembered Flowtel session into the embedded replay-notes room without putting credentials or session tokens in the URL.

## Member experience

Inside Squarespace:

1. The complete replay-note form is visible by default.
2. On the first visit, the fields are softly disabled and a compact **Open My Notes** invitation appears above them.
3. The member chooses **Open My Notes**.
4. A small first-party Flowtel window opens.
5. If she is already signed into Flowtel, the window connects immediately and closes without asking for her password.
6. If she is not signed in, she enters her existing Flowtel email and password once in the first-party window.
7. The embedded form activates, loads her private prior notes, and saves new notes to her Flowtel and cycle history.
8. On later visits from the same Squarespace site and browser, the embedded notes room opens automatically while its remembered embedded session remains available.

The browser may require the member to allow a pop-up for the first connection. Flowtel never places the access token, refresh token, email, or password in the replay-notes URL.

## Security boundaries

The bridge:

- opens only after a member gesture, avoiding blocked automatic pop-ups;
- uses a one-time random connection nonce;
- verifies both the message origin and popup source;
- uses an exact `postMessage` target origin rather than `*`;
- passes the session directly between two `app.theflowtel.com` windows;
- keeps the connection window and replay-notes routes `no-store` and `noindex`;
- re-runs the established Flowtel product-access and Queendom membership checks before showing private notes;
- keeps the form disabled and does not load history until those checks pass.

## Squarespace embed

The v0.10.65 iframe code remains valid:

```html
<div style="width:100%;max-width:1100px;margin:0 auto;">
  <iframe
    src="https://app.theflowtel.com/replay-notes/?workshop=four-seasons-flowtel-workshop&amp;title=Four%20Seasons%20Flowtel%20Workshop&amp;source=squarespace-four-seasons-workshop&amp;embed=1"
    title="Four Seasons Flowtel Workshop replay notes"
    loading="lazy"
    style="display:block;width:100%;min-height:720px;border:0;border-radius:24px;background:transparent;"
    allow="clipboard-write"
  ></iframe>
</div>
```

No replacement code is required after deploying this release.

## Migration instructions

No Supabase migration is required.

Keep migrations 046 through 051 installed. Migration 037 remains retired and must never be rerun.

## Preservation guarantees

This release does not alter passwords, membership ranks, one-stay-per-Flowtel-Day behavior, append-only stays or notes, Flowtel Time, replay-note data, Flow Map consent, Guest House accounts or files, Lounge video Storage, Honors, Priestess Mailbox, Moonbox, Team Maps, mentor consent, Medicine Wheel geometry, or Caddie Magic v0.4.5.

## First test

1. Deploy v0.10.66.
2. Open the Squarespace workshop page in a browser where you are already signed into Flowtel in another tab.
3. Confirm the replay-note form is visible immediately, with its fields softly disabled.
4. Choose **Open My Notes**.
5. Confirm the small Flowtel window connects and closes without requesting a password.
6. Confirm the form activates and prior notes appear.
7. Save a reflection and confirm it returns after refresh.
8. Close the page, reopen it from the same Squarespace site, and confirm the embedded room opens automatically.
9. Test in a signed-out private browser and confirm the connection window asks for an existing Flowtel login.
10. Confirm Queendom-ineligible, Guest House-only, anonymous, and Player-Only accounts cannot load or save replay notes.
