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
    preparation:{skillId:3997,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{},conditionResults:{},stateQueries:{}},
    targetBinding:{expression:'FrontEnemy',resolution:'supplied-single-UpperTarget'},lifecycle:'assumed-absent',
    snapshot:{snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',casterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:1000,max_hp:1000,block:0,be_damage_per:0,vulnerable_per:0},cardProperties:{},targetBattleTag:'Monster',targetStateIds:[],critRolls:[null]},
    repeatModifiers:{plus:0,per:0}};
}
function mixedInput(build='pc-res150-build51'){
  const value=input(build);value.schemaVersion=2;value.preparation={skillId:4046,skillLevel:6,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{}};
  value.energy={source:{castRoleUid:7,cmdServerUid:2},target:{uid:7,role:'Awaker',energy:95,maximumProperties:{ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0},calculation:{dimension:0,properties:{card_ulti_per:0,card_ulti_plus:0,o_ulti_energy_per:0,ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_per_strikecard:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0},matchesEnergyCardTypes:true,casterEligible:true}}};
  return value;
}

for(const build of Object.keys(roots))test(`catalog-prepared ordinary Active skill reaches a complete-property sequence on ${build}`,()=>{
  const value=input(build),before=JSON.stringify(value),result=runPreparedSnapshotActiveSkill(value,source(build));
  assert.equal(result.prepared.commandId,2350);
  assert.deepEqual(result.parameterEvaluation.values,[1]);
  assert.deepEqual(result.tags,['Card_Strike']);
  assert.deepEqual(result.cardContext,{present:true,instructionCard:true,stateTriggerAdd:false});
  assert.equal(result.repetition.totalEffectTimes,1);
  assert.equal(result.calculation.modeledHpLost,1);
  assert.equal(result.calculation.targetAfter.hp,999);
  assert.equal(result.finalDamage,null);
  assert.match(result.sourceHashes.Skill,/^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(value),before);
});

test('catalog repeat initialization creates the exact derived hit count',()=>{
  const value=input();value.repeatModifiers.plus=2;value.snapshot.critRolls=[null,null,null];
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.equal(result.repetition.totalEffectTimes,3);
  assert.equal(result.derivedSequenceInput.hits.length,3);
  assert.equal(result.calculation.modeledHpLost,3);
});

test('prepared snapshot bridge fails closed on target drift, critical omissions and caller schema drift',()=>{
  const data=source('pc-res150-build51');
  const wrongTarget=input();wrongTarget.targetBinding.expression='BackEnemy';assert.throws(()=>runPreparedSnapshotActiveSkill(wrongTarget,data),/does not match/);
  const rolls=input();rolls.repeatModifiers.plus=1;assert.throws(()=>runPreparedSnapshotActiveSkill(rolls,data),/every derived hit/);
  const extra=input();extra.baseValue=999999;assert.throws(()=>runPreparedSnapshotActiveSkill(extra,data),/exact prepared snapshot/);
});

test('prepared snapshot bridge derives real catalog ParaPlus before every repeated hit',()=>{
  const value=input();
  value.preparation={skillId:4808,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100,'CmdCaster.death_resist':0,'PlayerRole.block':10},conditionResults:{},stateQueries:{'CmdCaster.GetStateLayer':{'119802':0,'2537':0}}};
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.deepEqual(result.paraPlus.evaluation.values,[20]);
  assert.deepEqual(result.paraPlus.bindings,{ParaPlus1:20});
  assert.deepEqual(result.parameterEvaluation.values,[60,1,0,20]);
  assert.equal(result.derivedSequenceInput.hits[0].skillArgsPlus,20);
  assert.equal(result.calculation.modeledHpLost,80);
});

for(const build of Object.keys(roots))test(`version 2 executes exported damage then ultimate energy on ${build}`,()=>{
  const value=mixedInput(build),before=JSON.stringify(value),result=runPreparedSnapshotActiveSkill(value,source(build));
  assert.equal(result.prepared.commandId,2112);assert.deepEqual(result.prepared.arguments,[20,10]);
  assert.deepEqual(result.command.rows.map(row=>row.Type),['BEActiveDamage','BEGainUltiEnergy']);
  assert.equal(result.calculation.modeledHpLost,20);assert.equal(result.calculation.targetAfter.hp,980);
  assert.deepEqual(result.energyParameterEvaluation.values,[10]);assert.equal(result.energy.targetsAfter[0].energy,100);
  assert.equal(result.completed,true);assert.equal(result.stop,null);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),before);
});

test('lethal prepared damage stops before the later energy row',()=>{
  const value=mixedInput();value.snapshot.initialTargetProperties.hp=10;value.snapshot.initialTargetProperties.max_hp=10;
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.equal(result.calculation.targetAfter.hp,0);assert.equal(result.energy,null);assert.equal(result.completed,false);assert.match(result.stop.reason,/Death handling/);
});

test('version 2 rejects reordered effects and mismatched energy identity',()=>{
  const data=source('pc-res150-build51'),reordered=mixedInput(),command=data.commands['2112'];data.commands['2112']={...command,data_list:{1:command.data_list['2'],2:command.data_list['1']}};
  assert.throws(()=>runPreparedSnapshotActiveSkill(reordered,data),/ActiveDamage row first/);
  const identity=mixedInput();identity.energy.target.uid=8;assert.throws(()=>runPreparedSnapshotActiveSkill(identity,source(identity.build)),/self-target/);
});

test('prepared snapshot bridge rejects mixed commands and monster intents before calculation',()=>{
  const mixedSource=source('pc-res150-build51');mixedSource.commands['2350']={...mixedSource.commands['2350'],data_list:{...mixedSource.commands['2350'].data_list,2:{Type:'BEGainBlock',Target:'CmdCaster',Para:'1'}}};
  assert.throws(()=>runPreparedSnapshotActiveSkill(input(),mixedSource),/exactly one command row/);
  const monsterSource=source('pc-res150-build51'),monster=input();monster.preparation.skillId=67183;monster.preparation.variables={BattleAtkForce:100};
  assert.throws(()=>runPreparedSnapshotActiveSkill(monster,monsterSource),/Awakener damage tags/);
});
