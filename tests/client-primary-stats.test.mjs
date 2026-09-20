import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateClientPrimaryStat} from '../engine/client-primary-stats.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-primary-stats.json',import.meta.url)));
const props={ATK:'atk',CON:'physique',DEF:'def'};
test('retains original compiled formula rounding for discrepancies and adjacent-level controls',()=>{
  assert.equal(evidence.fixtures.length,360);
  for(const f of evidence.fixtures){const prop=props[f.stat];
    const r=calculateClientPrimaryStat({build:evidence.build,base:f.values[prop],extra:f.values[prop+'_extra'],upgradeLevel:f.upgradeLevel,talentBonusLevels:f.values.talent_attr_lv});
    assert.equal(r.value,f.expected,`${f.characterId} ${f.stat} level ${f.level}`);
    assert.equal(r.finalDamage,null);
  }
});
test('regression: algebraically simplified epsilon rounding would change the result',()=>{
  const r=calculateClientPrimaryStat({build:evidence.build,base:25,extra:0,upgradeLevel:14,talentBonusLevels:10});
  assert.equal(r.trace.raw,55.00000000000001);assert.equal(r.value,56);
});
test('rejects unknown build, missing and nonfinite inputs',()=>{
  const input={build:evidence.build,base:25,extra:0,upgradeLevel:14,talentBonusLevels:10};
  for(const patch of [{build:'android'},{extra:null},{base:NaN},{upgradeLevel:1.5},{talentBonusLevels:undefined}])assert.throws(()=>calculateClientPrimaryStat({...input,...patch}));
});
