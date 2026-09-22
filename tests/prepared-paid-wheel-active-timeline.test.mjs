import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedPaidWheelActiveTimeline} from '../engine/prepared-paid-wheel-active-timeline.mjs';
import {searchPaidWheelOrders} from '../engine/paid-wheel-order-search.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const loaded=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,read(name)]));
const source={build:'pc-res144-build51',skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};
const readCurrent=name=>{const bytes=readFileSync(new URL(`../research/observations/current-res150-build51/modules/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const currentLoaded=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,readCurrent(name)]));
const currentSource={build:'pc-res150-build51',skills:currentLoaded.Skill.data,battleApi:currentLoaded.BattleApi.data,commands:currentLoaded.Cmd.data,states:currentLoaded.State.data,sourceHashes:Object.fromEntries(Object.entries(currentLoaded).map(([name,row])=>[name,row.sha256]))};
const readInstalled=name=>{const bytes=readFileSync(new URL(`../research/observations/current-res151-build51/modules/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const installedLoaded=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,readInstalled(name)]));
const installedSource={build:'pc-res151-build51',skills:installedLoaded.Skill.data,battleApi:installedLoaded.BattleApi.data,commands:installedLoaded.Cmd.data,states:installedLoaded.State.data,sourceHashes:Object.fromEntries(Object.entries(installedLoaded).map(([name,row])=>[name,row.sha256]))};
const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:true,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
const preparedSkill=(skillId,casterProperties,preparation)=>({schemaVersion:1,kind:'morimens-prepared-snapshot-active-skill',build:'pc-res144-build51',preparation:{skillId,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{},conditionResults:{},stateQueries:{},...preparation},targetBinding:{expression:'FrontEnemy',resolution:'supplied-single-UpperTarget'},lifecycle:'assumed-absent',snapshot:{snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',casterProperties,playerProperties:{dimension_fix_per:0,basic_damage_per:0},initialTargetProperties:{hp:5000,max_hp:5000,block:0,be_damage_per:0,vulnerable_per:0},cardProperties:{},targetBattleTag:'Monster',targetStateIds:[],critRolls:[null]},repeatModifiers:{plus:0,per:0}});
const resource=(id,preparedSkillValue,postEvents=[])=>({id,cardInstanceId:`card-${id}`,costInput:{cfgCost:'1',originCost:1,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:{...conditions},preparedSkill:preparedSkillValue,postEvents});
const input=()=>({schemaVersion:1,kind:'morimens-prepared-paid-wheel-active-timeline',build:'pc-res144-build51',initialEnergy:2,wheelContributionPolicy:'excluded-from-prepared-snapshots',initialWheelContributions:{doomsday:{refinementLevel:3,ownerAttack:100,counter:0,strikecardDamagePlus:0},light:null,arachne:{ownerUid:56,basicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]}},actions:[resource('setup',preparedSkill(3997,{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,strikecard_damage_plus:0}),[{id:'setup:pursuit',type:'AFTER_PURSUIT',pursuitOwnerUid:56}]),resource('burst',preparedSkill(4808,{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,strikecard_damage_plus:0},{variables:{BattleAtkForce:100,'CmdCaster.death_resist':0,'PlayerRole.block':10},stateQueries:{'CmdCaster.GetStateLayer':{'119802':0,'2537':0}}}))]});

test('catalog-derived paid cards retain caster snapshots and shared Wheel state',()=>{
  const value=input(),copy=JSON.stringify(value),result=runPreparedPaidWheelActiveTimeline(value,source);
  assert.deepEqual(result.preparedActions.map(row=>[row.skillId,row.commandId,row.cardType]),[[3997,2350,'Card_Strike'],[4808,1059,'Card_Strike']]);assert.deepEqual(result.preparedActions.map(row=>row.derivedHitIds.length),[1,1]);
  assert.equal(result.calculation.acceptedActions,2);assert.equal(result.energyAfter,0);assert.equal(result.modeledHpLost,139);assert.deepEqual(result.calculation.trace.map(row=>row.effect.trace.find(step=>step.type==='ACTIVE_HIT').result.preHitDamage),[1,138]);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),copy);
  const search=searchPaidWheelOrders({schemaVersion:1,kind:'morimens-paid-wheel-order-search',objective:'MAX_MODELED_HP_LOST',timeline:result.derivedTimelineInput,maxEvaluations:10,returnTop:2});assert.deepEqual(search.best.order,['setup','burst']);assert.deepEqual(search.topEligible.map(row=>row.modeledHpLost),[139,106]);
});

test('prepared paid Wheel bridge rejects target drift, hidden Wheel contribution and unsupported prepared suffix',()=>{
  const drift=input();drift.actions[1].preparedSkill.snapshot.initialTargetProperties.hp=4999;assert.throws(()=>runPreparedPaidWheelActiveTimeline(drift,source),/same pre-sequence target/);
  const policy=input();policy.wheelContributionPolicy='maybe-included';assert.throws(()=>runPreparedPaidWheelActiveTimeline(policy,source),/prepared paid Wheel timeline/);
  const mixed=input();mixed.actions[1].preparedSkill.schemaVersion=2;assert.throws(()=>runPreparedPaidWheelActiveTimeline(mixed,source),/one supported catalog Active skill/);
});

test('current resource-150 catalog derives the same bounded paid action fixture',()=>{
  const value=input();value.build='pc-res150-build51';for(const action of value.actions)action.preparedSkill.build=value.build;
  const result=runPreparedPaidWheelActiveTimeline(value,currentSource);
  assert.deepEqual(result.preparedActions.map(row=>[row.skillId,row.commandId,row.cardType]),[[3997,2350,'Card_Strike'],[4808,1059,'Card_Strike']]);assert.equal(result.modeledHpLost,139);assert.equal(result.calculation.trace[0].effect.trace.at(-1).result.ownerAttackSourceProperty,'AtkForce');
});

test('installed resource-151 catalog derives the same bounded paid Wheel fixture',()=>{
  const value=input();value.build='pc-res151-build51';for(const action of value.actions)action.preparedSkill.build=value.build;
  const result=runPreparedPaidWheelActiveTimeline(value,installedSource);
  assert.deepEqual(result.preparedActions.map(row=>[row.skillId,row.commandId,row.cardType]),[[3997,2350,'Card_Strike'],[4808,1059,'Card_Strike']]);assert.equal(result.modeledHpLost,139);assert.equal(result.energyAfter,0);assert.equal(result.calculation.trace[0].effect.trace.at(-1).result.ownerAttackSourceProperty,'AtkForce');
});
