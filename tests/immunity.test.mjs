import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveImmunity} from '../engine/immunity.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-immunity.json',import.meta.url)));
test('immunity predicate matches original runtime across categories and subtype precedence',()=>{
  for(const row of data.fixtures){
    const result=resolveImmunity({build:data.build,...row.input});
    assert.equal(result.immune,row.expected,JSON.stringify(row.input));
    assert.equal(result.finalDamage,null);
  }
});
test('immunity rejects missing, unknown and nonfinite properties',()=>{
  const input={build:data.build,...data.fixtures[0].input};
  assert.throws(()=>resolveImmunity({...input,category:'Unknown'}));
  assert.throws(()=>resolveImmunity({...input,general:NaN}));
  assert.throws(()=>resolveImmunity({...input,categoryImmunities:{Active:0}}));
  assert.throws(()=>resolveImmunity({...input,build:'android'}));
});
