import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCardOrders} from '../engine/card-order-search.mjs';
import {syntheticCardActionExample} from '../engine/card-action-example.mjs';

const request=timeline=>({schemaVersion:1,kind:'morimens-card-order-search',objective:'MAX_MODELED_HP_LOST',timeline,maxEvaluations:100,returnTop:5});

test('exact order search finds the only complete fixed-cost then X-cost sequence',()=>{
  const result=searchCardOrders(request(syntheticCardActionExample()));
  assert.equal(result.status,'EXPERIMENTAL');
  assert.equal(result.evaluatedPermutations,2);
  assert.equal(result.completePermutations,1);
  assert.equal(result.lethalPermutations,0);
  assert.deepEqual(result.best.order,['synthetic-fixed-cost','synthetic-X-cost']);
  assert.equal(result.best.modeledHpLost,500);
  assert.equal(result.best.result.completed,true);
  assert.equal(result.optimalWithinEnumeratedSet,true);
  assert.equal(result.finalDamage,null);
});

test('target-defeating terminal orders remain eligible even when later actions cannot execute',()=>{
  const timeline=syntheticCardActionExample();timeline.target={hp:300,block:0};
  const result=searchCardOrders(request(timeline));
  assert.equal(result.eligiblePermutations,2);
  assert.equal(result.lethalPermutations,2);
  assert.equal(result.best.modeledHpLost,300);
  assert.equal(result.best.terminalStatus,'TARGET_DEFEATED');
});

test('order search refuses partial enumeration, duplicate IDs and unsupported objectives',()=>{
  const timeline=syntheticCardActionExample();timeline.steps.push({...timeline.steps[0],id:'third',cardInstanceId:'third'});
  assert.throws(()=>searchCardOrders({...request(timeline),maxEvaluations:5}),/needs 6 evaluations/);
  timeline.steps[2].id=timeline.steps[0].id;assert.throws(()=>searchCardOrders(request(timeline)),/unique/);
  assert.throws(()=>searchCardOrders({...request(syntheticCardActionExample()),objective:'CLAIM_GLOBAL_OPTIMUM'}),/Unsupported/);
});
