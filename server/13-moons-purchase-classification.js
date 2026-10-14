// Squarespace membership product classification for the 13 Moons rollout.
// This module does not provision accounts; callers must verify the order server-side.
function configuredIds(raw) {
  return [...new Set(String(raw || '').split(/[\s,]+/).map(s=>s.trim()).filter(Boolean))];
}
function purchasedProductIds(order) {
  return new Set((Array.isArray(order?.lineItems) ? order.lineItems : [])
    .map(line=>String(line?.productId||'').trim()).filter(Boolean));
}
function classifyFlowtelPurchase(order, environment) {
  const found=purchasedProductIds(order);
  const has=(key)=>configuredIds(environment?.[key]).some(id=>found.has(id));
  const flowfm=has('SQUARESPACE_FLOWFM_PRODUCT_IDS');
  const council=has('SQUARESPACE_COUNCIL_PRODUCT_IDS');
  const thirteenMoons=has('SQUARESPACE_13_MOONS_PRODUCT_IDS');
  const queendom=has('SQUARESPACE_QUEENDOM_PRODUCT_IDS');
  return Object.freeze({
    recognized:flowfm||council||thirteenMoons||queendom,
    queendomAccess:flowfm||council||thirteenMoons||queendom,
    wombCurriculumAccess:flowfm||council||thirteenMoons,
    busyWorkAccess:flowfm||council,
    purchaseTypes:Object.freeze([queendom&&'queendom',thirteenMoons&&'13moons',flowfm&&'flowfm',council&&'council'].filter(Boolean))
  });
}
module.exports={configuredIds,classifyFlowtelPurchase};
