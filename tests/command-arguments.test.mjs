import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCommandArgument} from '../engine/command-arguments.mjs';
test('numeric lookups and fallback calls match original parser execution',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-command-arguments.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){
    let fallbackReads=0;
    const values=input.indices.map(index=>resolveCommandArgument({index,skillArgs:input.skillArgs,readFallback:()=>{fallbackReads++;return input.fallbackValues;}}).value);
    assert.deepEqual({values,fallbackReads},expected);
  }
});
test('fallback is lazy and fresh; fractional values are not normalized again',()=>{
  let current=.25,calls=0;
  const readFallback=()=>{calls++;return [current];};
  assert.deepEqual(resolveCommandArgument({index:1,skillArgs:[0],readFallback}),{index:1,value:0,source:'skillArgs'});
  assert.equal(calls,0);
  assert.equal(resolveCommandArgument({index:1,skillArgs:[],readFallback}).value,.25);
  current=.75;
  assert.equal(resolveCommandArgument({index:1,skillArgs:[],readFallback}).value,.75);
  assert.equal(calls,2);
  assert.equal(resolveCommandArgument({index:3,skillArgs:[],readFallback}).source,'missing-default');
});
test('invalid numeric scope fails instead of turning unknown values into zero',()=>{
  assert.throws(()=>resolveCommandArgument({index:0,skillArgs:[]}));
  assert.throws(()=>resolveCommandArgument({index:1,skillArgs:[false]}));
  assert.throws(()=>resolveCommandArgument({index:1,skillArgs:[]}));
  assert.throws(()=>resolveCommandArgument({index:1,skillArgs:[],readFallback:()=>[NaN]}));
});
