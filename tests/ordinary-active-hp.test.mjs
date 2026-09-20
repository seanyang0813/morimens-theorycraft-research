import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveOrdinaryActiveHp} from '../engine/ordinary-active-hp.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-behit-hp.json',import.meta.url)));
for(const {input,expected} of data.fixtures){
  const {immune,preventEligible,...values}=input;
  const actual=resolveOrdinaryActiveHp({...values,genericImmunity:immune,preventActiveDamage:preventEligible});
  // Lua integer/float zero affects the callback diagnostic sign; JS does not
  // model Lua numeric subtypes. Compare serialized numeric records (+0 == -0).
  assert.deepEqual(JSON.parse(JSON.stringify(actual.record)),JSON.parse(JSON.stringify(expected)),JSON.stringify(input));
  assert.equal(actual.finalDamage,null);
}
assert.throws(()=>resolveOrdinaryActiveHp({}),/flags/);
assert.throws(()=>resolveOrdinaryActiveHp({genericImmunity:true,preventActiveDamage:false,damage:-1}),/nonnegative damage/);
console.log(`Passed ${data.fixtures.length} original BeHit/HP cases`);
