import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {changeCombatProperty} from '../engine/combat-property-mutation.mjs';
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-combat-property-mutation-runtime.json',import.meta.url),'utf8'));
test('ordinary and tentacle-gated combat properties match 1716 original mutation chains',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-combat-property-mutation.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,1716);
  for(const {input,expected} of evidence.fixtures)assert.deepEqual(changeCombatProperty(input),expected,JSON.stringify(input));
});
test('installed resource 150 reproduces the expanded combat-property fixture domain',()=>{
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(current.fixtures,1716);assert.equal(current.exactMatches,1716);assert.deepEqual(current.mismatches,[]);
});
test('derived/resource properties cannot bypass their extra behavior',()=>{
  for(const property of ['hp','energy','occupation_master','max_hp'])assert.throws(()=>changeCombatProperty({property,before:1,delta:1,critScale:0,critDamageScale:0,castValue:null}));
  assert.throws(()=>changeCombatProperty({property:'tentacle_dmg',before:1,delta:1,critScale:0,critDamageScale:0,castValue:null}),/context/);
});
