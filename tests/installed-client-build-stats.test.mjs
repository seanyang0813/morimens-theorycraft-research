import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolveClientAdvancementPrimary,resolveClientBuildPrimary} from '../engine/client-build-stats.mjs';

const bytes=readFileSync(new URL('../research/evidence/client-build-data-res151.json',import.meta.url));
const data=JSON.parse(bytes);
const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res151-primary-stat-lookup.json',import.meta.url)));
const previous=JSON.parse(readFileSync(new URL('../research/evidence/client-build-data-res150.json',import.meta.url)));

test('installed progression is bound to 2700 exact original resource-151 lookups',()=>{
  assert.equal(data.build,'pc-res151-build51');
  assert.equal(report.currentBuild,data.build);
  assert.equal(report.status,'CURRENT_ORIGINAL_LOOKUP_EXACT');
  assert.equal(report.runtimeChecks.cases,2700);
  assert.equal(report.runtimeChecks.mismatches,0);
  assert.deepEqual(report.resource150Carryforward,{sourceModuleCount:8,identicalSourceModules:8,derivedCharactersEqual:true,unresolvedIdentitiesEqual:true,installedTextAssetMatches:8});
  assert.equal(report.sourceHashes.currentClientBuildData,createHash('sha256').update(bytes).digest('hex'));
  assert.equal(data.characters.length,60);
  assert.equal(data.unresolved.length,1);
  assert.deepEqual(data.sourceHashes,previous.sourceHashes);
  assert.deepEqual(data.characters,previous.characters);
  for(const row of report.runtimeChecks.samples){
    const result=resolveClientBuildPrimary({build:data.build,characterId:row.characterId,level:90,gnosticRank:5},data);
    assert.equal(result.stats[row.stat],row.expected,`${row.characterId} ${row.stat}`);
  }
});

test('installed Mouchette progression and advancement remain explicit',()=>{
  const character=data.characters.find(row=>row.characterId==='awakener-0033');
  const talent=character.advancementTalents.find(row=>row.clientTalentId===122481);
  const result=resolveClientAdvancementPrimary({build:data.build,characterId:character.characterId,level:90,gnosticRank:5,advancementTalentId:talent.clientTalentId,advancementLevel:10},data);
  assert.equal(result.baseStats.ATK,198);
  assert.equal(result.progression.percentages.ATK,30);
  assert.equal(result.stats.ATK,258);
  assert.equal(result.finalDamage,null);
  assert.throws(()=>resolveClientBuildPrimary({build:'pc-res150-build51',characterId:character.characterId,level:90,gnosticRank:5},data),/mismatched/);
});
