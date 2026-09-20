import test from 'node:test';
import assert from 'node:assert/strict';
import {runObservationScenario} from '../engine/observation-scenario.mjs';

const build='pc-res144-build51';
const fixed=amount=>({build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:amount,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}});
const step=(id,amount)=>({id,immune:false,puncture:false,scenario:fixed(amount)});
test('observation dispatcher preserves single-hit metric scope',()=>{
  const result=runObservationScenario(fixed(123),'preHitDamage');
  assert.equal(result.value,123);assert.equal(result.scenarioKind,'single-hit');assert.equal(result.metric,'preHitDamage');
});
test('observation dispatcher supports completed high-difficulty Old Embers timelines',()=>{
  const scenario={schemaVersion:1,build,interveningEffects:'old-embers-only-assumed',target:{hp:1000,block:0},oldEmbersLayers:100,steps:[step('hit',20)]};
  const result=runObservationScenario(scenario,'modeledHpLost');
  assert.equal(result.value,50);assert.equal(result.scenarioKind,'old-embers-hit-timeline');
  assert.throws(()=>runObservationScenario(scenario,'preHitDamage'),/unavailable/);
});
test('observation dispatcher refuses partial timelines and unknown shapes',()=>{
  const lethal={schemaVersion:1,build,interveningEffects:'assumed-absent',target:{hp:10,block:0},steps:[step('lethal',20),step('unresolved',1)]};
  assert.throws(()=>runObservationScenario(lethal,'modeledHpLost'),/did not complete/);
  assert.throws(()=>runObservationScenario({build},'modeledHpLost'),/Unsupported/);
});
