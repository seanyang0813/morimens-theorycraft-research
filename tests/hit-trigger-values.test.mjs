import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hitTriggerValues} from '../engine/hit-trigger-values.mjs';
import {resolveHitLimits} from '../engine/hit-limits.mjs';
import {subtractOrdinaryHp} from '../engine/hp-property.mjs';
import {runResolvedHitTimeline} from '../engine/resolved-hit-timeline.mjs';
test('numeric trigger payload matches original BeHit fields, including shield, immunity and overkill',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-behit-hp.json',import.meta.url)));
  for(const {input:i,expected:e} of evidence.fixtures){
    const {immune,...inputs}=i;
    const hit=resolveHitLimits({...inputs,damage:e.immueDamage?0:i.damage,preventEligible:e.isPreventActiveDamage});
    const hp=subtractOrdinaryHp({hp:i.hp,request:hit.hpLossRequest});
    const result=hitTriggerValues({incomingDamage:i.damage,hpBefore:i.hp,hpAfter:hp.hpAfter,immune:e.immueDamage,preventEligible:e.isPreventActiveDamage,hit});
    for(const key of Object.keys(e))if(Object.hasOwn(result,key))assert.equal(result[key],e[key],key);
    assert.equal(result.unBlockedDamage,e.realDamage);
  }
});
test('timeline exposes cast damage separately from actual loss for downstream triggers',()=>{
  const build='pc-res144-build51';
  const r=runResolvedHitTimeline({schemaVersion:1,build,interveningEffects:'assumed-absent',target:{hp:1000,block:100},steps:[{id:'blocked',immune:false,puncture:false,scenario:{build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:50,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}}]});
  const values=r.trace[0].result.hitTriggerValues;assert.equal(values.castDamage,50);assert.equal(values.realDamage,0);assert.equal(values.unBlockedDamage,0);
});
