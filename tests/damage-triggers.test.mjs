import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {damageTriggerPayload} from '../engine/damage-triggers.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-damage-triggers.json',import.meta.url)));
test('240 original post-damage handler cases match filters and payloads',()=>{
  for(const {input:v,expected} of data.fixtures){
    const calls=[];
    const result=damageTriggerPayload({handler:v.handler,mode:v.mode,target:{uid:7,camp:2},caster:{uid:9,camp:1},
      event:{targetRoleUid:7,damageType:v.category,castDamage:v.castDamage,realDamage:v.realDamage,unBlockedDamage:v.unBlockedDamage,blockedDamage:v.blockedDamage,isCrit:v.crit},
      tryTrigger:(camp,uid)=>{calls.push([camp,uid]);return v.eligible;}});
    if(result)for(const key of ['associator','associator2'])if(result[key])result[key]=result[key].map(role=>role.uid);
    assert.deepEqual({trigger:result,eligibilityCalls:calls},expected,JSON.stringify(v));
  }
});
