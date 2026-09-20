import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveActivePrevention} from '../engine/active-prevention.mjs';
import {calculateDamage,build} from '../engine/calculate-damage.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-prevention.json',import.meta.url)));
test('180 original eligibility/HP cases and supported API category compositions',()=>{
  for(const {input:v,expected:e} of data.fixtures){
    const damageType=v.damageType.toUpperCase();
    const preventionProperties={casterExists:v.casterExists,casterPrevention:v.casterPrevention,targetPrevention:v.targetPrevention};
    assert.equal(resolveActivePrevention({build,damageType,immune:v.immune,...preventionProperties}).preventEligible,e.isPreventActiveDamage);
    if(damageType==='TENTACLE')continue; // Formula API does not yet support Tentacle.
    const hitResolution={immune:v.immune,preventionProperties,block:v.block,puncture:v.puncture,hp:v.hp,retainHp:v.retainHp,limit:v.limit,usedLimit:v.usedLimit,deathResist:v.deathResist};
    const input={mode:'experimental',build,damageType,hitResolution};
    if(damageType==='ACTIVE')Object.assign(input,{offense:neutralShowInputs(v.damage),target:{...Object.fromEntries(targetKeys.map(k=>[k,0])),isCrit:false,enemyStateDmgMultiplier:1}});
    else if(damageType==='PASSIVE')input.passive={build,baseDamage:v.damage,targetDead:false,passive1:0,passive2:0,passive3:0,dimensionFixPer:0};
    else{
      input.effect={build,category:damageType,baseDamage:v.damage,targetDead:false};
      if(damageType==='FIXED')Object.assign(input.effect,{dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0});
    }
    const result=calculateDamage(input);
    assert.equal(result.prevention.preventEligible,e.isPreventActiveDamage);
    assert.equal(result.experimentalModels[1].converted,e.convertDamageVal);
    assert.equal(result.experimentalModels[1].hpLossRequest,e.changeVal);
    assert.equal(result.experimentalModels[2].hpAfter,e.curHp);
    assert.equal(result.finalDamage,null);
    assert.throws(()=>calculateDamage({...input,hitResolution:{...hitResolution,preventEligible:false}}),/exactly one/);
  }
});
