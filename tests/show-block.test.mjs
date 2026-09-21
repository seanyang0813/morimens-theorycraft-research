import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neutralBlockInputs,showBlock} from '../engine/show-block.mjs';

test('block formula matches 607 copied-original runtime executions exactly',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-show-block.json',import.meta.url)));
  assert.equal(fixture.fixtures.length,607);
  for(const {input,expected} of fixture.fixtures){const result=showBlock(input);assert.deepEqual({showBlock:result.showBlock,baseBlock:result.baseBlock},expected);}
});

test('block formula rejects omissions and unrecognized properties',()=>{
  const value=neutralBlockInputs(100);assert.deepEqual({showBlock:showBlock(value).showBlock,baseBlock:showBlock(value).baseBlock},{showBlock:100,baseBlock:100});
  delete value.awakerFrailPer;assert.throws(()=>showBlock(value),/Missing/);
  assert.throws(()=>showBlock({...neutralBlockInputs(100),invented:1}),/unrecognized/);
});
