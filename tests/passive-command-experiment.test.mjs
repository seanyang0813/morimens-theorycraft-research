import test from 'node:test';
import assert from 'node:assert/strict';
import {runPassiveCommandExperiment} from '../engine/passive-command-experiment.mjs';

const input=()=>({schemaVersion:1,kind:'morimens-passive-command-experiment',build:'pc-res144-build51',interveningEffects:'assumed-absent',
  rows:[{id:'passive',Type:'BEPassiveDamage',Target:'UpperTarget',Para:'Arg1,2'}],variables:{Arg1:100},
  passive:{passive1:10,passive2:20,passive3:0,dimensionFixPer:25},targetState:{hp:1000,block:50},repeatModifiers:{plus:0,per:0},immune:false});

test('Passive command repeats the recovered pre-hit and shared HP path in order',()=>{
  const value=input(),before=JSON.stringify(value),result=runPassiveCommandExperiment(value);
  assert.equal(result.completed,true);assert.equal(result.modeledHpLost,280);assert.deepEqual(result.hits.map(hit=>hit.modeledHpLost),[115,165]);
  assert.deepEqual(result.hits.map(hit=>hit.after),[{hp:885,block:0},{hp:720,block:0}]);
  assert.equal(result.hits[0].calculation.experimentalModels.find(model=>Object.hasOwn(model,'preHitDamage')).preHitDamage,165);
  assert.equal(JSON.stringify(value),before);
});

test('later Passive repetitions reread live target HP expressions',()=>{
  const value=input();value.rows[0].Para='UpperTarget.hp*0.1,2';value.variables={};value.passive={passive1:0,passive2:0,passive3:0,dimensionFixPer:0};value.targetState.block=0;
  const result=runPassiveCommandExperiment(value);
  assert.deepEqual(result.hits.map(hit=>hit.modeledHpLost),[100,90]);assert.equal(result.targetAfter.hp,810);
  assert.deepEqual(result.command.trace[0].parameterEvaluations.map(item=>item.values[0]),[100,100,90]);
});

test('Passive command rejects unsupported target, subtype and property gaps',()=>{
  const target=input();target.rows[0].Target='AllEnemy';assert.throws(()=>runPassiveCommandExperiment(target),/UpperTarget/);
  const subtype=input();subtype.rows[0].Para='100,1,1';assert.throws(()=>runPassiveCommandExperiment(subtype),/subtype/);
  const missing=input();delete missing.passive.passive3;assert.throws(()=>runPassiveCommandExperiment(missing),/properties/);
});
