import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedSkillRequest} from '../engine/prepared-skill-request.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd');
const states=JSON.parse(readFileSync(new URL('../research/extracted/config/State.json',import.meta.url),'utf8'));
const source={skills:skill.data,battleApi:battleApi.data,commands:command.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256}};
const preparation=()=>({skillId:4100,skillLevel:1,isAwaker:false,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{}});

test('serializable prepared-skill request selects a real exported command without executing it',()=>{
  const result=runPreparedSkillRequest({schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:preparation(),execution:null},source);
  assert.equal(result.status,'PREPARED');
  assert.equal(result.prepared.commandId,743);
  assert.deepEqual(result.prepared.arguments,[120,1]);
  assert.equal(result.execution,null);
  assert.equal(result.finalDamage,null);
  assert.deepEqual(result.sourceHashes,source.sourceHashes);
});

test('serializable prepared-skill request executes a fully supported command and keeps boundaries visible',()=>{
  const context=JSON.parse(readFileSync(new URL('../research/examples/prepared-active-skill-context.json',import.meta.url),'utf8'));
  const result=runPreparedSkillRequest({schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:preparation(),execution:context},source);
  assert.equal(result.status,'EXPERIMENTAL');
  assert.equal(result.execution.calculation.modeledHpLost,120);
  assert.equal(result.execution.calculation.targetAfter.hp,880);
  assert.equal(result.finalDamage,null);
});

test('serializable prepared-skill request refuses incomplete maps and caller schema drift',()=>{
  const value={schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:preparation(),execution:null};
  value.preparation.conditionResults={probe:1};
  assert.throws(()=>runPreparedSkillRequest(value,source),/booleans/);
  delete value.preparation.stateQueries;
  assert.throws(()=>runPreparedSkillRequest(value,source),/preparation inputs/);
});

test('real Final Evolution skill derives Arg1 and executes its whole supported setup command',()=>{
  const stateDefinition=id=>{const row=states[String(id)];return {id,maximum:String(row.MaxLayer),properties:Object.entries(row.ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,casterRoleId:50,specialValue:0,banned:false};};
  const prep={skillId:60397,skillLevel:1,isAwaker:false,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{'CmdCaster.atk':1000},conditionResults:{},stateQueries:{}};
  const experiment={schemaVersion:1,kind:'morimens-role-state-command',build:'pc-res144-build51',otherEvents:'assumed-absent',variables:{},targetBindings:{CmdCaster:50},roles:[{id:50,roleType:'Monster',properties:{i_crit_per:0,i_crit_damage_per:0,be_damage_per:0,be_fixed_damage_per1:0,be_passive_damage_per:0,damage_plus:0,tentacle_dmg:0},tentacleContext:{pve:true,ownerMonster:true,maxTentacleCount:0}}],definitions:[stateDefinition(60089),stateDefinition(2900),stateDefinition(60404)]};
  const execution={experiment,targetBinding:{expression:'CmdCaster',resolution:'role-registry',roleId:50},lifecycle:'assumed-absent'};
  const result=runPreparedSkillRequest({schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:prep,execution},source);
  assert.equal(result.status,'EXPERIMENTAL');assert.equal(result.prepared.commandId,60401);assert.deepEqual(result.prepared.arguments,[80]);assert.equal(result.commandSupport.structurallyCompatible,true);
  assert.deepEqual(result.execution.calculation.trace.map(row=>row.type),['addState','addState','presentation','addState']);assert.equal(result.execution.calculation.roles[0].properties.damage_plus,80);
});
