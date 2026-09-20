import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectProgressionList} from '../engine/skill-list.mjs';
test('coefficient list selection matches original utility over exported fields and controls',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-skill-lists.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures)assert.deepEqual(selectProgressionList(input).value,expected);
});
test('authored list outputs are isolated and missing combined variants remain null',()=>{
  const value={0:{1:.4},1000:{1:2},3:{1:3}};
  const base={value,breakSkillLevel:0,potencyLevel:0};const result=selectProgressionList(base);result.value[0]=999;assert.equal(value[0][1],.4);
  assert.equal(selectProgressionList({...base,breakSkillLevel:1,potencyLevel:3}).value,null);
  assert.throws(()=>selectProgressionList({...base,value:{1:1,2:{1:2}}}));
  assert.throws(()=>selectProgressionList({...base,value:{2:5}}));
});
