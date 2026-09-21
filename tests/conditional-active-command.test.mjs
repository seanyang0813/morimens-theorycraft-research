import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileCommandCondition} from '../engine/command-expressions.mjs';

const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-conditional-active-command.json',import.meta.url)));

test('conditional Active row expressions reproduce original closures and call order',()=>{
  assert.equal(evidence.fixtures.length,48);
  for(const fixture of evidence.fixtures){
    const {expression,potencyLevel,stateLayer,lastConditionRet}=fixture.input,calls=[];
    const result=compileCommandCondition(expression,{allowedFunctions:['CmdCaster.GetPotencyLevel','CmdCaster.GetStateLayer']})(
      name=>{assert.equal(name,'LastConditionRet');return lastConditionRet?1:0;},
      (name,args)=>{const value=name==='CmdCaster.GetPotencyLevel'?potencyLevel:stateLayer;calls.push({name,args,value});return value;},
    );
    assert.equal(result.passed,fixture.expected.passed,JSON.stringify(fixture.input));
    assert.deepEqual(calls,fixture.expected.calls,JSON.stringify(fixture.input));
  }
});
