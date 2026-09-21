import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareCatalogCardCommandPlan} from '../engine/catalog-card-command-plan.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const skill=read('Skill'),battleApi=read('BattleApi');
const source={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256}};
const input={schemaVersion:1,kind:'morimens-catalog-card-command-plan',build:'pc-res144-build51',card:{uid:9001,tid:126484,level:1,createCardArgs:[0.5],resolvedOwnerUid:88},preCmdId:null,progression:{isAwaker:true,breakSkillLevel:0,potencyLevel:0,variables:{BattleAtkForce:1000},conditionResults:{},stateQueries:{'PlayerRole.GetStateLayer':{'134222':2}}}};

test('real Arachne Strike resolves its command and base arguments before copied overrides',()=>{
  const before=JSON.stringify(input),result=prepareCatalogCardCommandPlan(input,source);
  assert.equal(result.skillId,126484);assert.equal(result.commandId,133374);assert.deepEqual(result.baseArguments,[100,5,2]);
  assert.deepEqual(result.plan.mainArguments,[0.5,5,2]);assert.deepEqual(result.plan.argumentBindings,{Arg1:0.5,Arg2:5,Arg3:2});assert.equal(result.plan.mainCommand.castRoleUid,88);assert.equal(JSON.stringify(input),before);
});

test('catalog plan fails closed on missing live state or unversioned source',()=>{
  assert.throws(()=>prepareCatalogCardCommandPlan({...input,progression:{...input.progression,stateQueries:{}}},source),/Unsupported command function|Unresolved card state query/);
  assert.throws(()=>prepareCatalogCardCommandPlan(input,{...source,sourceHashes:{Skill:'bad',BattleApi:battleApi.sha256}}),/versioned/i);
  assert.throws(()=>prepareCatalogCardCommandPlan(input,{...source,build:'pc-res150-build51'}),/Matching versioned/);
});
