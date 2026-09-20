import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePrimaryStats} from '../engine/build-stats.mjs';
const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url)));
const make=(name)=>({catalogRevision:catalog.source.revision,characterId:catalog.characters.find(c=>c.name===name).id,level:90,gnosticBonusLevels:{CON:10,ATK:10,DEF:10},soulforgeBonusPercent:0});
test('previous explicitly resolved Mouchette/Arachne attack baselines retain both rounding stages',()=>{
  const m=make('Mouchette');m.soulforgeBonusPercent=30;
  const result=resolvePrimaryStats(m,catalog),attack=result.trace.find(t=>t.stat==='ATK');
  assert.equal(attack.roundedGrowth,198);assert.equal(result.stats.ATK,258);
  assert.equal(resolvePrimaryStats(make('Arachne'),catalog).stats.ATK,138);
  assert.equal(result.finalDamage,null);assert.equal(result.status,'CATALOG_DERIVED');
});
test('all saved characters resolve primary stats at supported boundary levels with explicit zero bonuses',()=>{
  for(const character of catalog.characters)for(const level of [1,70,90]){
    const input={...make('Mouchette'),characterId:character.id,level,gnosticBonusLevels:{CON:0,ATK:0,DEF:0}};
    const r=resolvePrimaryStats(input,catalog);assert.equal(r.trace.length,3);
    for(const value of Object.values(r.stats))assert.ok(Number.isSafeInteger(value));
  }
});
test('unknown, omitted, invalid and incompatible inputs never acquire defaults',()=>{
  for(const change of [i=>i.level=null,i=>i.level=91,i=>i.level=1.5,i=>i.catalogRevision='other',i=>i.characterId='unknown',i=>delete i.soulforgeBonusPercent,i=>i.soulforgeBonusPercent='30',i=>i.gnosticBonusLevels.ATK=null,i=>delete i.gnosticBonusLevels.DEF,i=>i.wheelBonus=20]){
    const input=make('Mouchette');change(input);assert.throws(()=>resolvePrimaryStats(input,catalog));
  }
});
