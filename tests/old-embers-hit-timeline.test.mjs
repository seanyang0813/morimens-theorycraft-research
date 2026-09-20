import test from 'node:test';
import assert from 'node:assert/strict';
import {runOldEmbersHitTimeline} from '../engine/old-embers-hit-timeline.mjs';
import {runResearchTimeline} from '../engine/research-timeline.mjs';
import {runResolvedHitTimeline} from '../engine/resolved-hit-timeline.mjs';
const build='pc-res144-build51';
function make({damage=10,layers=100,hp=1000,pure=false}={}){
  const effect={build,category:pure?'PURE':'FIXED',targetDead:false,baseDamage:damage,...(pure?{}:{dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0})};
  return {schemaVersion:1,build,interveningEffects:'old-embers-only-assumed',target:{hp,block:100},oldEmbersLayers:layers,steps:['first','second'].map(id=>({id,immune:false,puncture:false,scenario:{build,mode:'experimental',damageType:effect.category,effect}}))};
}
test('fully shielded Fixed hits still trigger incoming-damage Old Embers and carry stacks to next hit',()=>{
  const input=make(),saved=JSON.stringify(input),r=runOldEmbersHitTimeline(input);
  assert.equal(r.modeledHpLost,30);assert.equal(r.targetAfter.block,80);assert.equal(r.oldEmbersLayersAfter,90);
  assert.equal(r.trace[0].hit.modeledHpLost,0);assert.equal(r.trace[1].before.hp,985);
  assert.equal(r.trace[1].oldEmbersBefore,95);assert.equal(r.trace[0].generatedEffects[0].parentStepId,'first');
  assert.equal(JSON.stringify(input),saved);assert.equal(r.finalDamage,null);
});
test('depletion carries removal forward and Pure damage does not activate this trigger',()=>{
  const depleted=runOldEmbersHitTimeline(make({layers:3}));assert.equal(depleted.modeledHpLost,9);assert.equal(depleted.oldEmbersLayersAfter,0);assert.equal(depleted.trace[1].generatedEffects.length,0);
  const pure=runOldEmbersHitTimeline(make({pure:true}));assert.equal(pure.modeledHpLost,0);assert.equal(pure.oldEmbersLayersAfter,100);
});
test('direct damage immunity does not erase incoming damage supplied to Old Embers',()=>{
  const input=make();for(const step of input.steps)step.immune=true;
  const r=runOldEmbersHitTimeline(input);assert.equal(r.modeledHpLost,30);assert.equal(r.targetAfter.block,100);assert.equal(r.oldEmbersLayersAfter,90);
});
test('lethal generated loss stops rather than fabricating stack cleanup or subsequent actions',()=>{
  const r=runOldEmbersHitTimeline(make({hp:10}));assert.equal(r.completed,false);assert.equal(r.trace.length,1);assert.equal(r.targetAfter.hp,0);assert.equal(r.oldEmbersLayersAfter,100);
});

test('shared entry point preserves models and dependencies without defaulting a scope',()=>{
  const input=make(),result=runResearchTimeline(input);
  assert.deepEqual(result,runOldEmbersHitTimeline(input));
  assert.equal(result.executedSteps,2);assert.equal(result.remainingSteps,0);
  const {oldEmbersLayers,...plain}=input;plain.interveningEffects='assumed-absent';
  assert.deepEqual(runResearchTimeline(plain),runResolvedHitTimeline(plain));
  for(const dependency of result.trace[0].hit.result.unresolvedDependencies)assert.ok(result.unresolvedDependencies.includes(dependency),dependency);
  assert.throws(()=>runResearchTimeline({...input,interveningEffects:undefined}));
  const lethal=runResearchTimeline(make({hp:10}));assert.equal(lethal.executedSteps,1);assert.equal(lethal.remainingSteps,1);
});
