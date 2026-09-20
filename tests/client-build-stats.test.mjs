import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveClientBuildPrimary} from '../engine/client-build-stats.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const data=read('../research/evidence/client-build-data.json');
const evidence=read('./synthetic/original-primary-stat-lookup.json');
test('build choices reproduce original connected character, rarity and talent lookup',()=>{
  assert.equal(evidence.fixtures.length,2700);
  for(const f of evidence.fixtures){
    const r=resolveClientBuildPrimary({build:evidence.build,characterId:f.characterId,level:f.level,gnosticRank:f.rank},data);
    assert.equal(r.stats[{atk:'ATK',def:'DEF',physique:'CON'}[f.stat]],f.expected,`${f.characterId} ${f.stat} L${f.level} G${f.rank}`);
    assert.equal(r.progression.talentBonusLevels,f.resolvedInputs.talentBonusLevels);
    assert.equal(r.finalDamage,null);
  }
});
test('ambiguous identity and missing progression never receive assumed values',()=>{
  const base={build:evidence.build,characterId:data.characters[0].characterId,level:90,gnosticRank:5};
  for(const patch of [{characterId:data.unresolved[0].characterId},{gnosticRank:null},{gnosticRank:6},{level:91},{build:'android'}])assert.throws(()=>resolveClientBuildPrimary({...base,...patch},data));
});
