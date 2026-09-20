import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyDimensionFinalValue} from '../engine/dimension-final-value.mjs';
test('dimension value and role/player lookup branches match 144 original method chains',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-dimension-final-value.json',import.meta.url),'utf8'));
  assert.equal(data.fixtures.length,144);
  for(const {input:v,expected} of data.fixtures){
    const {value,...context}=v;
    if(expected.error)assert.throws(()=>applyDimensionFinalValue({value,context}),/player is missing/);
    else assert.deepEqual(applyDimensionFinalValue({value,context}),expected,JSON.stringify(v));
  }
});
