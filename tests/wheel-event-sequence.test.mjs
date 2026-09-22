import test from 'node:test';
import assert from 'node:assert/strict';
import {runWheelEventSequence} from '../engine/wheel-event-sequence.mjs';

const initial=()=>({doomsday:{refinementLevel:3,ownerAttack:1000,counter:0,baseStrikecardDamagePlus:50,wheelStrikecardDamagePlus:0},light:{refinementLevel:3,counter:0},arachne:{ownerUid:56,baseBasicDamagePer:150,wheelBasicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]}});

test('ordered Wheel sequence carries post-event properties into later steps',()=>{
  const result=runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:'pc-res144-build51',initialState:initial(),steps:[{id:'strike-1',type:'AFTER_USE_CARD',cardType:'Card_Strike'},{id:'strike-2',type:'AFTER_USE_CARD',cardType:'Card_Strike'},{id:'arachne-pursuit',type:'AFTER_PURSUIT',pursuitOwnerUid:56},{id:'keeper',type:'AFTER_KEEPER_SKILL',roll:100,matchingStrikeAvailable:true}]});
  assert.equal(result.trace[0].before.doomsday.strikecardDamagePlus,50);assert.equal(result.trace[0].after.doomsday.strikecardDamagePlus,300);
  assert.equal(result.trace[1].before.doomsday.strikecardDamagePlus,300);assert.equal(result.finalState.doomsday.strikecardDamagePlus,550);
  assert.equal(result.finalState.arachne.basicDamagePer,205);assert.equal(result.finalState.light.counter,1);assert.equal(result.finalDamage,null);
});

test('turn end clears temporary properties and per-turn counters but preserves Rota battle counter',()=>{
  const start=initial();start.doomsday.counter=2;start.doomsday.wheelStrikecardDamagePlus=500;start.light.counter=1;start.arachne.wheelBasicDamagePer=110;start.arachne.wheels[0].triggersUsed=2;start.arachne.wheels[1].triggersUsed=2;
  const result=runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:'pc-res144-build51',initialState:start,steps:[{id:'turn-end',type:'AFTER_BOUT_END'},{id:'next-pursuit',type:'AFTER_PURSUIT',pursuitOwnerUid:56},{id:'battle-end',type:'BEFORE_BATTLE_END'}]});
  const turn=result.trace[0].after;assert.equal(turn.doomsday.counter,0);assert.equal(turn.doomsday.strikecardDamagePlus,50);assert.equal(turn.light.counter,0);assert.equal(turn.arachne.basicDamagePer,150);assert.deepEqual(turn.arachne.wheels.map(row=>row.triggersUsed),[0,2]);
  assert.deepEqual(result.trace[1].after.arachne.wheels.map(row=>row.triggersUsed),[1,3]);assert.deepEqual(result.finalState.arachne.wheels.map(row=>row.triggersUsed),[0,0]);
});

test('sequence fails closed for absent state, loose steps and duplicate IDs',()=>{
  const base={schemaVersion:1,kind:'morimens-wheel-event-sequence',build:'pc-res144-build51',initialState:{doomsday:null,light:null,arachne:null},steps:[{id:'x',type:'AFTER_USE_CARD',cardType:'Card_Strike'}]};
  assert.throws(()=>runWheelEventSequence(base),/Doomsday state/);
  assert.throws(()=>runWheelEventSequence({...base,steps:[{id:'x',type:'AFTER_BOUT_END',extra:1}]}),/unknown fields/);
  assert.throws(()=>runWheelEventSequence({...base,steps:[{id:'x',type:'AFTER_BOUT_END'},{id:'x',type:'AFTER_BOUT_END'}]}),/unique IDs/);
});
