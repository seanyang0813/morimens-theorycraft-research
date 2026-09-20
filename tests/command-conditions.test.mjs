import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileCommandCondition,compileNumericCommand} from '../engine/command-expressions.mjs';
test('compiled command conditions match original booleans and short-circuit state reads',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-command-conditions.json',import.meta.url)));
  for(const {input,expected} of data.fixtures){
    const evaluate=compileCommandCondition(input.expression,{allowedFunctions:['UpperTarget.GetStateLayer','CmdCaster.GetStateLayer']});
    const result=evaluate(name=>{assert.equal(name,'Arg1');return input.argument;},(name,args)=>input.layers[args[0]]);
    assert.deepEqual({passed:result.passed,calls:result.calls},expected);
  }
});
test('Lua zero truthiness, operand returns, strict true gate and precedence are retained',()=>{
  const result=text=>compileCommandCondition(text)();
  assert.equal(result('0 or missing').values[0],0);assert.equal(result('0 or missing').passed,false);
  assert.equal(result('0 and true').passed,true);assert.equal(result('not 0').passed,false);
  assert.equal(result('false and missing').passed,false);assert.equal(result('true or missing').passed,true);
  assert.equal(result('false or true and 3>2').passed,true);
  assert.equal(result('not (3<2) and 1~=2').passed,true);
  assert.equal(result('0==false').passed,false);assert.equal(result('1').passed,false);
  assert.throws(()=>result('true+1'));assert.throws(()=>result('missing or true'));
  assert.throws(()=>compileNumericCommand('1>0'));assert.throws(()=>compileCommandCondition('true,false'));
});
