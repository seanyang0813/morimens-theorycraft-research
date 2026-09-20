import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stateTriggerEligible} from '../engine/trigger-eligibility.mjs';
import {damageTriggerPayload} from '../engine/damage-triggers.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-trigger-eligibility.json',import.meta.url)));
test('64 original eligibility cases match monster precedence, camps and deletion',()=>{
  for(const {input,expected} of data.fixtures)assert.equal(stateTriggerEligible({...input,ownerUid:7}),expected,JSON.stringify(input));
});
test('code-derived damage-handler composition restricts a monster state to its own target',()=>{
  for(const targetUid of [7,9]){
    const result=damageTriggerPayload({handler:'BSTAfterBeActiveDamage',mode:'None',target:{uid:targetUid,camp:2},caster:{uid:1,camp:1},
      event:{targetRoleUid:targetUid,damageType:'Active',castDamage:200,realDamage:0,unBlockedDamage:0,blockedDamage:200,isCrit:false},
      tryTrigger:(triggerCamp,roleUid)=>stateTriggerEligible({deleted:false,monster:true,enemy:false,ownerUid:7,ownerCamp:2,triggerCamp,roleUid})});
    assert.equal(result?.triggerValue??null,targetUid===7?200:null);
  }
});
