import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveClientAdvancementPrimary} from '../engine/client-build-stats.mjs';

const data=JSON.parse(readFileSync(new URL('../research/evidence/client-build-data.json',import.meta.url),'utf8'));
const input=(character,level)=>({build:data.build,characterId:character.characterId,level:90,gnosticRank:5,advancementTalentId:character.advancementTalents[0].clientTalentId,advancementLevel:level});

test('Mouchette level-10 advancement applies the recovered 30 percent with client rounding',()=>{
  const character=data.characters.find(row=>row.characterId==='awakener-0033');
  const result=resolveClientAdvancementPrimary(input(character,10),data);
  assert.equal(result.baseStats.ATK,198);
  assert.equal(result.progression.percentages.ATK,30);
  assert.equal(result.stats.ATK,258);
  assert.equal(result.trace.find(row=>row.stat==='ATK').modifierTrace.rounding,'ceil without epsilon');
  assert.equal(result.finalDamage,null);
});

test('every mapped character advancement has explicit level 0 and maximum boundaries',()=>{
  assert.equal(data.characters.length,60);
  for(const character of data.characters){
    assert.ok(character.advancementTalents.length>0,character.characterId);
    for(const talent of character.advancementTalents)for(const level of [0,talent.maximumLevel]){
      const result=resolveClientAdvancementPrimary({...input(character,level),advancementTalentId:talent.clientTalentId},data);
      for(const value of Object.values(result.stats))assert.ok(Number.isSafeInteger(value));
      if(level===0)assert.deepEqual(result.stats,result.baseStats);
    }
  }
});

test('wrong talent identity, unknown level and omitted inputs reject',()=>{
  const character=data.characters[0],base=input(character,10);
  assert.throws(()=>resolveClientAdvancementPrimary({...base,advancementTalentId:999999999},data));
  assert.throws(()=>resolveClientAdvancementPrimary({...base,advancementLevel:11},data));
  const missing={...base};delete missing.advancementLevel;assert.throws(()=>resolveClientAdvancementPrimary(missing,data));
});
