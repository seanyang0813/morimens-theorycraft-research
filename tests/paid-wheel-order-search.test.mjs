import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPaidWheelOrders} from '../engine/paid-wheel-order-search.mjs';
import {readFileSync} from 'node:fs';

const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:true,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
const hit=(id,baseValue)=>({id,type:'ACTIVE_HIT',baseValue,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
const action=(id,baseValue,pursuit=false)=>({id,cardInstanceId:`card-${id}`,cardType:'Card_Strike',costInput:{cfgCost:'1',originCost:1,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:{...conditions},effects:[hit(`${id}:hit`,baseValue),...(pursuit?[{id:`${id}:pursuit`,type:'AFTER_PURSUIT',pursuitOwnerUid:56}]:[])]});
const timeline=()=>({schemaVersion:1,kind:'morimens-paid-wheel-active-timeline',build:'pc-res144-build51',initialEnergy:2,snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',initialWheelState:{doomsday:{refinementLevel:3,ownerAttack:1000,counter:0,baseStrikecardDamagePlus:0,wheelStrikecardDamagePlus:0},light:null,arachne:{ownerUid:56,baseBasicDamagePer:0,wheelBasicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]}},baseCasterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,strikecard_damage_plus:0},basePlayerProperties:{dimension_fix_per:0,basic_damage_per:0},initialTargetProperties:{hp:5000,max_hp:5000,block:0,be_damage_per:0,vulnerable_per:0},actions:[action('big',500),action('setup',100,true)]});
const request=value=>({schemaVersion:1,kind:'morimens-paid-wheel-order-search',objective:'MAX_MODELED_HP_LOST',timeline:value,maxEvaluations:10,returnTop:5});

test('paid Wheel search finds the supplied setup-before-burst order',()=>{
  const result=searchPaidWheelOrders(request(timeline()));
  assert.equal(result.evaluatedPermutations,2);assert.equal(result.completePermutations,2);assert.equal(result.optimalWithinEnumeratedSet,true);assert.deepEqual(result.best.order,['setup','big']);assert.equal(result.best.modeledHpLost,1125);assert.deepEqual(result.topEligible.map(row=>row.modeledHpLost),[1125,850]);assert.equal(result.best.result.finalWheelState.arachne.basicDamagePer,55);assert.equal(result.finalDamage,null);
});

test('paid Wheel search rejects partial enumeration, duplicate IDs and unsupported objectives',()=>{
  const value=timeline();value.actions.push(action('third',10));assert.throws(()=>searchPaidWheelOrders({...request(value),maxEvaluations:5}),/needs 6 evaluations/);
  value.actions[2].id='big';assert.throws(()=>searchPaidWheelOrders(request(value)),/unique/);
  assert.throws(()=>searchPaidWheelOrders({...request(timeline()),objective:'GLOBAL_OPTIMUM'}),/Unsupported/);
});

test('paid Wheel search preserves different caster snapshots while permuting actions',()=>{
  const multi=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-multi-caster-wheel-active-timeline.json',import.meta.url))).input,[mouchette,,pursuit,arachne]=multi.steps;arachne.baseValue=500;
  const resource=(id,effects)=>({id,cardInstanceId:`card-${id}`,cardType:'Card_Strike',costInput:{cfgCost:'1',originCost:1,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:{...conditions},effects});
  const paid={schemaVersion:2,kind:'morimens-paid-wheel-active-timeline',build:multi.build,initialEnergy:2,snapshotStage:multi.snapshotStage,snapshotCompleteness:multi.snapshotCompleteness,initialWheelContributions:multi.initialWheelContributions,initialTargetProperties:multi.initialTargetProperties,actions:[resource('big',[arachne]),resource('setup',[mouchette,pursuit])]};
  const result=searchPaidWheelOrders(request(paid));assert.deepEqual(result.best.order,['setup','big']);assert.deepEqual(result.topEligible.map(row=>row.modeledHpLost),[1415,1140]);assert.equal(result.best.result.wheelStateSemantics,'SHARED_WHEEL_CONTRIBUTIONS');
});
