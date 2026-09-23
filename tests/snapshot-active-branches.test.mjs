import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSnapshotActiveBranches} from '../engine/snapshot-active-branches.mjs';

const input=()=>({schemaVersion:1,kind:'morimens-battle-property-snapshot-damage',build:'pc-res151-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],casterProperties:{crit:12,crit_damage:50},playerProperties:{dimension_fix_per:0},targetProperties:{hp:500,max_hp:500,block:0},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Monster',targetStateIds:[]}});

test('one-hit branch calculation reports exact critical probability without selecting the actual draw',()=>{
  const value=input(),before=JSON.stringify(value),result=calculateSnapshotActiveBranches(value);
  assert.equal(result.critChanceCeil,12);
  assert.equal(result.critProbability,0.12);
  assert.equal(result.branches.ordinary.preHitDamage,100);
  assert.equal(result.branches.critical.preHitDamage,150);
  assert.equal(result.expectedPreHitDamage,106);
  assert.equal(result.finalDamage,null);
  assert.equal(JSON.stringify(value),before);
  assert.throws(()=>calculateSnapshotActiveBranches({...value,targetContext:{...value.targetContext,critRoll:1}}),/critRoll: null/);
});

test('guaranteed-critical and impossible-critical inputs collapse to one result',()=>{
  const always=input();always.casterProperties.certain_crit=1;
  const a=calculateSnapshotActiveBranches(always);
  assert.equal(a.critProbability,1);
  assert.equal(a.branches.ordinary.preHitDamage,a.branches.critical.preHitDamage);
  const never=input();never.casterProperties.crit=0;
  const n=calculateSnapshotActiveBranches(never);
  assert.equal(n.critProbability,0);
  assert.equal(n.branches.ordinary.preHitDamage,n.branches.critical.preHitDamage);
});
