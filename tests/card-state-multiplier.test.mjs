import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyCardStateMultipliers} from '../engine/card-state-multiplier.mjs';

test('ordinary and fixed card modifiers match 128 original method cases',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-card-state-multipliers.json',import.meta.url),'utf8'));
  assert.equal(data.fixtures.length,128);
  for(const {input:v,expected} of data.fixtures){
    const result=applyCardStateMultipliers({layer:v.layer,stateId:2669,cardPresent:v.card,casterPresent:v.caster,instructionCard:v.instruction,
      modifiers:[{stateIds:v.ids,cardPercent:v.property,characterPercent:v.n2}]});
    assert.equal(result.layer,expected.layer,JSON.stringify(v));
    const reads=result.trace.flatMap(t=>['cardProperty',...(t.characterApplied?['casterProperty']:[])]);
    assert.deepEqual(reads,expected.reads);
  }
});

test('invalid unknown inputs cannot silently become zero',()=>{
  assert.throws(()=>applyCardStateMultipliers({layer:3,stateId:1,cardPresent:true,casterPresent:true,instructionCard:true,modifiers:[{stateIds:[1],cardPercent:50}]}));
});
