import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeStateLayers} from '../engine/add-state-layer.mjs';
const initial=layer=>({layer,changedLayer:0,caster:7,hasCreateArgs:true,casterLayers:{7:2},sources:[{sourceType:1,layer:2},{sourceType:2,layer:3}]});
test('existing-state merges match 144 original layer, attribution and callback cases',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-add-state-layer.json',import.meta.url),'utf8'));
  assert.equal(data.fixtures.length,144);
  for(const {input:v,expected} of data.fixtures){
    const result=mergeStateLayers({state:initial(v.before),add:v.add,caster:v.caster,maximum:v.maximum,sourceType:v.sourceType,resolvedCommandCaster:99,cachedTriggers:[1,3]});
    const {sources,...rest}=result;
    const actual={...rest,casterLayers:{7:rest.casterLayers[7]??null,9:rest.casterLayers[9]??null},sourceLayers:sources.map(s=>s.layer)};
    assert.deepEqual(actual,expected,JSON.stringify(v));
  }
});
test('capped merge changes attribution but leaves stacks, changedLayer and sources intact',()=>{
  const state={...initial(8),changedLayer:3};
  const result=mergeStateLayers({state,add:2,caster:9,maximum:4,sourceType:1,resolvedCommandCaster:9,cachedTriggers:[3,1]});
  assert.equal(result.caster,9);assert.equal(result.layer,8);assert.equal(result.changedLayer,3);
  assert.deepEqual(result.sources,state.sources);
  assert.equal(result.trace.some(t=>t.event==='propertyDelta'),false);
  assert.equal(state.caster,7);
});
test('unknown maximum and invalid trigger slots cannot silently pass',()=>{
  const input={state:initial(1),add:2,caster:9,maximum:4,sourceType:1,resolvedCommandCaster:9,cachedTriggers:[1]};
  assert.throws(()=>mergeStateLayers({...input,maximum:undefined}));
  assert.throws(()=>mergeStateLayers({...input,cachedTriggers:[7]}));
});
