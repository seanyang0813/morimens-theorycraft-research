import test from 'node:test';
import assert from 'node:assert/strict';
import {compareScenarios} from '../engine/experiments.mjs';
import {build} from '../engine/calculate-damage.mjs';
const base=()=>({build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:100,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}});
test('pinned experiments refuse missing or different runtime identities',()=>{
  const experiment={schemaVersion:1,baseline:base(),candidate:base()},runtimeFingerprint='a'.repeat(64);
  const result=compareScenarios(experiment,{runtimeFingerprint});assert.equal(result.reproducibility,'RUNTIME_PINNED');
  assert.equal(experiment.runtimeFingerprint,undefined);
  assert.deepEqual(compareScenarios(result.experiment,{runtimeFingerprint}),result);
  assert.throws(()=>compareScenarios(result.experiment));
  assert.throws(()=>compareScenarios(result.experiment,{runtimeFingerprint:'b'.repeat(64)}));
  assert.throws(()=>compareScenarios({...experiment,runtimeFingerprint:null}));
  assert.equal(compareScenarios(experiment).reproducibility,'UNPINNED');
});
test('experiments preserve exact input changes, trace deltas and immutable snapshots',()=>{
  const baseline=base(),candidate=base();candidate.effect.fixed1=50;
  const result=compareScenarios({schemaVersion:1,baseline,candidate});
  assert.deepEqual(result.inputChanges,[{path:'/effect/fixed1',kind:'changed',before:0,after:50}]);
  assert.equal(result.metrics.delta.preHitDamage,50);assert.equal(result.metrics.delta.modeledHpLost,null);
  candidate.effect.fixed1=500;assert.equal(result.experiment.candidate.effect.fixed1,50);
  assert.equal(result.stageChanges.at(-1).delta,50);assert.equal(result.finalDamage,null);
  assert.deepEqual(compareScenarios(JSON.parse(JSON.stringify(result.experiment))),result);
});
test('caps can hide pre-hit improvement; comparison preserves that distinction',()=>{
  const baseline=base(),candidate=base();candidate.effect.fixed1=100;
  for(const s of [baseline,candidate])s.hitResolution={immune:false,puncture:false,preventEligible:false,hp:1000,block:0,retainHp:0,limit:50,usedLimit:0,deathResist:0};
  const result=compareScenarios({schemaVersion:1,baseline,candidate});
  assert.equal(result.metrics.delta.preHitDamage,100);assert.equal(result.metrics.delta.modeledHpLost,0);
});
test('skipped effects and unsupported experiment states are not fabricated results',()=>{
  const baseline=base(),candidate=base();candidate.effect.targetDead=true;
  const result=compareScenarios({schemaVersion:1,baseline,candidate});assert.equal(result.metrics.delta.preHitDamage,null);assert.equal(result.traceComparable,false);
  assert.throws(()=>compareScenarios({schemaVersion:1,baseline:{...base(),mode:'strict'},candidate:base()}));
  const invalid=base();invalid.effect.baseDamage=NaN;assert.throws(()=>compareScenarios({schemaVersion:1,baseline:invalid,candidate:base()}));
});
