import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveHpAttributeLoss} from '../engine/hp-attribute-loss.mjs';
import {resolveOldEmbersHp} from '../engine/old-embers-hp.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-hp-attribute.json',import.meta.url))).fixtures;
for(const {input,expected} of fixtures){
  const actual=resolveHpAttributeLoss(input);
  assert.deepEqual(JSON.parse(JSON.stringify(actual.result)),JSON.parse(JSON.stringify(expected)),JSON.stringify(input));
  assert.equal(actual.finalDamage,null);
}
const base={hp:10,build:'pc-res144-build51',damageType:'PASSIVE',castDamage:3,remainingStacks:10,triggerEligible:true,hasState66314:false,hasState62317:false,immueChangeHp:0,beChangeHpLimit:0};
const half=resolveOldEmbersHp(base);
assert.equal(half.modeledHpLost,4);assert.equal(half.command.stacksConsumed,2);
const capped=resolveOldEmbersHp({...base,beChangeHpLimit:2.5});
assert.equal(capped.modeledHpLost,2.5);assert.equal(capped.command.stacksConsumed,2);
const immune=resolveOldEmbersHp({...base,immueChangeHp:1});
assert.equal(immune.modeledHpLost,0);assert.equal(immune.hpEffect.result.propertyCallbacks.length,0);assert.equal(immune.hpEffect.result.events.length,1);assert.equal(immune.command.stacksConsumed,2);
const overkill=resolveOldEmbersHp({...base,hp:1});
assert.equal(overkill.modeledHpLost,1);assert.equal(overkill.hpEffect.result.events[0].castValue,-4);assert.equal(overkill.hpEffect.result.events[0].deltaValue,-1);
assert.equal(resolveOldEmbersHp({...base,hp:0}).hpEffect.result.events.length,0);
assert.equal(resolveOldEmbersHp({...base,hasState66314:true}).hpEffect,null);
assert.throws(()=>resolveHpAttributeLoss({hp:10,rawValue:1,immunity:0,limit:0}),/nonpositive/);
console.log(`Passed ${fixtures.length} original HP-attribute cases and Old Embers integration checks`);
