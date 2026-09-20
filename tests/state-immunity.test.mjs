import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveStateImmunity} from '../engine/state-immunity.mjs';
test('state immunity decisions and property-read order match 144 original cases',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-immunity.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,144);
  for(const {input:v,expected} of evidence.fixtures){
    const result=resolveStateImmunity({stateId:2669,buffType:v.buffType,properties:v.properties,specificRules:[{property:'immue_state_probe',stateIds:v.ids,value:v.properties.immue_state_probe}]});
    assert.deepEqual(result,expected);
  }
});
test('missing immunity values are not neutral by default',()=>{
  assert.throws(()=>resolveStateImmunity({stateId:1,buffType:'none',properties:{},specificRules:[]}));
});
