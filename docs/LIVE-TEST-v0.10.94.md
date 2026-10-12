# Live checks — Flowtel v0.10.94

Run after migrations 082 → 083 → 084 and Vercel Ready. Local tests are source validation, not evidence of live provider configuration.

- Existing player signs in to the Locker Room, not the mailbox; existing Flowtel member access and Stay/day rules work unchanged. Recovery links set a new password and return to the correct product.
- Player red Call Your Caddie button opens public recorder; return link goes to Locker Room. Submit and review normal and anonymous messages.
- Lobby asks one club at a time. p, P and putter receive the approved error without advancing; custom club text works; NEWS compass has putter center. Submit for consecration and verify owner notification/review.
- Log complete 9 and 18 hole rounds, total-only rounds, and a partial round. Refresh, resume and finish. Confirm wheel scores/moon filter, private partial data and separate Score Map lengths. Existing unknown-length totals remain legacy.
- Owner previews and sends individual, all-active, completed-28+ and Caddie assignments. Check recipients. Player saves reflection, marks complete; owner sees response and marks reviewed. Another player cannot access that response. A newly changed audience requires a fresh preview.
- Owner uploads audio, creates draft, publishes each Sea of Sirens category and a VIP track. Check ordinary player cannot see draft/VIP, authorized VIP can hear VIP, revoked/nonmember cannot read private audio. Test on phone.
- Configure paid registration in a preview first. Verify exact $69 product purchase, new invitation, existing account reuse, unpurchased email denial, retry without duplicate grant/welcome, and refund removal for newly paid access. Pre-existing complimentary access remains intact. No unintended women's access granted.
- Activate auth hook only after both branded sender tests succeed. Test Kingdom and Flowtel recovery, invite and email-change messages. Signed Squarespace webhook must accept the correct site and reject forged signatures. Confirm paid welcome once and owner retry behavior.

Next migration is 085. No production writes or live emails were performed during packaging.
