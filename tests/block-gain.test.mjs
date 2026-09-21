import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neutralBlockInputs} from '../engine/show-block.mjs';
import {calculateBlockGain,storeBlock} from '../engine/block-gain.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-block-target-storage.json',import.meta.url)));
const modifiers=(()=>{const {value,...rest}=neutralBlockInputs(0);return rest;})();

test('recipient Block modifiers match 144 copied-original executions',()=>{
  assert.equal(fixture.finalBlock.length,144);
  for(const row of fixture.finalBlock){const result=calculateBlockGain({base:row.input.showBlock,modifiers,target:{gainBlockPer:row.input.gainBlockPer,gainBlockPlus:row.input.gainBlockPlus},storage:{block:0,maxHp:1e9,blockMaxPer:0,ignoreMax:true}});assert.equal(result.requestedBlock,row.expected);}
});

test('Block cap and storage match 160 copied-original executions',()=>{
  assert.equal(fixture.storage.length,160);
  for(const row of fixture.storage){const result=storeBlock({request:row.input.request,block:row.input.block,maxHp:row.input.maxHp,blockMaxPer:row.input.blockMaxPer,ignoreMax:row.input.ignoreMax});assert.deepEqual({blockAfter:result.blockAfter,actualBlockGained:result.actualBlockGained},row.expected);}
});

test('resolved Block path fails closed on missing context',()=>{
  const valid={base:100,modifiers,target:{gainBlockPer:0,gainBlockPlus:0},storage:{block:0,maxHp:1000,blockMaxPer:0,ignoreMax:false}};
  assert.equal(calculateBlockGain(valid).blockAfter,100);
  assert.throws(()=>calculateBlockGain({...valid,target:{gainBlockPer:0}}),/Explicit/);
  assert.throws(()=>calculateBlockGain({...valid,storage:{...valid.storage,block:-1}}),/Explicit/);
});
