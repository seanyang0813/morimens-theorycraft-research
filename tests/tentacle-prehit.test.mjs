import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tentaclePreHit} from '../engine/tentacle-prehit.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/installed-tentacle-prehit.json',import.meta.url),'utf8'));
test('resolved Tentacle pre-hit matches original installed SchoolCompPVE across synthetic cases',()=>{
  assert.equal(fixture.build,'pc-res151-build51');
  assert.equal(fixture.fixtures.length,414);
  for(const {input,expected} of fixture.fixtures){
    const {baseDamage,certainCrit,tentacleCrit,antiCrit,...values}=input;
    assert.equal(tentacleCrit,0);
    const result=tentaclePreHit({build:fixture.build,isCrit:certainCrit>0||tentacleCrit-antiCrit>1,
      tentacleDamage:baseDamage,critDamagePer:values.tentacleCritDmg,...Object.fromEntries(
        Object.entries(values).filter(([key])=>key!=='tentacleCritDmg'))});
    assert.equal(result.isCrit,expected.isCrit);
    assert.equal(result.preHitDamage,expected.preHitDamage);
    assert.equal(result.finalDamage,null);
  }
});
test('Tentacle path rejects unknown and unsupported inputs',()=>{
  const {input}=fixture.fixtures[0];
  const {baseDamage,certainCrit,tentacleCrit,antiCrit,tentacleCritDmg,...values}=input;
  const valid={build:fixture.build,isCrit:false,tentacleDamage:baseDamage,critDamagePer:tentacleCritDmg,...values};
  assert.throws(()=>tentaclePreHit({...valid,build:'pc-res150-build51'}));
  assert.throws(()=>tentaclePreHit({...valid,unknown:1}));
  assert.throws(()=>tentaclePreHit({...valid,beDamagePer:NaN}));
});
