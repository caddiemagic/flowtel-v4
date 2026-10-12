# Kingdom launch setup — v0.10.94

## Install the source first

1. Run database/migration-082-cardinal-compass-consecration.sql, then migration-083-kingdom-experience.sql, then migration-084-kingdom-membership-email.sql in Supabase. Do not skip 082: its table was absent during the read-only production check.
2. Unzip the patch at the repository root, preserving folders; commit and push with GitHub Desktop. Alternatively use the full-source ZIP. They contain the same finished source; do not overlay both.
3. Wait for Vercel Ready and hard refresh. Complete the live checklist before enabling paid signup or replacing auth email delivery.

## $69 membership

Create a separate Kingdom $69 one-time purchase on Squarespace. The integration needs an order line with its exact product ID, an exact customer contact and PAID payment state. Do not map the women's membership product IDs to Kingdom. A membership type that does not produce these Commerce records requires a different verified bridge before launch.

Keep shared Squarespace Customer Notifications neutral: the new branded welcomes supplement those notifications rather than changing their templates. Configure the checkout link to the Kingdom offer. The public activation page is https://app.theflowtel.com/caddie-magic/join/; buyers enter their checkout email. Existing accounts retain their password; new buyers receive an invitation. The player entrance is https://app.theflowtel.com/caddie-magic/ and the public voice recorder is https://app.theflowtel.com/caddie-magic/call-your-caddie/.

In Vercel, reuse SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the existing Squarespace Commerce API key (SQUARESPACE_COMMERCE_API_KEY or SQUARESPACE_API_KEY). Add:

| Variable | Value |
| --- | --- |
| SQUARESPACE_KINGDOM_PRODUCT_IDS | Exact Kingdom product ID(s), comma separated |
| KINGDOM_CHECKOUT_URL | HTTPS checkout/product URL |
| KINGDOM_PAID_SIGNUP_ENABLED | Keep false until purchase tests pass; true activates registration |
| FLOWTEL_PUBLIC_ORIGIN | https://app.theflowtel.com |

Existing player access is preserved. VIP is granted manually in the owner studio; paid VIP checkout and multiple VIP tiers are future work.

## Branded emails

Use Resend with a verified sending domain. Set RESEND_API_KEY, KINGDOM_FROM_EMAIL and FLOWTEL_FROM_EMAIL (bare verified addresses or complete sender strings). Bare addresses display Caddie Magic Kingdom and The Flowtel respectively. Optional FLOWTEL_EMAIL_REPLY_TO sets replies. FLOWTEL_BRANDED_EMAIL_ENABLED=true enables purchase welcomes for both brands; leave it off until both sender identities are tested. Existing FLOWTEL_GUEST_HOUSE_FROM_EMAIL remains a fallback for the Flowtel sender.

For customized password reset/invite emails, configure Supabase Authentication's Send Email Hook to:

https://app.theflowtel.com/api/guest-house-notify?action=auth-email

Copy its signing secret to Vercel SEND_EMAIL_HOOK_SECRET, retaining the v1,whsec_ format. Add the Kingdom reset-password redirect and existing Flowtel redirect URLs to Supabase's allow list. Optional FLOWTEL_EMAIL_ALLOWED_ORIGINS is a comma-separated list of explicitly approved preview origins. Activate this hook LAST: it replaces auth email sending across the shared Supabase project. Test both brands, invites, recovery and email changes. Kingdom branding is selected by the Kingdom return path; Flowtel uses its own path.

## Automatic purchase notification

Register a Squarespace WebhookSubscription for order.create and order.update with destination:

https://app.theflowtel.com/api/squarespace-bridge?action=membership-webhook

Set SQUARESPACE_MEMBERSHIP_WEBHOOK_SECRET to the subscription's hex signing secret; set SQUARESPACE_WEBSITE_ID to the correct website ID. Creating that subscription may require Squarespace OAuth Orders scopes; the existing Commerce API key alone is not proof that subscription registration is available. This release does not register it automatically. Without the subscription, buyer activation still verifies paid purchases explicitly, and paid members are reconciled when entering the Kingdom.

Owner studio includes a retry control for pending welcome emails. Provider idempotency and a private purchase outbox prevent ordinary duplicate sends. Store secrets only in Vercel/Supabase settings, never in browser code or chat.
