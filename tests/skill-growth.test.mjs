import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSkillGrowth,buildNumericSkillArguments} from '../engine/skill-growth.mjs';
import {selectProgressionList} from '../engine/skill-list.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-skill-growth.json',import.meta.url)));
test('all exported growth expressions reproduce original compiled arithmetic',()=>{
  for(const {input,expected} of evidence.fixtures){const r=resolveSkillGrowth({formulaNames:[input.name],originalCoefficients:[input.coefficient],skillLevel:input.skillLevel,formulaExpressions:evidence.expressions});assert.equal(r.values[0],expected);}
});
test('assembled numeric arguments and growth member writes match connected original construction',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-connected-skill-arguments.json',import.meta.url)));
  for(const {input,expected} of data.fixtures){
    const actual=buildNumericSkillArguments({...input,growth:{...input.growth,formulaExpressions:data.formulaExpressions},readVariable:name=>name==='BattleAtkForce'?input.attack:undefined});
    assert.deepEqual(actual.arguments,expected.arguments);
    const writes=actual.growth.trace.flatMap(row=>[{name:'GrowArgValue',value:row.coefficient},{name:'GrowArgValue'+row.index,value:row.evaluation.values[0]}]);
    assert.deepEqual(writes,expected.memberWrites);
  }
});
test('selected coefficients feed parameter expressions, then ceiling, then fractional overrides',()=>{
  const list=selectProgressionList({value:{0:{1:.4}},breakSkillLevel:0,potencyLevel:0});
  const growth={formulaNames:['BattleFomula1'],originalCoefficients:list.value,skillLevel:6,formulaExpressions:evidence.expressions};
  const input={growth,parameterExpression:'BattleAtkForce*GrowArgValue1,3',readVariable:name=>name==='BattleAtkForce'?258:undefined,overrides:[]};
  const result=buildNumericSkillArguments(input);assert.equal(result.growth.values[0],.8);assert.deepEqual(result.arguments,[207,3]);
  assert.deepEqual(buildNumericSkillArguments({...input,overrides:[.5]}).arguments,[.5,3]);
});
test('missing coefficient inputs and unsupported growth variables fail explicitly',()=>{
  const input={formulaNames:['x'],originalCoefficients:[0],skillLevel:1,formulaExpressions:{x:'GrowArgValue'}};
  assert.equal(resolveSkillGrowth(input).values[0],0);
  assert.throws(()=>resolveSkillGrowth({...input,originalCoefficients:[]}));
  assert.throws(()=>resolveSkillGrowth({...input,formulaExpressions:{x:'missing'}}));
});
