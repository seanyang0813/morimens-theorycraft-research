import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateDamage} from '../engine/calculate-damage.mjs';
import {damageTriggerPayload} from '../engine/damage-triggers.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-hit-trigger-bridge.json',import.meta.url)));
test('computed hit payload feeds matching original handlers without substituting HP loss for incoming damage',()=>{
  for(const {input:i,handler,expected} of evidence.fixtures){
    const build=evidence.build,damageType=i.damageType.toUpperCase();
    const scenario={build,mode:'experimental',damageType,hitResolution:{hp:i.hp,block:i.block,immune:i.immune,puncture:false,preventEligible:false,retainHp:0,limit:0,usedLimit:0,deathResist:0}};
    if(damageType==='PASSIVE')scenario.passive={build,targetDead:false,baseDamage:i.damage,dimensionFixPer:0,passive1:0,passive2:0,passive3:0};
    else scenario.effect={build,category:damageType,targetDead:false,baseDamage:i.damage,...(damageType==='FIXED'?{dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}:{})};
    const hit=calculateDamage(scenario),calls=[];
    const trigger=damageTriggerPayload({handler,mode:'None',event:{...hit.hitTriggerValues,targetRoleUid:7,castRoleUid:9,damageType:i.damageType,isCrit:false},target:{uid:7,camp:2},caster:{uid:9,camp:2},tryTrigger:(camp,uid)=>{calls.push([camp,uid]);return true;}});
    if(trigger)for(const key of ['associator','associator2'])if(trigger[key])trigger[key]=trigger[key].map(r=>r.uid);
    assert.deepEqual({trigger,eligibilityCalls:calls},expected);
  }
});
