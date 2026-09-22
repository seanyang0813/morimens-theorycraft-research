import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWheelActiveTimelines} from '../engine/wheel-active-comparison.mjs';

const hit=id=>({id,type:'ACTIVE_HIT',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
const timeline=()=>({schemaVersion:1,kind:'morimens-wheel-active-timeline',build:'pc-res144-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',initialWheelState:{doomsday:{refinementLevel:3,ownerAttack:1000,counter:0,baseStrikecardDamagePlus:0,wheelStrikecardDamagePlus:0},light:null,arachne:null},baseCasterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,strikecard_damage_plus:0},basePlayerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:2000,max_hp:2000,block:0,be_damage_per:0,vulnerable_per:0},steps:[hit('strike-1'),{id:'after-strike-1',type:'AFTER_USE_CARD',cardType:'Card_Strike'},hit('strike-2')]});

test('Wheel comparison aligns stable steps and explains an order-only damage difference',()=>{
  const baseline=timeline(),candidate=timeline();candidate.steps=[candidate.steps[0],candidate.steps[2],candidate.steps[1]];
  const result=compareWheelActiveTimelines({schemaVersion:1,kind:'morimens-wheel-active-comparison',baseline,candidate});
  assert.equal(result.orderChanged,true);assert.equal(result.orderOnly,true);assert.equal(result.inputChanges.length,0);assert.equal(result.modeledHpLostDelta,-250);
  const second=result.alignedSteps.find(row=>row.id==='strike-2');assert.equal(second.baseline.preHitDamage,350);assert.equal(second.candidate.preHitDamage,100);assert.equal(second.delta.preHitDamage,-250);assert.equal(second.delta.strikeFlatBefore,-250);assert.equal(result.finalDamage,null);
});

test('Wheel comparison records changed inputs separately and pins a verified runtime',()=>{
  const baseline=timeline(),candidate=timeline();candidate.steps[2].baseValue=200;const fingerprint='a'.repeat(64);
  const result=compareWheelActiveTimelines({schemaVersion:1,kind:'morimens-wheel-active-comparison',baseline,candidate},{runtimeFingerprint:fingerprint});
  assert.equal(result.orderChanged,false);assert.equal(result.orderOnly,false);assert.equal(result.reproducibility,'RUNTIME_PINNED');assert.deepEqual(result.inputChanges.map(row=>row.path),['/steps/strike-2/baseValue']);
  assert.throws(()=>compareWheelActiveTimelines({...result.experiment,runtimeFingerprint:'b'.repeat(64)},{runtimeFingerprint:fingerprint}),/fingerprint mismatch/);
});

test('Wheel comparison rejects loose contracts and mismatched step types',()=>{
  const baseline=timeline(),candidate=timeline();candidate.steps[2]={id:'strike-2',type:'AFTER_BOUT_END'};
  const changed=compareWheelActiveTimelines({schemaVersion:1,kind:'morimens-wheel-active-comparison',baseline,candidate});assert.equal(changed.alignedSteps.find(row=>row.id==='strike-2').delta,null);
  assert.throws(()=>compareWheelActiveTimelines({schemaVersion:1,kind:'morimens-wheel-active-comparison',baseline,candidate,extra:true}),/exact version 1/);
});
