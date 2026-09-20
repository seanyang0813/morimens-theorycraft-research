import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTargetDamageEligibility} from '../engine/target-damage-eligibility.mjs';

const base=()=>({targetBattleTag:null,targetStateIds:[]});
test('monster battle tags select the same overlapping property buckets as client data',()=>{
  assert.deepEqual(resolveTargetDamageEligibility({...base(),targetBattleTag:'Boss'}).monsterTypeDamageProperties,['damage_per2monster_boss']);
  assert.deepEqual(resolveTargetDamageEligibility({...base(),targetBattleTag:'MonsterGrade1'}).monsterTypeDamageProperties,['damage_per2monster_normal','damage_per2monster_grade1']);
  assert.deepEqual(resolveTargetDamageEligibility({...base(),targetBattleTag:'MonsterGrade2'}).monsterTypeDamageProperties,['damage_per2monster_normal','damage_per2monster_grade2']);
});
test('all ten configured state-damage rules and the shared barrier state derive from live IDs',()=>{
  const stateIds=[3469,2934,3068,2564,3792,80445,89575,90659,90650,126417,3638],result=resolveTargetDamageEligibility({...base(),targetStateIds:stateIds});
  assert.deepEqual(result.targetStateDamageProperties,['damage_per2enemy_has_weak','damage_per2enemy_has_vulnerable','damage_per2enemy_has_posion','damage_per2enemy_has_frail','damage_per2petrify_resist','damage_per2enemy_has_sculptor','damage_per2enemy_has_mutated','damage_per2enemy_has_snow','damage_per2enemy_has_blood','damage_per2enemy_has_special1']);
  assert.equal(result.targetBlockBarrierStatePresent,true);assert.equal(result.targetHasBuff,true);assert.equal(result.targetHasDebuff,true);
});
test('unknown states are inert and malformed capture context fails closed',()=>{
  assert.throws(()=>resolveTargetDamageEligibility({...base(),targetStateIds:[999999]}),/Unknown PC144 state ID/);
  for(const value of [{...base(),targetStateIds:[1,1]},{...base(),targetStateIds:[0]},{...base(),targetBattleTag:''},{...base(),extra:true}])assert.throws(()=>resolveTargetDamageEligibility(value));
});
