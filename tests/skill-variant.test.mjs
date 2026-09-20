import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectProgressionVariant} from '../engine/skill-variant.mjs';
test('scalar progression selection matches all exported numeric command maps and sparse controls',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-skill-variants.json',import.meta.url)));
  assert.equal(evidence.radix,1000);
  for(const {input,expected} of evidence.fixtures){const r=selectProgressionVariant(input);assert.deepEqual({matchKey:r.matchKey,value:r.value},expected);assert.equal(r.found,expected.value!==null);}
});
test('independent threshold maxima preserve missing combined key instead of selecting a nearby variant',()=>{
  const r=selectProgressionVariant({variants:{0:10,1000:20,3:30},breakSkillLevel:1,potencyLevel:3});
  assert.equal(r.matchKey,1003);assert.equal(r.status,'MISSING_VARIANT');assert.equal(r.value,null);
  assert.equal(selectProgressionVariant({variants:{0:0},breakSkillLevel:0,potencyLevel:0}).value,0);
});
test('conditional tables and noncanonical numeric keys cannot be mistaken for progression maps',()=>{
  for(const variants of [{'1':{1:'true',2:10}},{'01':10},{'-1':10},{'0':false}])assert.throws(()=>selectProgressionVariant({variants,breakSkillLevel:0,potencyLevel:0}));
});
