import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const file = new URL('../api/squarespace-bridge.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8');

assert(source.includes('Flowtel v0.10.87.4 — Squarespace membership purchase-shape diagnostic hardening.'), 'v0.10.87.4 bridge marker is missing.');
assert(source.includes('Flowtel Squarespace membership purchase-shape diagnostic.'), 'Purchase-shape server diagnostic log is missing.');
assert(source.includes('No Flowtel access was granted'), 'Diagnostic must explicitly remain non-authorizing.');

const ordersLookup = source.indexOf('orders = await customerOrders(contact.id, apiKey);');
const configuredGuard = source.indexOf('if (!configured) {', ordersLookup);
assert(ordersLookup >= 0 && configuredGuard > ordersLookup, 'Missing-product-ID guard must run after the read-only Orders lookup.');

const helperStart = source.indexOf('function compactDiagnosticValue');
const helperEnd = source.indexOf('async function verifySquarespaceMembershipPurchase');
assert(helperStart >= 0 && helperEnd > helperStart, 'Purchase diagnostic helper block could not be located.');
const helperSource = source.slice(helperStart, helperEnd);
const context = {};
vm.createContext(context);
vm.runInContext(`${helperSource}\nthis.purchaseShapeDiagnostic = purchaseShapeDiagnostic; this.purchaseDiagnosticUserMessage = purchaseDiagnosticUserMessage;`, context);

const secretEmail = 'private-member@example.com';
const secretAddress = '123 Private Street';
const secretCard = '4242424242424242';
const diagnostic = context.purchaseShapeDiagnostic([{
  id: 'order-secret-id',
  createdOn: '2026-09-07T12:00:00Z',
  paymentState: 'PAID',
  fulfillmentStatus: 'FULFILLED',
  customerEmail: secretEmail,
  billingAddress: { address1: secretAddress },
  total: { value: '1111.00', currency: 'USD' },
  paymentDetails: { last4: secretCard },
  lineItems: [{
    productName: 'Flow FM',
    productId: 'product-flow-fm-123',
    variantId: 'variant-456',
    sku: 'FLOWFM',
    pricingPlanId: 'plan-789',
    itemType: 'PRICING_PLAN',
    customizations: [{ value: secretAddress }],
    description: secretEmail,
    unitPricePaid: { value: '1111.00', currency: 'USD' },
  }],
}]);

const serialized = JSON.stringify(diagnostic);
assert(serialized.includes('Flow FM'), 'Expected safe membership product name in diagnostic.');
assert(serialized.includes('product-flow-fm-123'), 'Expected safe product ID in diagnostic.');
assert(serialized.includes('plan-789'), 'Expected pricing-plan-like ID in diagnostic.');
assert(!serialized.includes(secretEmail), 'Diagnostic leaked member email.');
assert(!serialized.includes(secretAddress), 'Diagnostic leaked address/customization content.');
assert(!serialized.includes(secretCard), 'Diagnostic leaked payment details.');
assert(!serialized.includes('1111.00'), 'Diagnostic leaked price/total data.');

const message = context.purchaseDiagnosticUserMessage(diagnostic);
assert(message.includes('name=Flow FM'), 'User diagnostic should surface the membership-like name.');
assert(message.includes('productId=product-flow-fm-123'), 'User diagnostic should surface the safe product identifier.');
assert(message.includes('No Flowtel access was granted'), 'User diagnostic must remain explicitly non-authorizing.');

const zeroMessage = context.purchaseDiagnosticUserMessage({ ordersReturned: 0, membershipLike: [] });
assert(zeroMessage.includes('0 Commerce orders'), 'Zero-order diagnostic is missing.');

console.log('Flowtel v0.10.87.4 Squarespace purchase-shape diagnostic validator passed.');
