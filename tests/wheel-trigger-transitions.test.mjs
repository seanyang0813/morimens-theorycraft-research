import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit} from '../engine/wheel-trigger-transitions.mjs';

test('Doomsday adds a post-use Strike layer without retroactively changing the triggering Strike',()=>{
  const input={schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:'pc-res144-build51',wheelId:'wheel-0029',refinementLevel:3,cardType:'Card_Strike',ownerAttack:1001,counter:2,strikecardDamagePlus:501};
  const result=advanceDoomsdayAfterUseCard(input);
  assert.deepEqual(result.damageSnapshot,{counter:2,strikecardDamagePlus:501});
  assert.equal(result.transition.addedStrikecardDamagePlus,251);
  assert.equal(result.transition.counterAfter,3);
  assert.equal(result.transition.strikecardDamagePlusAfter,752);
  assert.equal(result.finalDamage,null);
});

test('Doomsday ignores non-Strike cards and respects the eight-trigger cap',()=>{
  const base={schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:'pc-res144-build51',wheelId:'wheel-0029',refinementLevel:3,cardType:'Card_Skill',ownerAttack:1000,counter:7,strikecardDamagePlus:1750};
  assert.equal(advanceDoomsdayAfterUseCard(base).transition.addedStrikecardDamagePlus,0);
  const capped=advanceDoomsdayAfterUseCard({...base,cardType:'Card_Strike',counter:8});
  assert.equal(capped.transition.counterAfter,8);assert.equal(capped.transition.strikecardDamagePlusAfter,1750);
});

test('Light of Intellect requests one matching Strike and always consumes its turn marker',()=>{
  const base={schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:'pc-res144-build51',wheelId:'wheel-0117',refinementLevel:3,counter:0,roll:100,matchingStrikeAvailable:true};
  let result=advanceLightOfIntellectAfterKeeperSkill(base);
  assert.equal(result.transition.chancePercent,100);assert.equal(result.transition.movedCardCount,1);assert.equal(result.transition.counterAfter,1);
  result=advanceLightOfIntellectAfterKeeperSkill({...base,matchingStrikeAvailable:false});
  assert.equal(result.transition.conditionPassed,true);assert.equal(result.transition.moveRequested,true);assert.equal(result.transition.movedCardCount,0);assert.equal(result.transition.counterAfter,1);
});

test('Light of Intellect lower refinements retain the random gate and once-per-turn cap',()=>{
  const base={schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:'pc-res144-build51',wheelId:'wheel-0117',refinementLevel:0,counter:0,roll:56,matchingStrikeAvailable:true};
  assert.equal(advanceLightOfIntellectAfterKeeperSkill(base).transition.conditionPassed,false);
  const alreadyUsed=advanceLightOfIntellectAfterKeeperSkill({...base,roll:1,counter:1});
  assert.equal(alreadyUsed.transition.movedCardCount,0);assert.equal(alreadyUsed.transition.counterAfter,1);
});

test('Arachne two-Wheel loadout adds independent pursuit amplification counters',()=>{
  const input={schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:'pc-res144-build51',ownerUid:56,pursuitOwnerUid:56,basicDamagePer:150,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:4}]};
  const result=advanceArachneAfterPursuit(input);
  assert.equal(result.addedBasicDamagePer,55);assert.equal(result.basicDamagePerAfter,205);
  assert.deepEqual(result.transitions.map(row=>row.triggersUsedAfter),[1,5]);
});

test('Mouchette-owned pursuit cannot trigger Arachne-owned Wheels and each cap is separate',()=>{
  const base={schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:'pc-res144-build51',ownerUid:56,pursuitOwnerUid:33,basicDamagePer:150,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:5}]};
  assert.equal(advanceArachneAfterPursuit(base).addedBasicDamagePer,0);
  const mixed=advanceArachneAfterPursuit({...base,pursuitOwnerUid:56});
  assert.equal(mixed.addedBasicDamagePer,40);assert.deepEqual(mixed.transitions.map(row=>row.triggersUsedAfter),[1,5]);
});
