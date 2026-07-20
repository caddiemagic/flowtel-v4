# Flowtel v0.10.65 — Private Lounge Video Uploader + Squarespace Replay Notes Embed

Release date: 2026-07-20

## Summary

This release removes the large Flow FM workshop video from the GitHub deployment path. The owner now uploads the current Lounge transmission through Concierge to a private Supabase Storage bucket, using the same resilient large-file pattern established for Guest House replays.

The Flow FM Lounge requests a short-lived signed media URL only after the signed-in member passes the existing Flowtel product boundary and effective Flow FM/Council membership check.

## Owner Lounge uploader

Open Concierge → **Lounge Video** to:

- choose an MP4, MOV, M4V, or WEBM file;
- upload videos up to 2 GB using resumable 6 MB chunks for files larger than 6 MB;
- keep the selected file visible while the file picker and background Desk refreshes occur;
- see upload progress and the final registration stage;
- finish a preserved upload without re-uploading the video when Storage succeeds but registration temporarily fails;
- download the private owner copy;
- remove the active transmission from the Lounge without deleting its preserved record;
- retain earlier transmissions as an owner-only archive.

Uploading a new video automatically archives the prior active transmission.

## Member playback

The Flow FM Lounge no longer references `/assets/Four-Seasons-Flowtel-Workshop.mp4`.

Instead, it:

1. reads the active private video record;
2. verifies the signed-in account is eligible for Flow FM Lounge content;
3. creates a private signed media URL;
4. updates the video title and invitation copy from the owner-entered metadata;
5. connects the embedded replay-notes room to the active video ID.

The Storage bucket remains private. Queendom-only, Guest House-only, anonymous, and Caddie Magic Player-Only accounts do not receive Lounge playback access.

## Squarespace replay-notes embed

Use a Squarespace Code Block with:

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

The member must already have a remembered Flowtel session in the same browser. The iframe preserves the established product and replay-note privacy boundaries.

## Migration instructions

Confirm migrations 046 through 050 are installed, then run once:

`database/migration-051-flow-fm-lounge-video-uploader.sql`

Migration 051 creates:

- private bucket `flowtel-lounge-videos` with a 2 GB bucket limit;
- private Lounge video metadata and active/archive history;
- owner-only upload, update, delete, registration, list, and archive permissions;
- Flow FM/Council-only read and signed-playback permission;
- owner and member RPCs.

The Supabase project-wide Storage Global file size limit must also be larger than the video file.

**Do not rerun migration 037.**

## Preservation guarantees

This release does not change passwords, remembered sessions, membership ranks, one-stay-per-Flowtel-Day behavior, append-only stay/note history, Flowtel Time, display-name privacy, owner Concierge access, Turndown routing, Team Map boundaries, mentor consent, Powder Room anonymity, Flow Map history, Medicine Wheel geometry, Moonbox beta hold, Guest House accounts/replay expiration, Hourly Flow Rate, Flowtel Honors, Priestess Mailbox, or Caddie Magic v0.4.5 product-access boundaries.

## First test

1. Run migration 051 once after migration 050.
2. Confirm the Supabase project-wide Storage limit exceeds the workshop video size.
3. Deploy v0.10.65 without committing the MP4 to GitHub.
4. Open Concierge → Lounge Video.
5. Select the workshop video and wait at least one minute before uploading; confirm the selected file remains visible.
6. Upload and confirm progress reaches the finalizing stage.
7. Sign in as a Flow FM member, enter the Lounge, and confirm private playback.
8. Confirm title, invitation copy, and replay notes match the active transmission.
9. Confirm a Queendom-only, Guest House-only, and Player-Only account cannot retrieve the video.
10. Paste the provided iframe into a Squarespace Code Block and confirm the notes room opens for an already signed-in eligible member.
