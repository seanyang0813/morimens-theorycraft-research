import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveScalarSkillField} from '../engine/skill-field.mjs';
test('skill field routing matches connected original lookup and selector chain',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-skill-field-routing.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){const reads=[];const result=resolveScalarSkillField({...input,evaluate:key=>{reads.push(key);return input.results[key];}});assert.deepEqual({value:result.value,reads},expected);}
});
test('exported numeric-key condition pairs retain reverse precedence',()=>{
  const r=resolveScalarSkillField({skill:{CmdList:10,tempCmdList:{1:{1:'true',2:20},2:{1:'active',2:30}}},field:'CmdList',isAwaker:true,breakSkillLevel:0,potencyLevel:0,evaluate:()=>1});
  assert.equal(r.route,'temporary-conditional');assert.equal(r.value,30);
});
test('nested and sparse forms are not silently interpreted as supported scalar variants',()=>{
  const base={field:'CmdList',isAwaker:true,breakSkillLevel:0,potencyLevel:0};
  assert.throws(()=>resolveScalarSkillField({...base,skill:{tempCmdList:{2:{1:'true',2:10}}}}));
  assert.throws(()=>resolveScalarSkillField({...base,skill:{CmdList:{0:[1,2]}}}));
});
