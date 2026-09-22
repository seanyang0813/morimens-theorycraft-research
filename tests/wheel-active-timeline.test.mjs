import test from 'node:test';
import assert from 'node:assert/strict';
import {runWheelActiveTimeline} from '../engine/wheel-active-timeline.mjs';

const hit=id=>({id,type:'ACTIVE_HIT',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
const input=()=>({schemaVersion:1,kind:'morimens-wheel-active-timeline',build:'pc-res144-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',initialWheelState:{doomsday:{refinementLevel:3,ownerAttack:1000,counter:0,baseStrikecardDamagePlus:0,wheelStrikecardDamagePlus:0},light:null,arachne:{ownerUid:56,baseBasicDamagePer:0,wheelBasicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]}},baseCasterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,strikecard_damage_plus:0},basePlayerProperties:{dimension_fix_per:0,basic_damage_per:0},initialTargetProperties:{hp:5000,max_hp:5000,block:0,be_damage_per:0,vulnerable_per:0},steps:[hit('strike-1'),{id:'after-strike-1',type:'AFTER_USE_CARD',cardType:'Card_Strike'},hit('strike-2'),{id:'after-arachne-pursuit',type:'AFTER_PURSUIT',pursuitOwnerUid:56},hit('strike-3')]});

test('ordered Wheel events change only later Active hits',()=>{
  const value=input(),copy=JSON.stringify(value),result=runWheelActiveTimeline(value),hits=result.trace.filter(row=>row.type==='ACTIVE_HIT');
  assert.deepEqual(hits.map(row=>row.result.preHitDamage),[100,350,405]);
  assert.deepEqual(hits.map(row=>row.appliedWheelProperties),[{strikecardDamagePlus:0,basicDamagePer:0},{strikecardDamagePlus:250,basicDamagePer:0},{strikecardDamagePlus:250,basicDamagePer:55}]);
  assert.equal(result.modeledHpLost,855);assert.equal(result.targetAfter.hp,4145);assert.equal(result.finalWheelState.doomsday.strikecardDamagePlus,250);assert.equal(result.finalWheelState.arachne.basicDamagePer,55);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),copy);
});

test('turn end clears temporary damage properties while preserving Rota trigger usage',()=>{
  const value=input();value.steps=[{id:'pursuit',type:'AFTER_PURSUIT',pursuitOwnerUid:56},hit('amplified'),{id:'turn-end',type:'AFTER_BOUT_END'},hit('reset')];
  const result=runWheelActiveTimeline(value),hits=result.trace.filter(row=>row.type==='ACTIVE_HIT');
  assert.deepEqual(hits.map(row=>row.result.preHitDamage),[155,100]);
  assert.deepEqual(result.finalWheelState.arachne.wheels.map(row=>row.triggersUsed),[0,1]);assert.equal(result.finalWheelState.arachne.basicDamagePer,0);
});

test('Wheel Active timeline fails closed for inconsistent baselines and inferred event shapes',()=>{
  const mismatch=input();mismatch.baseCasterProperties.strikecard_damage_plus=1;assert.throws(()=>runWheelActiveTimeline(mismatch),/must match/);
  const extra=input();extra.steps[0].emitsAfterUse=true;assert.throws(()=>runWheelActiveTimeline(extra),/exact fields/);
  const absent=input();absent.initialWheelState.arachne=null;assert.throws(()=>runWheelActiveTimeline(absent),/Arachne Wheel state/);
  const duplicate=input();duplicate.steps[1].id='strike-1';assert.throws(()=>runWheelActiveTimeline(duplicate),/unique IDs/);
});
