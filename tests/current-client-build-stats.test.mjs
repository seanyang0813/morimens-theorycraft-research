import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolveClientAdvancementPrimary,resolveClientBuildPrimary} from '../engine/client-build-stats.mjs';

const bytes=readFileSync(new URL('../research/evidence/client-build-data-res150.json',import.meta.url));
const data=JSON.parse(bytes),report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-primary-stat-lookup.json',import.meta.url)));

test('current client data is bound to 2700 exact original lookup checks',()=>{
  assert.equal(data.build,'pc-res150-build51');
  assert.equal(report.status,'CURRENT_ORIGINAL_LOOKUP_EXACT');
  assert.equal(report.runtimeChecks.cases,2700);
  assert.equal(report.runtimeChecks.mismatches,0);
  assert.equal(report.sourceHashes.currentClientBuildData,createHash('sha256').update(bytes).digest('hex'));
  assert.equal(data.characters.length,60);
  assert.equal(data.unresolved.length,1);
  for(const row of report.runtimeChecks.samples){
    const result=resolveClientBuildPrimary({build:data.build,characterId:row.characterId,level:90,gnosticRank:5},data);
    assert.equal(result.stats[row.stat],row.expected,`${row.characterId} ${row.stat}`);
  }
});

test('current Mouchette progression resolves from current tables and exact shared rounding',()=>{
  const character=data.characters.find(row=>row.characterId==='awakener-0033');
  const talent=character.advancementTalents.find(row=>row.clientTalentId===122481);
  const result=resolveClientAdvancementPrimary({build:data.build,characterId:character.characterId,level:90,gnosticRank:5,advancementTalentId:talent.clientTalentId,advancementLevel:10},data);
  assert.equal(result.baseStats.ATK,198);
  assert.equal(result.progression.percentages.ATK,30);
  assert.equal(result.stats.ATK,258);
  assert.equal(result.build,'pc-res150-build51');
});

test('every supported current advancement promotion resolves at its recorded endpoints',()=>{
  let talents=0,levels=0;
  for(const character of data.characters){
    for(const talent of character.advancementTalents){
      talents+=1;
      for(const advancementLevel of [0,talent.maximumLevel]){
        const result=resolveClientAdvancementPrimary({build:data.build,characterId:character.characterId,level:90,gnosticRank:5,advancementTalentId:talent.clientTalentId,advancementLevel},data);
        const expected=talent.percentByLevel[String(advancementLevel)];
        assert.deepEqual(result.progression.percentages,expected);
        for(const stat of ['ATK','DEF','CON']){
          assert.equal(result.stats[stat],Math.ceil(result.baseStats[stat]*(1+expected[stat]/100)));
        }
        levels+=1;
      }
    }
  }
  assert.equal(talents,report.advancementCatalog.supportedPrimaryPromotionTalents);
  assert.equal(data.characters.filter(row=>row.advancementTalents.length).length,report.advancementCatalog.charactersWithSupportedPrimaryPromotion);
  assert.ok(levels>0);
});

test('client build data cannot be crossed between resource versions',()=>{
  const character=data.characters[0];
  assert.throws(()=>resolveClientBuildPrimary({build:'pc-res144-build51',characterId:character.characterId,level:90,gnosticRank:5},data),/mismatched/);
});
