import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedStateActiveSequence} from '../engine/prepared-state-active-sequence.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const loaded=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,read(name)]));
const source={build:'pc-res144-build51',skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};

function input(){
  const stateExample=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-state-card.json',import.meta.url),'utf8')).input;
  return {schemaVersion:1,kind:'morimens-prepared-state-active-sequence',build:'pc-res144-build51',
    stateCard:{preparation:stateExample.preparation,execution:stateExample.execution},roleBinding:{stateRecipientRoleId:8,activeCasterRoleId:8},
    activeSkill:{schemaVersion:1,kind:'morimens-prepared-snapshot-active-skill',build:'pc-res144-build51',
      preparation:{skillId:3997,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{},conditionResults:{},stateQueries:{}},
      targetBinding:{expression:'FrontEnemy',resolution:'supplied-single-UpperTarget'},lifecycle:'assumed-absent',
      snapshot:{snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',casterProperties:{crit:100,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,i_crit_per:0,i_crit_damage_per:50},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:1000,max_hp:1000,block:0,be_damage_per:0,vulnerable_per:0},cardProperties:{},targetBattleTag:'Monster',targetStateIds:[],critRolls:[100]},
      repeatModifiers:{plus:0,per:0}}};
}

test('catalog state card carries its live property mutation into a later prepared Active card',()=>{
  const value=input(),before=JSON.stringify(value),result=runPreparedStateActiveSequence(value,source);
  assert.deepEqual(result.carry.propertyChanges,[{property:'crit_damage',before:0,after:105}]);
  assert.equal(result.carry.activeCasterProperties.crit_damage,105);
  assert.equal(result.activeSkill.calculation.trace[0].result.critResolution.isCrit,true);
  assert.equal(result.modeledHpLost,3);assert.equal(result.targetAfter.hp,997);assert.equal(result.finalDamage,null);
  assert.equal(JSON.stringify(value),before);
});

test('state-to-Active handoff rejects identity and pre-state snapshot drift',()=>{
  const identity=input();identity.roleBinding.activeCasterRoleId=7;
  assert.throws(()=>runPreparedStateActiveSequence(identity,source),/identical state-recipient/);
  const drift=input();drift.activeSkill.snapshot.casterProperties.crit_damage=1;
  assert.throws(()=>runPreparedStateActiveSequence(drift,source),/property drift/);
});

test('declared caster state queries receive the carried catalog state layer',()=>{
  const value=input();value.activeSkill.preparation.stateQueries={'CmdCaster.GetStateLayer':{'3835':0}};
  const result=runPreparedStateActiveSequence(value,source);
  assert.deepEqual(result.carry.stateLayerChanges,[{stateId:3835,before:0,after:70}]);
  assert.equal(result.activeSkill.prepared.selection.command.value,2350);
});

test('state-to-Active handoff uses matching installed resource-150 catalogs',()=>{
  const readCurrent=name=>{const bytes=readFileSync(new URL(`../research/observations/current-res150-build51/modules/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const current=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,readCurrent(name)]));
  const currentSource={build:'pc-res150-build51',skills:current.Skill.data,battleApi:current.BattleApi.data,commands:current.Cmd.data,states:current.State.data,sourceHashes:Object.fromEntries(Object.entries(current).map(([name,row])=>[name,row.sha256]))};
  const value=input();value.build='pc-res150-build51';value.stateCard.execution.experiment.build='pc-res150-build51';value.activeSkill.build='pc-res150-build51';
  const result=runPreparedStateActiveSequence(value,currentSource);
  assert.equal(result.build,'pc-res150-build51');assert.equal(result.carry.activeCasterProperties.crit_damage,105);assert.equal(result.modeledHpLost,3);
});

test('state-to-Active handoff uses the bounded installed resource-151 state profile',()=>{
  const readCurrent=name=>{const bytes=readFileSync(new URL(`../research/observations/current-res151-build51/modules/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const current=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,readCurrent(name)]));
  const currentSource={build:'pc-res151-build51',skills:current.Skill.data,battleApi:current.BattleApi.data,commands:current.Cmd.data,states:current.State.data,sourceHashes:Object.fromEntries(Object.entries(current).map(([name,row])=>[name,row.sha256]))};
  const value=input();value.build='pc-res151-build51';value.stateCard.execution.experiment.build='pc-res151-build51';value.activeSkill.build='pc-res151-build51';
  const result=runPreparedStateActiveSequence(value,currentSource);
  assert.equal(result.build,'pc-res151-build51');assert.equal(result.carry.activeCasterProperties.crit_damage,105);assert.equal(result.modeledHpLost,3);assert.equal(result.finalDamage,null);
});
