import test from 'node:test';
import assert from 'node:assert/strict';
import {runPaidWheelActiveTimeline} from '../engine/paid-wheel-active-timeline.mjs';
import {readFileSync} from 'node:fs';

const conditions=strike=>({cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0});
const hit=id=>({id,type:'ACTIVE_HIT',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
const action=(id,cost)=>({id,cardInstanceId:`card-${id}`,cardType:'Card_Strike',costInput:{cfgCost:String(cost),originCost:cost,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:conditions(true),effects:[hit(`${id}:hit`)]});
const input=()=>({schemaVersion:1,kind:'morimens-paid-wheel-active-timeline',build:'pc-res144-build51',initialEnergy:4,snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',initialWheelState:{doomsday:{refinementLevel:3,ownerAttack:1000,counter:0,baseStrikecardDamagePlus:0,wheelStrikecardDamagePlus:0},light:null,arachne:null},baseCasterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,strikecard_damage_plus:0},basePlayerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:2000,max_hp:2000,block:0,be_damage_per:0,vulnerable_per:0},actions:[action('one',2),action('two',2)]});

test('accepted paid Strikes deal damage before their automatic Doomsday event',()=>{
  const value=input(),copy=JSON.stringify(value),result=runPaidWheelActiveTimeline(value);
  assert.equal(result.completed,true);assert.equal(result.acceptedActions,2);assert.equal(result.energyAfter,0);assert.equal(result.modeledHpLost,450);
  assert.deepEqual(result.trace.map(row=>row.effect.trace.filter(step=>step.type==='ACTIVE_HIT')[0].result.preHitDamage),[100,350]);
  assert.deepEqual(result.trace.map(row=>row.effect.trace.at(-1).id),['one:after-use','two:after-use']);assert.equal(result.finalWheelState.doomsday.strikecardDamagePlus,500);assert.equal(JSON.stringify(value),copy);
});

test('rejected card exposes neither hit nor Doomsday transition',()=>{
  const value=input();value.initialEnergy=2;const result=runPaidWheelActiveTimeline(value);
  assert.equal(result.completed,false);assert.equal(result.acceptedActions,1);assert.equal(result.trace[1].effect,null);assert.equal(result.modeledHpLost,100);assert.equal(result.finalWheelState.doomsday.counter,1);assert.equal(result.finalWheelState.doomsday.strikecardDamagePlus,250);
});

test('paid action carries an explicit Arachne pursuit event into the next card',()=>{
  const value=input();value.initialWheelState.arachne={ownerUid:56,baseBasicDamagePer:0,wheelBasicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]};value.basePlayerProperties.basic_damage_per=0;value.actions[0].effects.push({id:'one:after-pursuit',type:'AFTER_PURSUIT',pursuitOwnerUid:56});
  const result=runPaidWheelActiveTimeline(value);assert.equal(result.modeledHpLost,505);assert.equal(result.trace[1].effect.trace[0].result.preHitDamage,405);assert.equal(result.finalWheelState.arachne.basicDamagePer,55);
});

test('paid Wheel actions fail closed for mismatched card type and invalid suffix effects',()=>{
  const mismatch=input();mismatch.actions[0].cardType='Card_Skill';assert.throws(()=>runPaidWheelActiveTimeline(mismatch),/must agree/);
  const invalid=input();invalid.initialEnergy=0;invalid.actions[1].effects.push({id:'bad',type:'AFTER_BOUT_END'});assert.throws(()=>runPaidWheelActiveTimeline(invalid),/only explicit Active hits/);
  const duplicate=input();duplicate.actions[1].effects[0].id=duplicate.actions[0].effects[0].id;assert.throws(()=>runPaidWheelActiveTimeline(duplicate),/unique/);
});

test('schema 2 pays different casters while carrying only shared Wheel contributions',()=>{
  const multi=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-multi-caster-wheel-active-timeline.json',import.meta.url))).input,[mouchette,,pursuit,arachne]=multi.steps;
  const paid={schemaVersion:2,kind:'morimens-paid-wheel-active-timeline',build:multi.build,initialEnergy:2,snapshotStage:multi.snapshotStage,snapshotCompleteness:multi.snapshotCompleteness,initialWheelContributions:multi.initialWheelContributions,initialTargetProperties:multi.initialTargetProperties,actions:[{id:'mouchette-card',cardInstanceId:'card-m',cardType:'Card_Strike',costInput:{cfgCost:'1',originCost:1,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:conditions(true),effects:[mouchette,pursuit]},{id:'arachne-card',cardInstanceId:'card-a',cardType:'Card_Strike',costInput:{cfgCost:'1',originCost:1,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:conditions(true),effects:[arachne]}]};
  const result=runPaidWheelActiveTimeline(paid);assert.equal(result.schemaVersion,2);assert.equal(result.wheelStateSemantics,'SHARED_WHEEL_CONTRIBUTIONS');assert.equal(result.acceptedActions,2);assert.equal(result.energyAfter,0);assert.equal(result.modeledHpLost,595);
  assert.deepEqual(result.trace.map(row=>row.effect.trace.find(step=>step.type==='ACTIVE_HIT').result.preHitDamage),[110,485]);assert.equal(result.finalWheelState.doomsday.strikecardDamagePlus,500);assert.equal(result.finalWheelState.arachne.basicDamagePer,55);
  paid.initialEnergy=1;const rejected=runPaidWheelActiveTimeline(paid);assert.equal(rejected.acceptedActions,1);assert.equal(rejected.modeledHpLost,110);assert.equal(rejected.trace[1].effect,null);assert.equal(rejected.finalWheelState.doomsday.strikecardDamagePlus,250);
});
