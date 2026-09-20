import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateStateLayers,stateLayerFamilies} from '../engine/state-layer-pipeline.mjs';
import {planAddStateRequest} from '../engine/add-state-request.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-layer-pipeline.json',import.meta.url),'utf8'));

function input(v){
  const modifiers=Object.fromEntries(stateLayerFamilies.map(family=>[family,[{property:family,stateIds:[v.matching?2669:7],percent:evidence.percentages[family],commandPowerOnly:false,
    linked:family==='StateLayerPerByCard'?{property:'card_n2',percent:15}:family==='CardFixedStateLayerPer'?{property:'fixed_n2',percent:35}:null}]]));
  modifiers.StateLayerPer.push({property:'o_state_layer_per_power_bycmd',stateIds:[v.matching?2669:7],percent:25,commandPowerOnly:true});
  return {layer:v.layer,stateId:2669,context:{trigger:v.trigger,skipCaster:v.skipCaster,noDirect:v.noDirect,ulti:v.ulti,awaker:v.awaker,casterPresent:v.caster,
    currentCardPresent:v.card,currentCardInstruction:v.instruction,currentCardSkill:v.instruction,modifierCardPresent:v.card,modifierCardInstruction:v.instruction},modifiers,
    dimensionStateIds:v.dimension?[2669]:[],applyDimension:n=>n*1.3};
}

test('connected layer pipeline matches original values and property reads in 392 cases',()=>{
  assert.equal(evidence.fixtures.length,392);
  for(const {input:v,expected} of evidence.fixtures){
    const actual=calculateStateLayers(input(v));
    assert.equal(actual.layer,expected.layer,JSON.stringify(v));
    assert.deepEqual(actual.reads,expected.reads,JSON.stringify(v));
  }
});

test('request composition rounds before modifiers and skips calculation for immunity',()=>{
  const v=evidence.fixtures.find(f=>f.input.layer>0).input,parameters=input(v);
  let calculation;
  const result=planAddStateRequest({layer:v.layer,immune:false,calculateLayer:n=>{calculation=calculateStateLayers({...parameters,layer:n});return calculation.layer;}});
  assert.deepEqual(result.createdLayers,[calculateStateLayers(parameters).layer]);
  assert.equal(calculation.trace[0].before,3);
  const immune=planAddStateRequest({layer:v.layer,immune:true,calculateLayer:()=>{throw new Error('Unexpected calculation');}});
  assert.deepEqual(immune.createdLayers,[]);
});

test('missing family or context is rejected instead of assumed absent',()=>{
  const p=input(evidence.fixtures[0].input);delete p.modifiers.BeStateLayerPer;
  assert.throws(()=>calculateStateLayers(p));
  const q=input(evidence.fixtures[0].input);delete q.context.noDirect;
  assert.throws(()=>calculateStateLayers(q));
});
