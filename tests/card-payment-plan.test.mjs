import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planCardPayment} from '../engine/card-payment-plan.mjs';
test('payment plan matches original branch requests and cost-ignore/reset effects',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-card-payment-branches.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){
    const r=planCardPayment(input);assert.deepEqual(r.consumeRequest===null?[]:[r.consumeRequest],expected.consumeRequests);
    assert.equal(r.ignoreCost,expected.ignoreCost);assert.equal(r.forceModeCleared,expected.forceModeCleared);assert.equal(r.energyAfter,null);
  }
  const forcedX=planCardPayment({cfgCost:'X',cost:-1,energy:5,forceMode:1,attached:false,allowIgnoreCost:false,energyEnough:true});assert.equal(forcedX.consumeRequest,5);assert.equal(forcedX.branch,'force_x_variable_cost');
});
