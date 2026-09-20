import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {showDamage,neutralShowInputs} from '../engine/show-damage.mjs';
const suite=JSON.parse(readFileSync(new URL('./synthetic/original-runtime.json',import.meta.url)));
test('ShowDamageFormula agrees exactly with copied original Lua runtime',()=>{
  for(const f of suite.fixtures){
    const result=showDamage(f.input);
    assert.deepEqual([result.showDamage,result.diagnosticBaseDamage],f.expected,f.id);
  }
});
test('missing and unknown resolved modifiers cannot silently disappear',()=>{
  assert.throws(()=>showDamage({value:100}),/Missing/);
  assert.throws(()=>showDamage({...neutralShowInputs(100),unknownBonus:20}),/unrecognized/);
});
