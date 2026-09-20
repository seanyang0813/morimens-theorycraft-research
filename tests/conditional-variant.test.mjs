import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectConditionalVariant} from '../engine/conditional-variant.mjs';
import {compileCommandCondition} from '../engine/command-expressions.mjs';
test('reverse selection priority, numeric positivity and literal bypass match original methods',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-conditional-variants.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){const reads=[];const result=selectConditionalVariant({variants:input.variants,evaluate:key=>{reads.push(key);return input.results[key];}});assert.deepEqual({value:result.value,reads},expected);}
});
test('live expression binding uses returned value rather than strict row-condition gate',()=>{
  const variants=[{condition:'true',value:10},{condition:'layers',value:20}];let layers=2;
  const evaluate=expression=>compileCommandCondition(expression)(()=>layers).values[0];
  assert.equal(selectConditionalVariant({variants,evaluate}).value,20);layers=0;
  assert.equal(selectConditionalVariant({variants,evaluate}).value,10);
  assert.equal(compileCommandCondition('layers')(()=>2).passed,false);
});
test('unknown results and malformed variants fail instead of becoming guessed matches',()=>{
  assert.throws(()=>selectConditionalVariant({variants:[{condition:'missing',value:10}],evaluate:()=>undefined}));
  assert.throws(()=>selectConditionalVariant({variants:[{condition:'true',value:{1:10}}]}));
});
