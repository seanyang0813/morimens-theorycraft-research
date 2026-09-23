import test from 'node:test';
import assert from 'node:assert/strict';
import {runSnapshotActiveSequence} from '../engine/snapshot-active-sequence.mjs';

const hit=(id,baseValue=100)=>({id,baseValue,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
const input=()=>({schemaVersion:1,kind:'morimens-snapshot-active-sequence',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',interveningEffects:'assumed-absent',casterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,damage_per2monster_boss:0,damage_per2block_enemy:100},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:1000,max_hp:1000,block:150,be_damage_per:0,vulnerable_per:0},hits:[hit('one'),hit('two'),hit('three')]});

test('snapshot sequence threads shield and HP while recomputing block-sensitive damage',()=>{
  const value=input(),copy=JSON.stringify(value),result=runSnapshotActiveSequence(value);
  assert.equal(result.completed,true);assert.equal(result.executedHits,3);assert.equal(result.finalDamage,null);
  assert.deepEqual(result.trace.map(row=>[row.result.preHitDamage,row.result.modeledHpLost,row.after.block,row.after.hp]),[[200,50,0,950],[100,100,0,850],[100,100,0,750]]);
  assert.equal(result.modeledHpLost,250);assert.deepEqual(result.targetAfter,{hp:750,block:0});assert.equal(JSON.stringify(value),copy);
});

test('installed-client snapshot sequence preserves the supported live-property result',()=>{
  const value=input();value.build='pc-res151-build51';
  const result=runSnapshotActiveSequence(value);
  assert.equal(result.build,'pc-res151-build51');
  assert.deepEqual(result.trace.map(row=>[row.result.preHitDamage,row.result.modeledHpLost,row.after.block,row.after.hp]),[[200,50,0,950],[100,100,0,850],[100,100,0,750]]);
  assert.equal(result.finalDamage,null);
});

test('snapshot sequence stops before hits after lethal HP mutation',()=>{
  const value=input();value.initialTargetProperties={...value.initialTargetProperties,hp:120,block:0};
  const result=runSnapshotActiveSequence(value);
  assert.equal(result.completed,false);assert.equal(result.executedHits,2);assert.equal(result.unexecutedHits,1);assert.equal(result.targetAfter.hp,0);assert.equal(result.stop.beforeHitId,'three');
});

test('snapshot sequence validates all hits and rejects ambiguous changing target state',()=>{
  const invalid=input();invalid.hits[2].baseValue='bad';assert.throws(()=>runSnapshotActiveSequence(invalid),/finite base/);
  const duplicate=input();duplicate.hits[2].id='one';assert.throws(()=>runSnapshotActiveSequence(duplicate),/unique/);
  const changing=input();changing.hits[1].targetContext.targetStateIds=[3902];assert.throws(()=>runSnapshotActiveSequence(changing),/stable target/);
  const extra=input();extra.hits[0].extra=true;assert.throws(()=>runSnapshotActiveSequence(extra),/exact fields/);
});
