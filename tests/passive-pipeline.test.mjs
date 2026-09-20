import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateDamage,build} from '../engine/calculate-damage.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-passive-hp.json',import.meta.url))).fixtures;
const base={mode:'experimental',build,damageType:'PASSIVE',passive:{build,baseDamage:200,passive1:0,passive2:0,passive3:0,dimensionFixPer:0,targetDead:false}};
for(const {input:v,expected} of fixtures){
  const hitResolution={immune:expected.immueDamage,preventEligible:false,block:v.block,puncture:v.puncture,hp:v.hp,retainHp:v.retainHp,limit:v.limit,usedLimit:v.usedLimit,deathResist:v.deathResist};
  const result=calculateDamage({...base,hitResolution}),request=result.experimentalModels[1],hp=result.experimentalModels[2];
  assert.equal(request.incomingDamage,expected.castDamage);
  assert.equal(request.hpLossRequest,expected.changeVal);
  assert.equal(hp.hpAfter,expected.curHp);assert.equal(hp.modeledHpLost,expected.realDamage);
  assert.equal(hp.shieldAfter,expected.blockAfter);assert.equal(hp.overflowDiagnostic,expected.overflowDamage);
  assert.equal(request.converted,0);assert.equal(expected.isPreventActiveDamage,false);
  assert.equal(result.finalDamage,null);
  assert.throws(()=>calculateDamage({...base,hitResolution:{...hitResolution,immune:false,preventEligible:true}}),/Passive damage/);
}
const arithmetic=calculateDamage({...base,passive:{...base.passive,baseDamage:10.1,passive1:50,passive2:20,dimensionFixPer:25}});
assert.equal(arithmetic.experimentalModels[0].preHitDamage,24); // ceil(ceil(18.18)*1.25)
for(const mode of ['strict','experimental']){
  const dead=calculateDamage({...base,mode,passive:{...base.passive,targetDead:true}});
  assert.deepEqual(dead.experimentalModels,[]);assert.equal(dead.finalDamage,null);
}
assert.deepEqual(calculateDamage({...base,mode:'strict'}).experimentalModels,[]);
assert.throws(()=>calculateDamage({...base,target:{}}),/does not accept Active/);
assert.throws(()=>calculateDamage({...base,passive:{...base.passive,build:'android'}}),/matching build/);
assert.throws(()=>calculateDamage({...base,damageType:'ACTIVE'}),/does not accept Passive/);
console.log(`Passed ${fixtures.length} original Passive HP comparisons and branch integration checks`);
