import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runResolvedHitTimeline} from '../engine/resolved-hit-timeline.mjs';
const build='pc-res144-build51';
const hit=(id,amount,puncture=false)=>({id,immune:false,puncture,scenario:{build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:amount,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}});
const scenario=steps=>({schemaVersion:1,build,interveningEffects:'assumed-absent',target:{hp:1000,block:100},steps});
test('matches original repeated effect/BeHit calls retaining the same Lua target properties',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-hit-timeline.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){
    const steps=input.hits.map(h=>{
      const s={build,mode:'experimental',damageType:h.category.toUpperCase()};
      if(h.category==='Passive')s.passive={build,targetDead:false,baseDamage:h.damage,dimensionFixPer:0,passive1:0,passive2:0,passive3:0};
      else s.effect={build,category:s.damageType,targetDead:false,baseDamage:h.damage,...(h.category==='Fixed'?{dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}:{})};
      return {id:h.id,scenario:s,immune:false,puncture:h.puncture};
    });
    const r=runResolvedHitTimeline({...scenario(steps),target:input.target});
    assert.deepEqual(r.targetAfter,expected.targetAfter);assert.equal(r.executedSteps,expected.executedSteps);
    assert.deepEqual(r.trace.map(({stepId,before,after,modeledHpLost})=>({stepId,before,after,modeledHpLost})),expected.trace);
  }
});
test('order changes shield consumption and later HP loss without resetting target state',()=>{
  const input=scenario([hit('puncture',100,true),hit('ordinary',50)]),copy=JSON.stringify(input);
  const a=runResolvedHitTimeline(input),b=runResolvedHitTimeline({...input,steps:[...input.steps].reverse()});
  assert.equal(a.modeledHpLost,150);assert.equal(b.modeledHpLost,100);
  assert.deepEqual(a.trace[1].before,a.trace[0].after);assert.equal(JSON.stringify(input),copy);
  assert.equal(a.finalDamage,null);assert.equal(a.completed,true);
});
test('death halts later actions and preserves partial trace instead of guessing revival',()=>{
  const input=scenario([hit('lethal',1200),hit('later',50)]),result=runResolvedHitTimeline(input);
  assert.equal(result.executedSteps,1);assert.equal(result.remainingSteps,1);assert.equal(result.completed,false);
  assert.equal(result.stop.beforeStepId,'later');assert.equal(result.targetAfter.hp,0);
});
test('unsupported scope, duplicate IDs and independent HP resets reject',()=>{
  const input=scenario([hit('one',50)]);
  assert.throws(()=>runResolvedHitTimeline({...input,interveningEffects:undefined}));
  assert.throws(()=>runResolvedHitTimeline({...input,steps:[input.steps[0],input.steps[0]]}));
  input.steps[0].scenario.hitResolution={hp:1000};assert.throws(()=>runResolvedHitTimeline(input));
});
