// 13 Moons product classifier. Only consume Squarespace orders already fetched
// through the existing trusted Commerce API. This helper never provisions users.
const PAID_STATES=new Set(['PAID']);
function configuredIds(raw){
  return [...new Set(String(raw||'').split(/[\s,]+/).map(s=>s.trim()).filter(Boolean))];
}
function classifyFlowtelPurchase(order,environment={}){
  const paymentState=String(order?.paymentState||'').toUpperCase();
  const paid=PAID_STATES.has(paymentState);
  const products=new Set((Array.isArray(order?.lineItems)?order.lineItems:[])
    .map(line=>String(line?.productId||'').trim()).filter(Boolean));
  const has=(key)=>paid&&configuredIds(environment[key]).some(id=>products.has(id));
  const queendom=has('SQUARESPACE_QUEENDOM_PRODUCT_IDS');
  const moons=has('SQUARESPACE_13_MOONS_PRODUCT_IDS');
  const flowfm=has('SQUARESPACE_FLOWFM_PRODUCT_IDS');
  const council=has('SQUARESPACE_COUNCIL_PRODUCT_IDS');
  return Object.freeze({
    verifiedPaid:paid,
    recognized:queendom||moons||flowfm||council,
    queendomAccess:queendom||moons||flowfm||council,
    wombCurriculumAccess:moons||flowfm||council,
    busyWorkAccess:flowfm||council,
    purchaseTypes:Object.freeze([queendom&&'queendom',moons&&'13moons',flowfm&&'flowfm',council&&'council'].filter(Boolean))
  });
}
module.exports={configuredIds,classifyFlowtelPurchase};
