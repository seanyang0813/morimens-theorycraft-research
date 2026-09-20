import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeTargetDamage} from '../engine/active-target.mjs';
const suite=JSON.parse(readFileSync(new URL('./synthetic/original-target-runtime.json',import.meta.url)));

test('target/crit formula matches original bytecode in the declared adapter scope',()=>{
  assert.equal(suite.kind,'SYNTHETIC_ORIGINAL_RUNTIME');
  assert.equal(suite.fixtures.length,2097);
  for(const fixture of suite.fixtures){
    for(const key of suite.excludedInputs)assert.equal(fixture.input[key],0,`${fixture.id}: excluded ${key}`);
    assert.equal(activeTargetDamage(fixture.showDamage,fixture.input).preHitDamage,fixture.expected,fixture.id);
  }
});
