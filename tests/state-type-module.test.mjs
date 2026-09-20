import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyTargetStateIds} from '../engine/state-type-catalog.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../research/evidence/state-immunity-catalog.json',import.meta.url),'utf8'));
test('generated browser classifier preserves all 6,973 source-derived state types',()=>{
  assert.equal(Object.keys(catalog.stateTypes).length,6973);
  for(const [id,type] of Object.entries(catalog.stateTypes))assert.equal(classifyTargetStateIds([Number(id)]).types[0].type,type,id);
});
test('mixed active states derive buff and debuff presence without supplied booleans',()=>{
  const buff=Number(Object.keys(catalog.stateTypes).find(id=>catalog.stateTypes[id]==='buff'));
  const debuff=Number(Object.keys(catalog.stateTypes).find(id=>catalog.stateTypes[id]==='debuff'));
  const result=classifyTargetStateIds([buff,debuff]);assert.equal(result.targetHasBuff,true);assert.equal(result.targetHasDebuff,true);
});
