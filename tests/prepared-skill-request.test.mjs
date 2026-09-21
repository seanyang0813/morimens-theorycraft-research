import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedSkillRequest} from '../engine/prepared-skill-request.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State');
const states=state.data;
const source={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
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

test('version 2 prepared-skill requests require matching client-build catalogs',()=>{
  const value={schemaVersion:2,kind:'morimens-prepared-skill-request',build:'pc-res150-build51',preparation:preparation(),execution:null};
  assert.throws(()=>runPreparedSkillRequest(value,source),/Matching versioned/);
  const result=runPreparedSkillRequest(value,{...source,build:'pc-res150-build51'});
  assert.equal(result.build,'pc-res150-build51');
});

test('real Final Evolution skill derives Arg1 and executes its whole supported setup command',()=>{
  const stateDefinition=id=>{const row=states[String(id)];return {id,maximum:String(row.MaxLayer),properties:Object.entries(row.ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,casterRoleId:50,specialValue:0,banned:false};};
  const prep=JSON.parse(readFileSync(new URL('../research/examples/prepared-role-state-request.json',import.meta.url),'utf8'));
  const execution=JSON.parse(readFileSync(new URL('../research/examples/prepared-role-state-context.json',import.meta.url),'utf8'));
  const result=runPreparedSkillRequest({schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:prep,execution},source);
  assert.equal(result.status,'EXPERIMENTAL');assert.equal(result.prepared.commandId,60401);assert.deepEqual(result.prepared.arguments,[80]);assert.equal(result.commandSupport.structurallyCompatible,true);
  assert.deepEqual(result.execution.catalogStateDefinitions,[stateDefinition(60089),stateDefinition(2900),stateDefinition(60404)]);
  assert.deepEqual(result.execution.calculation.trace.map(row=>row.type),['addState','addState','presentation','addState']);assert.equal(result.execution.calculation.roles[0].properties.damage_plus,80);
});

test('prepared setup skill rejects caller-authored catalog state definitions',()=>{
  const prep=JSON.parse(readFileSync(new URL('../research/examples/prepared-role-state-request.json',import.meta.url),'utf8'));
  const execution=JSON.parse(readFileSync(new URL('../research/examples/prepared-role-state-context.json',import.meta.url),'utf8'));
  execution.experiment.definitions=[];
  assert.throws(()=>runPreparedSkillRequest({schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:prep,execution},source),/without caller definitions/);
});
