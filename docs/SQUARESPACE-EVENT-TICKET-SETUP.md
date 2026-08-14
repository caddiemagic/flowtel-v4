# Squarespace Event Ticket Verification — Flowtel

## What v0.10.85 uses

Flowtel verifies ticketed events through the Squarespace Contacts + Orders APIs.

The release intentionally does **not** claim a Squarespace webhook. Squarespace's Webhook Subscriptions API requires OAuth; API keys are not supported for creating webhook subscriptions.

With v0.10.85, a signed-in attendee's ticket is checked when she returns/checks/opens a paid event. Flowtel also remembers a pending ticket when an authenticated member leaves through BUY TICKET and automatically attempts verification when she returns to the calendar/Lounge.

## 1. Create a Squarespace API key

Generate a key for the Squarespace site that sells the event tickets/downloads.

Give it at least:

- **Contacts — Read Only**
- **Orders — Read Only**

Do not put the key in Squarespace Code Blocks or browser JavaScript.

## 2. Add the key to Vercel

Add:

`SQUARESPACE_COMMERCE_API_KEY`

with the API key as the value, then redeploy Flowtel.

The server falls back to `SQUARESPACE_API_KEY` for compatibility if the dedicated Commerce key is absent, but the fallback key must also have both permissions.


## 2A. Map the membership products for Beta Exit

The same Contacts + Orders key now protects **first-time member account creation**. Existing verified Flowtel profiles are trusted as historical members; a brand-new email must have a paid Squarespace membership product before Flowtel creates a normal member account.

Add the product IDs in Vercel:

- `SQUARESPACE_QUEENDOM_PRODUCT_IDS`
- `SQUARESPACE_FLOWFM_PRODUCT_IDS`
- `SQUARESPACE_COUNCIL_PRODUCT_IDS` (only if applicable)

Use comma-separated values if a tier has more than one historical/current Squarespace product.

Example:

`SQUARESPACE_QUEENDOM_PRODUCT_IDS=product-old-queendom,product-current-queendom`

This prevents a newsletter subscriber, unrelated store customer, or event-only purchaser from becoming a Queendom member merely because her email exists in Squarespace Contacts.

When first-time membership verification succeeds, the server writes a short-lived (24-hour) admission for that exact email into `flowtel_member_signup_admissions`. The browser cannot create/read that admission. After email confirmation/sign-in, the database consumes the admission before granting Flowtel product access. A person cannot bypass the Squarespace purchase check by calling Supabase signup directly or by adding `membership=flowfm` to a URL.

## 3. Map each ticketed event

In Flowtel Owner → Queendom Events, set:

- the tier(s) that require a ticket;
- the tier price(s);
- currency;
- **Buy Ticket link** → Squarespace product/checkout page;
- **Squarespace product ID** → exact product ID from the ticket/download product.

Flowtel matches the purchased order line item by this exact product ID.

## 4. Movie Night example

- Public → Ticket required → 111 USD
- Queendom → Ticket required → 111 USD
- Flow FM → Included / free
- Buy Ticket link → Movie Night Squarespace product
- Squarespace product ID → Movie Night product ID
- Experience start → 10:00 AM
- Live room → 1:00 PM

The downloadable Squarespace product can continue delivering the PDF through Squarespace. If you also want a download button inside the private Flowtel Event Room, place an attendee-only guide URL in the Flowtel event editor.

## 5. Payment states

Flowtel grants the event entitlement only after the latest matching order is `PAID`.

If the latest matching order is `REFUNDED`, Flowtel revokes the active event entitlement and cancels the saved seat while preserving history.

## Future true push webhook

If you later want Squarespace to push every order create/update into Flowtel immediately even when the buyer never returns to Flowtel, configure a Squarespace OAuth application and Webhook Subscription for order events. That is a separate authorization project and is intentionally deferred rather than faked with an API key.
