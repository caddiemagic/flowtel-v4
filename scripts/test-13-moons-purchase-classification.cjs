const assert=require('node:assert/strict');
const {classifyFlowtelPurchase}=require('../server/13-moons-purchase-classification.js');
const env={
 SQUARESPACE_QUEENDOM_PRODUCT_IDS:'queen-a',
 SQUARESPACE_13_MOONS_PRODUCT_IDS:'moon-a, moon-b',
 SQUARESPACE_FLOWFM_PRODUCT_IDS:'flow-a',
 SQUARESPACE_COUNCIL_PRODUCT_IDS:'council-a'
};
const check=id=>classifyFlowtelPurchase({lineItems:[{productId:id}]},env);
assert.deepEqual([check('queen-a').queendomAccess,check('queen-a').wombCurriculumAccess,check('queen-a').busyWorkAccess],[true,false,false]);
assert.deepEqual([check('moon-b').queendomAccess,check('moon-b').wombCurriculumAccess,check('moon-b').busyWorkAccess],[true,true,false]);
assert.deepEqual([check('flow-a').queendomAccess,check('flow-a').wombCurriculumAccess,check('flow-a').busyWorkAccess],[true,true,true]);
assert.deepEqual([check('council-a').queendomAccess,check('council-a').wombCurriculumAccess,check('council-a').busyWorkAccess],[true,true,true]);
assert.equal(check('unknown').recognized,false);
assert.equal(classifyFlowtelPurchase({lineItems:[{productId:'moon-a'}]},{}).recognized,false);
assert.equal(classifyFlowtelPurchase({lineItems:[{productId:'moon-a'},{productId:'queen-a'}]},env).purchaseTypes.includes('13moons'),true);
console.log('13 Moons purchase classifier tests passed');
