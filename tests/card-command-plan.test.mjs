import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCardCommandPlan} from '../engine/card-command-plan.mjs';

const input={schemaVersion:1,kind:'morimens-card-command-plan',build:'pc-res150-build51',card:{uid:9001,tid:1001,level:7,createCardArgs:[11,22],resolvedOwnerUid:88},preCmdId:4001,cmdId:5001,rawSkillArguments:[1.2,2.1,3.01]};

test('generated-card overrides replace ceiled base arguments in order',()=>{
  const before=JSON.stringify(input),result=prepareCardCommandPlan(input);assert.deepEqual(result.mainArguments,[11,22,4]);assert.deepEqual(result.argumentBindings,{Arg1:11,Arg2:22,Arg3:4});assert.equal(result.mainCommand.castRoleUid,88);assert.equal(result.mainCommand.cmdId,5001);assert.equal(result.preCommand.cmdId,4001);assert.equal(JSON.stringify(input),before);
});

test('empty copied arguments preserve the ceiled base list',()=>{
  const result=prepareCardCommandPlan({...input,card:{...input.card,createCardArgs:[]}});assert.deepEqual(result.mainArguments,[2,3,4]);
});

test('command plan rejects sparse or nonnumeric base arguments',()=>{
  const sparse={...input,rawSkillArguments:[1,,3]};assert.throws(()=>prepareCardCommandPlan(sparse));assert.throws(()=>prepareCardCommandPlan({...input,rawSkillArguments:[Infinity]}));
});
