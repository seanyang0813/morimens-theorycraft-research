import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeNumericProperties} from '../engine/property-initialization.mjs';
test('initialization matches original numeric constructor without inventing derived mastery',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-property-initialization.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){
    const result=initializeNumericProperties(input);
    // JSON comparison treats the constructor's negative zero as numerical zero.
    assert.deepEqual(JSON.parse(JSON.stringify(result.properties)),expected);
    assert.equal(Object.hasOwn(result.properties,'occupation_master_final'),Object.hasOwn(input,'occupation_master_final'));
  }
  assert.equal(initializeNumericProperties({occupation_master:100,occupation_master_final_per:100,occupation_master_final:7.25}).properties.occupation_master_final,8);
});
