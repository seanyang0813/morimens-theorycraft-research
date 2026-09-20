import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTimelines} from '../engine/timeline-experiments.mjs';
const build='pc-res144-build51';
const hit=(id,damage,puncture=false)=>({id,immune:false,puncture,scenario:{build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:damage,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}});
const timeline=steps=>({schemaVersion:1,build,interveningEffects:'assumed-absent',target:{hp:1000,block:100},steps});
const experiment=(baseline,candidate)=>({schemaVersion:1,kind:'morimens-timeline-comparison',baseline,candidate});
test('reordered traces align by identity, with order separated from input changes',()=>{
  const a=timeline([hit('pierce',100,true),hit('ordinary',50)]),b={...a,steps:[...a.steps].reverse()},input=experiment(a,b),copy=JSON.stringify(input);
  const r=compareTimelines(input);assert.equal(r.orderOnly,true);assert.deepEqual(r.inputChanges,[]);assert.equal(r.modeledHpLostDelta,-50);
  assert.deepEqual(r.alignedSteps.map(s=>[s.id,s.baselinePosition,s.candidatePosition,s.delta.hpLost]),[['pierce',1,2,0],['ordinary',2,1,-50]]);
  assert.equal(JSON.stringify(input),copy);
});
test('changed properties are explicit and incomplete suffixes do not become zero damage',()=>{
  const a=timeline([hit('lethal',2000),hit('later',10)]),b=timeline([hit('lethal',100),hit('later',10)]);
  const r=compareTimelines(experiment(a,b));assert.equal(r.completeComparison,false);assert.equal(r.modeledHpLostDelta,null);
  assert.equal(r.alignedSteps[1].baseline,null);assert.equal(r.alignedSteps[1].delta,null);
  assert.ok(r.inputChanges.some(c=>c.path==='/steps/lethal/scenario/effect/baseDamage'));
});
test('fingerprinted saves replay only against the verified matching runtime',()=>{
  const a=timeline([hit('one',10)]),fingerprint='a'.repeat(64);
  const r=compareTimelines(experiment(a,a),{runtimeFingerprint:fingerprint});assert.equal(r.reproducibility,'RUNTIME_PINNED');
  assert.throws(()=>compareTimelines(r.experiment),/fingerprint mismatch/);
  assert.throws(()=>compareTimelines(r.experiment,{runtimeFingerprint:'b'.repeat(64)}),/fingerprint mismatch/);
  assert.equal(compareTimelines(r.experiment,{runtimeFingerprint:fingerprint}).modeledHpLostDelta,0);
  assert.throws(()=>compareTimelines({...experiment(a,a),unexpected:true}));
});
