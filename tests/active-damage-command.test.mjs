import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeActiveDamage,enqueueActiveDamage} from '../engine/active-damage-command.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
const evidence=name=>JSON.parse(readFileSync(new URL(`./synthetic/${name}.json`,import.meta.url)));
test('repetition arithmetic matches original ordinary initialization',()=>{
  for(const {input,expected} of evidence('original-active-damage-initialization').fixtures){
    if(!input.targetsPresent){assert.equal(expected.executionCalls,0);continue;}
    const actual=initializeActiveDamage(input);
    assert.equal(actual.totalEffectTimes,expected.totalEffectTimes);assert.equal(expected.leftEffectTimes,actual.totalEffectTimes);assert.equal(expected.executionCalls,1);
  }
});
test('per-target live reads, clamping and crit forwarding match original binding observations',()=>{
  for(const {input,expected} of evidence('original-active-damage-binding').fixtures){
    const scheduler=new ResearchEffectOrder(),events=[],attacks=[];let n=0;
    enqueueActiveDamage({scheduler,initialParameters:[0,input.values.length,0,7.5],plus:0,per:0,
      isTargetDead:()=>input.dead,readParameters:()=>{events.push('GenParams');return [input.values[n++]];},
      resolveDamage:(base,paraPlus)=>{events.push({GetRealDmg:base,paraPlus});return base;},readCrit:()=>input.crit,
      applyHit:({damageVal,isCrit})=>{events.push('BeHit');attacks.push({damageVal,isCrit});return null;}});
    scheduler.run();assert.deepEqual({events,attacks},expected);
  }
});
test('child state changes affect later hits while initialized repeat count and bonus stay fixed',()=>{
  const scheduler=new ResearchEffectOrder();let base=10;
  const report=enqueueActiveDamage({scheduler,initialParameters:[10,3,0,7.5],plus:0,per:0,isTargetDead:()=>false,
    readParameters:()=>[base,99,0,999],resolveDamage:(value,bonus)=>value+bonus,readCrit:()=>false,
    applyHit:attack=>{scheduler.enqueue(()=>{base+=10;});return {applied:attack.damageVal};}});
  scheduler.run();assert.deepEqual(report.trace.map(t=>t.attack.damageVal),[17.5,27.5,37.5]);assert.equal(report.paraPlus,7.5);
});
test('dead target stops future parameter evaluation and unsupported state-add inputs reject',()=>{
  const scheduler=new ResearchEffectOrder();let dead=false,reads=0;
  const report=enqueueActiveDamage({scheduler,initialParameters:[10,3],plus:0,per:0,isTargetDead:()=>dead,
    readParameters:()=>{reads++;return [10];},resolveDamage:x=>x,readCrit:()=>false,applyHit:()=>{dead=true;return null;}});
  scheduler.run();assert.equal(reads,1);assert.equal(report.trace.length,1);assert.ok(report.stop);
  assert.throws(()=>enqueueActiveDamage({initialParameters:[1,2,3,4,5]}));
});
