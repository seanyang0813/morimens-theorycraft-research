import test from 'node:test';
import assert from 'node:assert/strict';
import {runActiveCommandExperiment} from '../engine/active-command-experiment.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
function input(){
  const {value,...offense}=neutralShowInputs(0);
  return {schemaVersion:1,kind:'morimens-active-command-experiment',build:'pc-res144-build51',interveningEffects:'assumed-absent',
    rows:[{id:'attack',Type:'BEActiveDamage',Target:'UpperTarget',Para:'UpperTarget.hp*.1,3'}],variables:{},offense,
    targetModifiers:{...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1},targetState:{hp:1000,block:0},repeatModifiers:{plus:0,per:0},immune:false};
}
test('command-driven multi-hit damage reevaluates live HP and retains complete formula traces',()=>{
  const v=input(),copy=JSON.stringify(v),r=runActiveCommandExperiment(v);
  assert.deepEqual(r.hits.map(hit=>hit.modeledHpLost),[100,90,81]);assert.equal(r.targetAfter.hp,729);assert.equal(r.completed,true);
  assert.equal(r.command.trace[0].parameterEvaluations.length,4);assert.ok(r.hits.every(hit=>hit.calculation.trace.length>0));assert.equal(JSON.stringify(v),copy);
});
test('shared shield, row conditions, immunity and lethal stop feed the same battle state',()=>{
  const v=input();v.targetState.block=150;const r=runActiveCommandExperiment(v);
  assert.deepEqual(r.hits.map(hit=>hit.modeledHpLost),[0,50,95]);assert.equal(r.targetAfter.block,0);
  v.immune=true;assert.equal(runActiveCommandExperiment(v).modeledHpLost,0);
  v.immune=false;v.rows[0].Para='2000,3';const lethal=runActiveCommandExperiment(v);assert.equal(lethal.hits.length,1);assert.equal(lethal.completed,false);
  v.rows[0].Cond='UpperTarget.hp<0';const skipped=runActiveCommandExperiment(v);assert.equal(skipped.hits.length,0);assert.equal(skipped.completed,true);
});
test('unknown variables, target selectors, ParaPlus and independent base resets reject',()=>{
  const v=input();v.variables['UpperTarget.hp']=99;assert.throws(()=>runActiveCommandExperiment(v));delete v.variables['UpperTarget.hp'];
  v.rows[0].Para='missing';assert.throws(()=>runActiveCommandExperiment(v));
  v.rows[0].Para='10,1,0,1';assert.throws(()=>runActiveCommandExperiment(v));
  v.rows[0].Para='10';v.offense.value=10;assert.throws(()=>runActiveCommandExperiment(v));
});

test('explicit expression function adapter is required and each hit reevaluates it',()=>{
  const v=input();v.rows[0].Para='State.GetStateLayer(1),2';
  assert.throws(()=>runActiveCommandExperiment(v));
  let reads=0;
  const r=runActiveCommandExperiment(v,{allowedFunctions:['State.GetStateLayer'],callFunction:()=>++reads*10});
  assert.deepEqual(r.hits.map(h=>h.modeledHpLost),[20,30]);assert.equal(reads,3);
  assert.throws(()=>runActiveCommandExperiment(v,{allowedFunctions:['State.GetStateLayer']}));
});
