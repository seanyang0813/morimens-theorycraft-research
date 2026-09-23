import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateDamage} from '../engine/calculate-damage.mjs';

const example=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-installed-tentacle-prehit.json',import.meta.url),'utf8'));
test('current Tentacle category exposes only resolved pre-hit estimate',()=>{
  const result=calculateDamage(example.input);
  assert.equal(result.status,'EXPERIMENTAL');
  assert.equal(result.finalDamage,null);
  assert.equal(result.experimentalModels[0].preHitDamage,120);
  assert.ok(result.unresolvedDependencies.includes('Independent gameplay validation'));
  assert.throws(()=>calculateDamage({...example.input,hitResolution:{}}));
  assert.equal(calculateDamage({...example.input,damageType:'ACTIVE'}).status,'UNVERIFIED');
});
