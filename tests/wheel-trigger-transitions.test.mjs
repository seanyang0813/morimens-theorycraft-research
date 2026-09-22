import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDoomsdayAfterUseCard,advanceArachneAfterPursuit} from '../engine/wheel-trigger-transitions.mjs';

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
