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
  value.energy={source:{castRoleUid:7,cmdServerUid:2},target:{uid:7,role:'Awaker',energy:95,maximumProperties:{ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0},calculation:{dimension:0,properties:{card_ulti_per:0,card_ulti_plus:0,o_ulti_energy_per:0,ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_per_strikecard:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0}}}};
  return value;
}
function conditionalMixedInput(skillId=4165,build='pc-res150-build51'){
  const value=mixedInput(build);value.schemaVersion=3;
  value.preparation={skillId,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{'CmdCaster.GetStateLayer':{'55487':1}}};
  value.targetBinding={expression:'FrontEnemy',resolution:'front-enemy-context',targetUid:8,context:{casterCamp:1,lockedUid:null,tauntUid:null,roles:[{uid:8,camp:2,hasHpBar:true,dead:false,position:1,sneak:0},{uid:9,camp:2,hasHpBar:true,dead:false,position:2,sneak:0}]}};
  Object.assign(value.snapshot.casterProperties,{ulti_energy:95,ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0,o_ulti_energy_per:0,ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0,ulti_per_strikecard:0});
  value.energy={source:value.energy.source};delete value.repeatModifiers;value.snapshot.critRolls=[null,null];return value;
}
function mortalBlastPrefixInput(){
  const value=input('pc-res150-build51');value.schemaVersion=4;
  value.preparation={skillId:122483,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:15,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{'CmdCaster.GetStateLayer':{'124039':0}}};
  value.targetBinding={expression:'AllEnemy',resolution:'supplied-single-target-selector',eligibleTargetCount:1};
  value.snapshot.critRolls=[null,null];return value;
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
  assert.deepEqual(result.energyCardTypeMatch,{cardTypes:['Card_Strike'],requestedTypes:['Card_Skill','Card_Defend','Card_Extend','Card_Strike'],matched:true});
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
  const role=mixedInput();role.energy.target.role='Monster';assert.throws(()=>runPreparedSnapshotActiveSkill(role,source(role.build)),/self-target Awakener/);
});

for(const build of Object.keys(roots))test(`schema 3 executes conditional multi-row damage then energy on ${build}`,()=>{
  const value=conditionalMixedInput(4165,build),result=runPreparedSnapshotActiveSkill(value,source(build));
  assert.equal(result.prepared.commandId,393);assert.deepEqual(result.prepared.arguments,[10,5]);
  assert.deepEqual(result.targetResolution,{targets:[8],reason:'position'});
  assert.deepEqual(result.rowExecutions.map(row=>[row.rowId,row.executed,row.condition?.passed??null]),[['1',true,null],['2',true,true]]);
  assert.deepEqual(result.rowExecutions.map(row=>row.parameterEvaluation?.values),[[10,1],[10,1]]);
  assert.deepEqual(result.repeatModifierDerivation,{source:'casterProperties.GetProperty zero-default',plus:{property:'damagetimes_plus',present:false,value:0},per:{property:'damagetimes_per',present:false,value:0}});
  assert.equal(result.energyPropertyDerivation.source,'complete property snapshots with GetProperty zero-default');
  assert.deepEqual(result.energyPropertyDerivation.target,{uid:7,role:'Awaker',energy:95,maximumProperties:{ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0},calculation:{dimension:0,properties:{card_ulti_per:0,card_ulti_plus:0,o_ulti_energy_per:0,ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0,ulti_per_strikecard:0}}});
  assert.deepEqual(result.derivedSequenceInput.hits.map(hit=>hit.hitContext.damageSubtype),['Ordinary','Ordinary']);
  assert.equal(result.calculation.modeledHpLost,20);assert.equal(result.energy.targetsAfter[0].energy,100);assert.equal(result.completed,true);
});

test('schema 3 derives repetition modifiers from the complete caster property snapshot',()=>{
  const value=conditionalMixedInput();value.snapshot.casterProperties.damagetimes_plus=1;value.snapshot.casterProperties.damagetimes_per=0;value.snapshot.critRolls=[null,null,null,null];
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.deepEqual(result.rowExecutions.map(row=>row.repetition.totalEffectTimes),[2,2]);assert.equal(result.calculation.modeledHpLost,40);
  assert.equal(result.repeatModifierDerivation.plus.present,true);assert.equal(result.repeatModifierDerivation.plus.value,1);
  const drift=conditionalMixedInput();drift.repeatModifiers={plus:0,per:0};assert.throws(()=>runPreparedSnapshotActiveSkill(drift,source(drift.build)),/exact prepared snapshot/);
});

test('schema 3 derives ultimate-energy calculation and cap inputs from complete snapshots',()=>{
  const value=conditionalMixedInput();value.snapshot.cardProperties.card_ulti_plus=3;value.snapshot.casterProperties.gain_ulti_energy_per=5000;value.snapshot.casterProperties.ulti_energy=20;value.snapshot.casterProperties.ulti_energy_max=40;
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.equal(result.energy.targetsAfter[0].energy,40);
  assert.equal(result.energyPropertyDerivation.reads.find(row=>row.owner==='card'&&row.property==='card_ulti_plus').value,3);
  assert.equal(result.energyPropertyDerivation.reads.find(row=>row.owner==='caster'&&row.property==='gain_ulti_energy_per').value,5000);
  const drift=conditionalMixedInput();drift.energy.target={};assert.throws(()=>runPreparedSnapshotActiveSkill(drift,source(drift.build)),/self-target Awakener energy context/);
});

test('schema 3 skips a false conditional row and requires only executed-hit rolls',()=>{
  const value=conditionalMixedInput();value.preparation.stateQueries['CmdCaster.GetStateLayer']['55487']=0;value.snapshot.critRolls=[null];
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.deepEqual(result.rowExecutions.map(row=>row.executed),[true,false]);assert.equal(result.calculation.modeledHpLost,10);
  const extra=conditionalMixedInput();extra.preparation.stateQueries['CmdCaster.GetStateLayer']['55487']=0;
  assert.throws(()=>runPreparedSnapshotActiveSkill(extra,source(extra.build)),/every derived hit/);
});

test('schema 3 preserves LastConditionRet fallback and Puncture subtype from skill 4203',()=>{
  const value=conditionalMixedInput(4203);value.preparation.potencyLevel=15;value.preparation.stateQueries={'CmdCaster.GetStateLayer':{'2799':1},'PlayerRole.GetStateLayer':{'19677':7}};value.snapshot.critRolls=[null,null,null,null];
  const result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.equal(result.prepared.commandId,1363);assert.deepEqual(result.prepared.arguments,[10,5,1]);assert.deepEqual(result.paraPlus.bindings,{ParaPlus1:7});
  assert.deepEqual(result.rowExecutions.map(row=>[row.executed,row.condition.passed]),[[true,true],[false,false]]);
  assert.equal(result.rowExecutions[1].condition.reads.find(row=>row.name==='LastConditionRet').value,1);
  assert.deepEqual(result.derivedSequenceInput.hits.map(hit=>hit.hitContext.damageSubtype),['Puncture','Puncture','Puncture','Puncture']);
  assert.equal(result.calculation.modeledHpLost,68);

  const fallback=conditionalMixedInput(4203);fallback.preparation.stateQueries={'CmdCaster.GetStateLayer':{'2799':0},'PlayerRole.GetStateLayer':{'19677':7}};fallback.snapshot.critRolls=[null];
  const fallbackResult=runPreparedSnapshotActiveSkill(fallback,source(fallback.build));
  assert.deepEqual(fallbackResult.rowExecutions.map(row=>[row.executed,row.condition.passed]),[[false,false],[true,true]]);
  assert.equal(fallbackResult.rowExecutions[1].condition.reads.find(row=>row.name==='LastConditionRet').value,0);
  assert.deepEqual(fallbackResult.derivedSequenceInput.hits.map(hit=>hit.hitContext.damageSubtype),['Ordinary']);assert.equal(fallbackResult.calculation.modeledHpLost,17);
});

test('schema 3 fails closed on target mismatch and unsupported later rows',()=>{
  const mismatch=conditionalMixedInput();mismatch.targetBinding.targetUid=9;assert.throws(()=>runPreparedSnapshotActiveSkill(mismatch,source(mismatch.build)),/does not match/);
  const data=source('pc-res150-build51'),value=conditionalMixedInput();data.commands['393'].data_list['2']={...data.commands['393'].data_list['2'],Type:'BEAddState'};
  assert.throws(()=>runPreparedSnapshotActiveSkill(value,data),/only selected-target Active rows/);
});

test('prepared snapshot bridge rejects mixed commands and monster intents before calculation',()=>{
  const mixedSource=source('pc-res150-build51');mixedSource.commands['2350']={...mixedSource.commands['2350'],data_list:{...mixedSource.commands['2350'].data_list,2:{Type:'BEGainBlock',Target:'CmdCaster',Para:'1'}}};
  assert.throws(()=>runPreparedSnapshotActiveSkill(input(),mixedSource),/exactly one command row/);
  const monsterSource=source('pc-res150-build51'),monster=input();monster.preparation.skillId=67183;monster.preparation.variables={BattleAtkForce:100};
  assert.throws(()=>runPreparedSnapshotActiveSkill(monster,monsterSource),/Awakener damage tags/);
});

test('schema 4 executes the real current Mortal Blast damage prefix and exposes its card/state suffix',()=>{
  const value=mortalBlastPrefixInput(),before=JSON.stringify(value),result=runPreparedSnapshotActiveSkill(value,source(value.build));
  assert.equal(result.prepared.commandId,122499);assert.deepEqual(result.prepared.arguments,[15,2]);
  assert.deepEqual(result.catalogTypes,['Card_Skill','Card_Strike']);
  assert.deepEqual(result.rowExecutions.map(row=>[row.rowId,row.parameterEvaluation.values,row.repetition.totalEffectTimes]),[['1',[15,2],2]]);
  assert.equal(result.calculation.modeledHpLost,30);assert.equal(result.calculation.targetAfter.hp,970);
  assert.deepEqual(result.stop,{beforeRowId:'2',type:'BECreateCard',reason:'Unsupported effect handler'});
  assert.equal(result.completed,false);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),before);
  assert.match(result.unresolvedDependencies.join('\n'),/leading Active-damage prefix/);
});

test('schema 4 refuses to collapse an AllEnemy command when more than one target is eligible',()=>{
  const value=mortalBlastPrefixInput();value.targetBinding.eligibleTargetCount=2;
  assert.throws(()=>runPreparedSnapshotActiveSkill(value,source(value.build)),/exactly one eligible target/);
});
