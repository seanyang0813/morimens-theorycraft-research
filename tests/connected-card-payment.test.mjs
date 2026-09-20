import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planCardPayment} from '../engine/card-payment-plan.mjs';
import {consumeEnergy} from '../engine/energy-payment.mjs';
test('composed payment matches connected original branch, player and property calls',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-connected-card-payment.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){
    const plan=planCardPayment(input),payment=plan.consumeRequest===null?null:consumeEnergy({energy:input.energy,request:plan.consumeRequest});
    const result={ignoreCost:plan.ignoreCost,forceModeCleared:plan.forceModeCleared,castValue:payment?.reportedCost??0,reportedCost:payment?.reportedCost??0,energyAfter:payment?.energyAfter??input.energy,energyLost:payment?.energyLost??0,events:payment?.events??[]};
    assert.deepEqual(result,expected,JSON.stringify(input));
  }
});
