# Call Your Caddie answering-machine frontend patch

Base: f499db8, Flowtel v0.10.93 / Caddie Magic v0.7.1.

Replaces the public How It Works cards with Megan's supplied 33.888-second MP3 and a Call Your Caddie button. User-initiated playback has connecting, playing, paused, completed, and failure states; native audio controls support scrubbing and replay. Completion moves focus to the existing recorder. Skip remains available. Reduced-motion preferences are respected. Greeting code loads independently of authentication and recorder boot.

Starting a recording pauses the greeting and caller preview. Calling while recording is blocked. Existing consent, preview, signed-upload, anonymity, owner Mailbox, Studio Mode, and first-listen semantics are preserved.

No migration, environment variable, serverless function, or backend change. Function budget remains 12/12; migration 082 remains next. This is a frontend patch on the existing release; global product versions are unchanged. Local CSS/JS cache keys are updated. Historical exact-copy validators for v0.10.92.1 are superseded. Current mailbox validators now check the greeting instead of deleted cards.

## Live checklist

- Incognito desktop and iPhone/Safari: press Call Your Caddie and hear the complete greeting; verify pause/resume, scrubbing, replay, skip, and ending at the recorder.
- Verify playback failure leaves the recorder usable.
- Record, preview, re-record, consent, submit; confirm the owner receives NEW / UNHEARD with anonymity preserved.
- Confirm the greeting does not play into the caller's recording.

Source checks and browser simulation do not establish live production verification. Apply patch ZIP over the base repository (including the new MP3 and greeting.js), then deploy through the existing Vercel workflow. No deployment was performed in this conversation.
