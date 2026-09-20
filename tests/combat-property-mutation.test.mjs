import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {changeCombatProperty} from '../engine/combat-property-mutation.mjs';
test('15 combat properties match 1350 original mutation chains',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-combat-property-mutation.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,1350);
  for(const {input,expected} of evidence.fixtures)assert.deepEqual(changeCombatProperty(input),expected,JSON.stringify(input));
});
test('derived/resource properties cannot bypass their extra behavior',()=>{
  for(const property of ['hp','energy','occupation_master','max_hp','tentacle_dmg'])assert.throws(()=>changeCombatProperty({property,before:1,delta:1,critScale:0,critDamageScale:0,castValue:null}));
});
