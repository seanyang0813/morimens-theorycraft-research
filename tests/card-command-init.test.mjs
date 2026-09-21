import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeCardCommands} from '../engine/card-command-init.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-card-command-init.json',import.meta.url),'utf8'));
const observed=name=>fixture.fixtures.find(row=>row.input.name===name).expected;
const input={schemaVersion:1,kind:'morimens-card-command-init',build:'pc-res144-build51',card:{uid:9001,tid:1001,level:7,createCardArgs:[11,22],resolvedOwnerUid:88},preCmdId:null,cmdId:5001};

test('main-only card command request matches original initialization',()=>{
  const before=JSON.stringify(input),result=initializeCardCommands(input);assert.deepEqual(result.requests,observed('main-only').requests);assert.equal(result.preCommand,null);assert.equal(result.getSkillArgsCalledOnMain,true);assert.equal(JSON.stringify(input),before);
});

test('pre-command is constructed first and marked explicitly',()=>{
  const result=initializeCardCommands({...input,preCmdId:4001});assert.deepEqual(result.requests,observed('pre-and-main').requests);assert.equal(result.preCommand.isPreCmd,true);assert.equal(result.mainCommand.isPreCmd,null);
});

test('zero pre-command remains present under Lua truthiness',()=>{
  assert.deepEqual(initializeCardCommands({...input,preCmdId:0}).requests,observed('zero-pre-is-present').requests);
});

test('command initialization fails closed on incomplete card identity',()=>{
  for(const value of [{...input,cmdId:null},{...input,card:{...input.card,resolvedOwnerUid:null}},{...input,extra:true}])assert.throws(()=>initializeCardCommands(value));
});
