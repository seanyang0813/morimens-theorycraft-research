import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSnapshotActiveDamage} from '../engine/battle-property-snapshot-damage.mjs';

const build='pc-res144-build51';
const base=()=>({schemaVersion:1,kind:'morimens-battle-property-snapshot-damage',build,snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],
  casterProperties:{crit:100,crit_damage:50,crit_damage_from_strikecard:10,crit_damage_per:0,damage_per2monster_boss:20,damage_per2buff_enemy:5,damage_per2enemy_has_vulnerable:10},
  playerProperties:{dimension_fix_per:0},targetProperties:{hp:100,max_hp:100,block:0,be_damage_per:10,vulnerable_per:50},
  cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},
  targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[2934,49270]}});
test('complete live property maps feed recovered offense and target reads without invented fields',()=>{
  const input=base(),saved=JSON.stringify(input),result=calculateSnapshotActiveDamage(input);
  assert.equal(result.offense.showDamage,100);assert.equal(result.preHitDamage,366);assert.equal(result.finalDamage,null);
  assert.equal(result.targetInputs.enemyStateDmgMultiplier,1.1);assert.equal(result.targetInputs.enemyTypeDmgPer,20);assert.equal(result.targetInputs.enemyBuffDmgPer,5);
  assert.equal(result.critResolution.isCrit,true);assert.equal(result.critResolution.critChanceCeil,100);assert.equal(result.critResolution.rngConsumed,true);
  assert.ok(result.reads.some(read=>read.property==='o_damage_per'&&!read.present&&read.value===0));assert.equal(JSON.stringify(input),saved);
});
test('RNG-dependent crits require a captured pre-outcome roll',()=>{
  const input=base();input.casterProperties.crit=50;
  assert.throws(()=>calculateSnapshotActiveDamage(input),/captured pre-outcome roll/);
  input.targetContext.critRoll=50;assert.equal(calculateSnapshotActiveDamage(input).targetInputs.isCrit,true);
  input.targetContext.critRoll=51;assert.equal(calculateSnapshotActiveDamage(input).targetInputs.isCrit,false);
});
test('captured instruction-card properties enter card offense, crit and target branches',()=>{
  const input=base();input.cardContext={present:true,instructionCard:true,stateTriggerAdd:false};input.targetContext.targetStateIds.push(3638);
  Object.assign(input.casterProperties,{i_damage_per_card:10,o_damage_per_card:20,awaker_CmdCard_dmg_per:30,card_damage_per3_n2:40,card_crit_damage:5});
  input.cardProperties={card_damage_per:10,card_damage_plus:5,card_strength_multiple:0,card_damage_per2:20,card_damage_per3:30,o_damage_per_strikecard_limit:0,crit_damage:10,card_damage_per2block_barrier:15};
  input.targetProperties.be_damage_per5=25;
  const result=calculateSnapshotActiveDamage(input);
  assert.equal(result.targetInputs.cardCritDamage,10);assert.equal(result.targetInputs.awakerCardCritDamage,5);assert.equal(result.targetInputs.beDamagePer5,25);assert.equal(result.targetInputs.cardBlockBarrierPer,15);
  assert.equal(result.resolvedUtilityInputs.cardDamagePer2,20);assert.equal(result.resolvedUtilityInputs.cardDamagePer3,30);assert.equal(result.resolvedUtilityInputs.card_damage_per3_n2,40);assert.ok(result.preHitDamage>366);
});
test('raw roleData maps apply the original constructor ceil once before formula reads',()=>{
  const input=base();input.snapshotStage='roleData.properties-before-constructor';input.casterProperties.crit_damage=49.1;
  const result=calculateSnapshotActiveDamage(input);
  assert.equal(result.targetInputs.awakerCritDamage,50);assert.ok(result.constructorTrace.caster.some(row=>row.property==='crit_damage'&&row.stored===50));
});
test('partial claims, unknown dynamic selectors and malformed property values fail closed',()=>{
  const input=base();
  for(const mutate of [v=>v.snapshotCompleteness='partial',v=>v.targetContext.targetStateIds=[-1],v=>v.targetContext.targetBattleTag='',v=>v.casterProperties.crit_damage=NaN,v=>v.tags.push('Card_Strike'),v=>v.cardContext.stateTriggerAdd=true,v=>{v.cardContext.present=false;v.cardContext.instructionCard=true;}]){
    const bad=JSON.parse(JSON.stringify(input));mutate(bad);assert.throws(()=>calculateSnapshotActiveDamage(bad));
  }
});
