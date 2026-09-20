import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateAttributeModifier} from '../engine/attribute-modifiers.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-attribute-modifiers.json',import.meta.url)));
test('display percentage and physique helpers match original runtime, preserving nil versus zero',()=>{
  for(const {expected,...input} of evidence.fixtures)assert.equal(calculateAttributeModifier({build:evidence.build,...input}).value,expected);
});
test('absent increase bypasses break multiplier while explicit zero applies it',()=>{
  const input={build:evidence.build,method:'GetAwakerPhysique',base:1.25,breakRate:2};
  assert.equal(calculateAttributeModifier({...input,increase:null}).value,1.25);
  assert.equal(calculateAttributeModifier({...input,increase:0}).value,3);
  assert.throws(()=>calculateAttributeModifier(input));
});
