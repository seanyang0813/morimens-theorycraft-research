import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planAddStateRequest} from '../engine/add-state-request.mjs';

test('state-add request boundary matches 150 original-runtime cases',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-add-state-requests.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,150);
  for(const {input,expected} of evidence.fixtures){
    const observed=planAddStateRequest({layer:input.layer,immune:input.immune,
      calculateLayer:()=>input.calculated,
      limitLayer:input.perLimit===null?null:()=>input.perLimit,
      limitTotalLayer:input.totalLimit===null?null:()=>input.totalLimit});
    assert.deepEqual(observed,expected,JSON.stringify(input));
  }
});

test('later limit uses original calculated layer and can overwrite earlier limit',()=>{
  const result=planAddStateRequest({layer:2.2,immune:false,
    calculateLayer:n=>{assert.equal(n,3);return 5;},
    limitLayer:n=>{assert.equal(n,5);return 2;},
    limitTotalLayer:n=>{assert.equal(n,5);return 4;}});
  assert.deepEqual(result.createdLayers,[4]);
});

test('zero requests and immunity do not evaluate layer modifiers',()=>{
  const fail=()=>{throw new Error('must not evaluate');};
  assert.deepEqual(planAddStateRequest({layer:0,immune:false,calculateLayer:fail}).events,[]);
  assert.deepEqual(planAddStateRequest({immune:true,calculateLayer:fail}).events,[{stage:'immunity'}]);
});

test('unknown and nonfinite results fail explicitly',()=>{
  assert.throws(()=>planAddStateRequest({immune:null,calculateLayer:()=>1}));
  assert.throws(()=>planAddStateRequest({immune:false,calculateLayer:()=>NaN}));
  assert.throws(()=>planAddStateRequest({immune:false,calculateLayer:()=>1,limitLayer:()=>Infinity}));
});
