import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {subtractStateLayer} from '../engine/sub-state-layer.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-sub-state-layer.json',import.meta.url)));
test('stack subtraction matches original effect and state mutation call order',()=>{
  for(const {input,expected} of evidence.fixtures){const r=subtractStateLayer({...input,casterAttribution:'absent'});assert.equal(r.layersAfter,expected.layersAfter);assert.deepEqual(r.trace,expected.trace);}
});
test('missing amount is distinct from zero and unsupported attribution rejects',()=>{
  assert.equal(subtractStateLayer({layers:2,amount:null,exists:true,casterAttribution:'absent'}).layersAfter,1);
  assert.equal(subtractStateLayer({layers:2,amount:0,exists:true,casterAttribution:'absent'}).layersAfter,2);
  assert.throws(()=>subtractStateLayer({layers:2,amount:1,exists:true}));
});
