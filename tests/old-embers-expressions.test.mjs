import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {oldEmbersEffectSteps} from '../engine/old-embers-steps.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-old-embers-expressions.json',import.meta.url)));
test('command iterator agrees with original compiled live conditions and parameters',()=>{
  for(const {input:i,expected} of evidence.fixtures){
    const layers={80575:i.layers,80593:0,80594:0,66314:i.blocker,62317:0},trace=[];
    for(const step of oldEmbersEffectSteps({argument:i.argument,getStateLayer:id=>layers[id]})){
      const type={addState:'BEAddState',removeState:'BERemoveState',subtractState:'BESubStateLayer',changeHp:'BEChangeAttr.hp'}[step.type];
      const params=step.type==='changeHp'?[step.rawValue]:step.type==='subtractState'?[step.stateId,step.rawAmount]:[step.stateId];
      trace.push({row:step.row,type,params});
      if(step.type==='addState')layers[step.stateId]=step.layers;
      if(step.type==='removeState')layers[step.stateId]=0;
      if(step.type==='subtractState')layers[step.stateId]=Math.max(0,layers[step.stateId]-Math.ceil(Math.abs(step.rawAmount)));
    }
    assert.deepEqual(trace,expected.trace);assert.equal(layers[80575],expected.layersAfter);
  }
});
