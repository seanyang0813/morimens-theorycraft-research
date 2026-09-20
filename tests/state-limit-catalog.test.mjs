import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveStateLimitRules} from '../engine/resolve-state-limit-rules.mjs';
import {limitStateLayers} from '../engine/state-layer-limits.mjs';
test('active source mappings resolve explicit poison/counterattack limits without activating unused API entries',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../research/evidence/state-limit-catalog.json',import.meta.url),'utf8'));
  const properties={be_state_layer_limit_posion:5,be_state_layer_statics_posion:2,be_state_layer_limit_posion_max:10,be_state_layer_limit_retaliate_max:7};
  const rules=resolveStateLimitRules({catalog,properties});
  assert.equal(rules.statistics.length,1);assert.deepEqual(rules.statistics[0],{stateIds:[3068],limit:5,used:2});
  assert.equal(rules.total.length,2);assert.ok(catalog.unusedLimitApiEntries.includes('be_state_layer_limit_retaliate'));
  assert.equal(limitStateLayers({stateId:3068,layer:9,mode:'statistics',rules:rules.statistics,getCurrentLayer:()=>0}).layer,3);
  assert.equal(limitStateLayers({stateId:3905,layer:9,mode:'total',rules:rules.total,getCurrentLayer:()=>4}).layer,3);
  delete properties.be_state_layer_statics_posion;assert.throws(()=>resolveStateLimitRules({catalog,properties}),/usage/);
});
