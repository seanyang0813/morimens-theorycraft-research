import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWheelRefinementExpression,resolveWheelRefinementParameters} from '../engine/wheel-refinement-parameters.mjs';

test('Wheel refinement grammar preserves constants, implicit slopes and decimals',()=>{
  assert.equal(evaluateWheelRefinementExpression('3',3).value,3);
  assert.equal(evaluateWheelRefinementExpression('2+GetRefiningLevel()',3).value,5);
  assert.equal(evaluateWheelRefinementExpression('1.5+GetRefiningLevel()*0.5',3).value,3);
  assert.equal(evaluateWheelRefinementExpression('4+GetRefiningLevel()* 2',3).value,10);
});

test('Eternal Weave max refinement resolves its three source-bound StateArgs',()=>{
  const result=resolveWheelRefinementParameters({schemaVersion:1,kind:'morimens-wheel-refinement-parameters',build:'pc-res144-build51',wheelId:'wheel-0128',refinementLevel:3,parameters:{StateArg1:'13+GetRefiningLevel()*4',StateArg2:'25+GetRefiningLevel()*5',StateArg3:'4+GetRefiningLevel()*2'}});
  assert.equal(result.analysisTrack,'mechanics');
  assert.deepEqual(result.values,{StateArg1:25,StateArg2:40,StateArg3:10});
  assert.equal(result.finalDamage,null);
  assert.ok(result.limitations.some(value=>value.includes('not a theorycraft recommendation')));
});

test('Wheel refinement resolver rejects unsupported grammar, levels and loose schemas',()=>{
  assert.throws(()=>evaluateWheelRefinementExpression('StateOwner.atk',3));
  assert.throws(()=>evaluateWheelRefinementExpression('1+GetRefiningLevel()*2',4));
  assert.throws(()=>resolveWheelRefinementParameters({schemaVersion:1,kind:'morimens-wheel-refinement-parameters',build:'pc-res144-build51',wheelId:'x',refinementLevel:3,parameters:{StateArg1:'1'},analysisTrack:'theorycrafting'}));
});
