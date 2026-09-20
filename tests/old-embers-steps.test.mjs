import assert from 'node:assert/strict';
import {oldEmbersEffectSteps} from '../engine/old-embers-steps.mjs';
import {resolveHpAttributeLoss} from '../engine/hp-attribute-loss.mjs';

// Code-derived command composition. State application is explicit test scaffolding;
// these cases are NOT additional copied-runtime or independent gameplay fixtures.
function run({stacks,argument,hp=100,afterHp=()=>{},afterAdd=()=>{}}){
  const states={80575:stacks,80593:0,80594:0,66314:0,62317:0},trace=[];
  for(const step of oldEmbersEffectSteps({argument,getStateLayer:id=>states[id]})){
    trace.push(step);
    if(step.type==='addState'){states[step.stateId]=1;afterAdd(states);}
    if(step.type==='subtractState')states[step.stateId]=Math.max(0,states[step.stateId]-Math.ceil(Math.abs(step.rawAmount)));
    if(step.type==='removeState')states[step.stateId]=0;
    if(step.type==='changeHp'){hp=resolveHpAttributeLoss({hp,rawValue:step.rawValue,immunity:0,limit:0}).result.hpAfter;afterHp(states);}
  }
  return {hp,states,trace};
}
const ordinary=run({stacks:10,argument:1.5});
assert.equal(ordinary.hp,96);assert.equal(ordinary.states[80575],8);
assert.deepEqual(ordinary.trace.map(s=>s.row),[1,3,4,7,8]);
const exhausted=run({stacks:2,argument:10});
assert.equal(exhausted.hp,94);assert.equal(exhausted.states[80575],0);
assert.deepEqual(exhausted.trace.map(s=>s.row),[2,5,6,7,8]);
// A newly added exclusion after HP loss prevents the subsequent subtraction.
const intervening=run({stacks:10,argument:3,afterHp:states=>{states[66314]=1;}});
assert.equal(intervening.hp,91);assert.equal(intervening.states[80575],10);
assert.deepEqual(intervening.trace.map(s=>s.row),[1,3,7,8]);
// Depletion branch removes the current state, not merely its earlier count.
const replenished=run({stacks:2,argument:10,afterHp:states=>{states[80575]=20;}});
assert.equal(replenished.hp,94);assert.equal(replenished.states[80575],0);
// Separate marker conditions are live; don't rewrite them into one if/else.
const changed=run({stacks:10,argument:3,afterAdd:states=>{states[80575]=2;}});
assert.deepEqual(changed.trace.map(s=>s.row),[1,2,3,4,5,6,7,8]);
assert.equal(changed.states[80593],0);assert.equal(changed.states[80594],0);
assert.throws(()=>[...oldEmbersEffectSteps({argument:3,getStateLayer:()=>undefined})],/Unresolved state/);
