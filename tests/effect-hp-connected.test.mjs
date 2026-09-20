import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateDamage,build} from '../engine/calculate-damage.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-effect-hp.json',import.meta.url)));
test('calculator matches connected original effect-to-HP executions',()=>{
  for(const {input:v,expected:e} of data.fixtures){
    const damageType=v.damageType.toUpperCase();
    const hitResolution={block:v.block,puncture:v.puncture,hp:v.hp,retainHp:v.retainHp,limit:v.limit,usedLimit:v.usedLimit,deathResist:v.deathResist,
      immunityProperties:{general:Number(v.immune),punctureImmunity:0,categoryImmunities:{Active:0,Passive:0,Fixed:0,Pure:0,Tentacle:0}},
      preventionProperties:{casterExists:true,casterPrevention:0,targetPrevention:0}};
    const input={mode:'experimental',build,damageType,hitResolution};
    if(damageType==='PASSIVE')input.passive={build,baseDamage:v.damage,targetDead:false,dimensionFixPer:v.dimensionFixPer,
      passive1:v.effectProperties.be_passive_damage_per,passive2:v.effectProperties.be_passive_damage_per2,passive3:v.effectProperties.be_passive_damage_per3};
    else{
      input.effect={build,category:damageType,baseDamage:v.damage,targetDead:false};
      if(damageType==='FIXED'){
        input.effect.dimensionFixPer=v.dimensionFixPer;
        for(let i=1;i<=5;i++)input.effect['fixed'+i]=v.effectProperties['be_fixed_damage_per'+i];
      }
    }
    const result=calculateDamage(input),[pre,hit,hp]=result.experimentalModels;
    assert.equal(pre.preHitDamage,e.castDamage);
    assert.equal(hit.immune,e.immueDamage);
    assert.equal(hit.hpLossRequest,e.changeVal);
    assert.equal(hit.deathResistApplied,e.pvp_death_resist);
    assert.equal(hp.hpAfter,e.curHp);
    assert.equal(hp.modeledHpLost,e.realDamage);
    assert.equal(hp.shieldAfter,e.blockAfter);
    assert.equal(hp.overflowDiagnostic,e.overflowDamage);
    assert.equal(result.finalDamage,null);
  }
});
