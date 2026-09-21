import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runAttachedCardPipeline} from '../engine/attached-card-pipeline.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd');
const states=read('State');
const source={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256}};
const attach={schemaVersion:1,kind:'morimens-attach-post-action',build:'pc-res144-build51',parameters:[123159,1,0,1],casterUid:77,targetUid:99,casterSealAttachPost:0,targetPresent:true,targetIsMonster:false};
const progression={isAwaker:true,breakSkillLevel:0,potencyLevel:0,variables:{BattleAtkForce:1000},conditionResults:{},stateQueries:{'CmdCaster.GetStateLayer':{'122512':2,'124039':1}}};

test('attached-card pipeline reaches Mouchette command rows with explicit live inputs',()=>{
  const input={schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach,cardContext:{cardUid:900,camp:3,targetType:456,hasPre:false,preCmdId:null,progression},damagePrefix:null,stateSuffix:null};
  const before=JSON.stringify(input),result=runAttachedCardPipeline(input,source);
  assert.equal(result.attachment.cardRequests[0].skillId,123159);
  assert.deepEqual(result.temporaryCard.events.map(row=>row.stage),['CreateCardByInfo','OnAddNewCard','SetCurUseCard','CreateEffect','CreateEffect','CreateEffect','CreateEffect']);
  assert.equal(result.commandResolution.commandId,123163);assert.deepEqual(result.commandResolution.baseArguments,[300,6]);
  assert.deepEqual(result.commandResolution.command.effectTypes,['BEActiveDamage','BEAddState','BERemoveState']);
  assert.equal(JSON.stringify(input),before);
});

test('attached-card pipeline binds prepared arguments into the leading damage prefix',()=>{
  const {value,...offense}=neutralShowInputs(0);
  const damagePrefix={targetBinding:{expression:'RandomEnemy',resolution:'supplied-single-target'},variables:{},offense,targetModifiers:{...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1},targetState:{hp:100000,block:0},repeatModifiers:{plus:0,per:0},immune:false,presentationPolicy:'record-only'};
  const result=runAttachedCardPipeline({schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach,cardContext:{cardUid:900,camp:3,targetType:456,hasPre:false,preCmdId:null,progression},damagePrefix,stateSuffix:null},source);
  assert.equal(result.planningCompleted,true);assert.equal(result.completed,false);assert.deepEqual(result.commandResolution.plan.argumentBindings,{Arg1:300,Arg2:6});assert.equal(result.damagePrefix.execution.hits.length,6);assert.equal(result.damagePrefix.modeledHpLost,1800);assert.equal(result.damagePrefix.stop.beforeRowId,'2');
});

test('attached-card pipeline handles all Mouchette rows in the supported ordinary branch',()=>{
  const {value,...offense}=neutralShowInputs(0),ids=[123168,124036,123165,123307,123523,123167];
  const damagePrefix={targetBinding:{expression:'RandomEnemy',resolution:'supplied-single-target'},variables:{},offense,targetModifiers:{...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1},targetState:{hp:100000,block:0},repeatModifiers:{plus:0,per:0},immune:false,presentationPolicy:'record-only'};
  const definition=id=>({id,maximum:String(states.data[String(id)].MaxLayer),properties:Object.entries(states.data[String(id)].ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,casterRoleId:50,specialValue:0,banned:false});
  const stateSuffix={variables:{},stateQueries:{'CmdCaster.GetStateLayer':{'122512':1},'PlayerRole.GetStateLayer':{'123723':0,'123167':0}},stateQueryTargets:{'CmdCaster.GetStateLayer':'CmdCaster','PlayerRole.GetStateLayer':'PlayerRole'},targetBindings:{CmdCaster:50,PlayerRole:1},roles:[{id:50,roleType:'Awakener',properties:{i_crit_per:0,i_crit_damage_per:0,i_damage_per_strikecard:0},tentacleContext:null},{id:1,roleType:'Player',properties:{i_crit_per:0,i_crit_damage_per:0},tentacleContext:null}],definitions:ids.map(definition)};
  const result=runAttachedCardPipeline({schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach,cardContext:{cardUid:900,camp:3,targetType:456,hasPre:false,preCmdId:null,progression},damagePrefix,stateSuffix},source);
  assert.equal(result.commandRowsCompleted,true);assert.equal(result.completed,true);assert.equal(result.damagePrefix.modeledHpLost,1800);assert.equal(result.stateSuffix.sourceCommandStartRow,'2');assert.deepEqual(result.stateSuffix.selectedRowIds,['1','6']);assert.equal(result.stateSuffix.roles.find(row=>row.id===50).properties.i_damage_per_strikecard,25);
});

test('attached-card pipeline stops at a sealed request and rejects ignored card context',()=>{
  const gated={...attach,casterSealAttachPost:1};
  const result=runAttachedCardPipeline({schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach:gated,cardContext:null,damagePrefix:null,stateSuffix:null},null);
  assert.equal(result.temporaryCard,null);assert.equal(result.commandResolution,null);
  assert.throws(()=>runAttachedCardPipeline({schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach:gated,cardContext:{cardUid:900,camp:3,targetType:456,hasPre:false,preCmdId:null,progression},damagePrefix:null,stateSuffix:null},source),/null card and execution contexts/);
});
