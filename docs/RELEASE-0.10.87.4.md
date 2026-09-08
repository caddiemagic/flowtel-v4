# Flowtel v0.10.87.4 — Squarespace Pricing Plan Purchase-Shape Diagnostic Hotfix

## Why this hotfix exists

Live v0.10.87.3 testing confirmed that the Squarespace Contacts fallback works and first-time Flowtel signup now reaches the purchase-verification stage. The Flow FM membership being tested is a Squarespace **Pricing Plan**, not a normal Commerce product, while the existing beta-exit verifier expects membership purchases to appear in Commerce Orders as `lineItems[].productId` values configured in Vercel.

Before changing the authorization model, this hotfix safely inspects the shape that Squarespace actually returns for the member's Orders record.

## What changes

When first-time signup reaches Squarespace Orders verification, Flowtel now builds a sanitized server-side purchase-shape diagnostic containing only:

- how many Commerce orders were returned;
- order field names (keys only), payment state, and fulfillment status;
- line-item field names (keys only);
- product/item name when present;
- product ID, variant ID, SKU, pricing-plan-like ID, and item type when present.

The diagnostic intentionally does **not** log or return:

- the member email;
- API keys or authorization headers;
- billing or shipping names/addresses;
- phone numbers;
- payment method/details;
- prices/totals;
- customizations or arbitrary line-item text;
- raw Squarespace order payloads.

## User-visible diagnostic

If no `SQUARESPACE_QUEENDOM_PRODUCT_IDS`, `SQUARESPACE_FLOWFM_PRODUCT_IDS`, or `SQUARESPACE_COUNCIL_PRODUCT_IDS` are configured yet, Flowtel no longer fails before asking Squarespace for the member's Orders data.

It now performs the read-only Orders lookup first and returns one of three deliberately non-authorizing diagnostic outcomes:

1. **0 Commerce orders returned** — useful evidence that the Pricing Plan purchase may not appear in the Commerce Orders API at all.
2. **Commerce orders returned, but no Flow FM / Queendom / Council line item appears** — useful evidence that Pricing Plans are represented elsewhere or under a different structure.
3. **A membership-like line item appears** — Flowtel surfaces only the safe identifier fingerprint (name/productId/variantId/SKU/pricingPlanId/type) so the owner can determine what identifier, if any, should be mapped.

No membership is granted from this diagnostic alone.

## Membership boundary remains unchanged

This hotfix does not accept product names, pricing-plan labels, or diagnostic output as authorization. A brand-new member still cannot receive Flowtel access until we have identified a reliable Squarespace membership entitlement signal and deliberately wire it into the verified signup boundary.

Existing canonical Flowtel members continue to use the existing membership path.

## Migration

**No Supabase migration required.**

Migration 073 remains the latest applied migration. The next migration remains **074**.

## Deployment

Deploy v0.10.87.4 website files over v0.10.87.3. No database change and no new environment variable are required.

After Vercel is Ready, retry **Create My Flowtel Account** using the same Flow FM member email and send the exact new diagnostic message to the Front Desk.

## Validation

Run:

`node --check api/squarespace-bridge.js`

`node scripts/validate-squarespace-purchase-diagnostic.mjs`

`node scripts/validate-event-access-beta-exit.mjs`

`node scripts/validate-member-integrity.mjs`

`node scripts/validate-vercel-function-budget.js`

This is source validation only; live Squarespace Pricing Plan behavior must still be verified in production.
