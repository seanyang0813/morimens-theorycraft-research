import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedSnapshotActiveSkill} from '../engine/prepared-snapshot-active-skill.mjs';

const roots={
  'pc-res144-build51':'../research/extracted/config',
  'pc-res150-build51':'../research/observations/current-res150-build51/modules',
};
function source(build){
  const loaded={};
  for(const name of ['Skill','BattleApi','Cmd','State']){
    const bytes=readFileSync(new URL(`${roots[build]}/${name}.json`,import.meta.url));
    loaded[name]={data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  return {build,skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};
}
function input(build='pc-res150-build51'){
  return {schemaVersion:1,kind:'morimens-prepared-snapshot-active-skill',build,
    preparation:{skillId:67183,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{}},
    targetBinding:{expression:'FrontEnemy',resolution:'supplied-single-UpperTarget'},lifecycle:'assumed-absent',
    snapshot:{snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',casterProperties:{crit:0,crit_damage:0,crit_damage_per:0},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:1000,max_hp:1000,block:0,be_damage_per:0,vulnerable_per:0},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},tags:[],targetBattleTag:'Monster',targetStateIds:[],critRolls:[null]},
    repeatModifiers:{plus:0,per:0}};
}

for(const build of Object.keys(roots))test(`catalog-prepared ordinary Active skill reaches a complete-property sequence on ${build}`,()=>{
  const value=input(build),before=JSON.stringify(value),result=runPreparedSnapshotActiveSkill(value,source(build));
  assert.equal(result.prepared.commandId,67209);
  assert.deepEqual(result.parameterEvaluation.values,[50,1]);
  assert.equal(result.repetition.totalEffectTimes,1);
  assert.equal(result.calculation.modeledHpLost,50);
  assert.equal(result.calculation.targetAfter.hp,950);
  assert.equal(result.finalDamage,null);
  assert.match(result.sourceHashes.Skill,/^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(value),before);
});

test('catalog repeat initialization creates the exact derived hit count',()=>{
  const value=input();value.repeatModifiers.plus=2;value.snapshot.critRolls=[null,null,null];
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.equal(result.repetition.totalEffectTimes,3);
  assert.equal(result.derivedSequenceInput.hits.length,3);
  assert.equal(result.calculation.modeledHpLost,150);
});

test('prepared snapshot bridge fails closed on target drift, critical omissions and caller schema drift',()=>{
  const data=source('pc-res150-build51');
  const wrongTarget=input();wrongTarget.targetBinding.expression='BackEnemy';assert.throws(()=>runPreparedSnapshotActiveSkill(wrongTarget,data),/does not match/);
  const rolls=input();rolls.repeatModifiers.plus=1;assert.throws(()=>runPreparedSnapshotActiveSkill(rolls,data),/every derived hit/);
  const extra=input();extra.baseValue=999999;assert.throws(()=>runPreparedSnapshotActiveSkill(extra,data),/exact prepared snapshot/);
});

test('prepared snapshot bridge rejects mixed commands and catalog ParaPlus before calculation',()=>{
  const mixedSource=source('pc-res150-build51');mixedSource.commands['67209']={...mixedSource.commands['67209'],data_list:{...mixedSource.commands['67209'].data_list,2:{Type:'BEGainBlock',Target:'CmdCaster',Para:'1'}}};
  assert.throws(()=>runPreparedSnapshotActiveSkill(input(),mixedSource),/exactly one command row/);
  const plusSource=source('pc-res150-build51');plusSource.skills['67183']={...plusSource.skills['67183'],ParaPlus:'1'};
  assert.throws(()=>runPreparedSnapshotActiveSkill(input(),plusSource),/ParaPlus/);
});
