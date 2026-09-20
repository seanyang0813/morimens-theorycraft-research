import test from 'node:test';
import assert from 'node:assert/strict';
import {oldEmbersCommand} from '../engine/old-embers.mjs';
const base = {build:'pc-res144-build51', damageType:'ACTIVE', castDamage:3, remainingStacks:10,
  triggerEligible:true, hasState66314:false, hasState62317:false, targetHpIsZero:false,
  immueChangeHp:0, beChangeHpLimit:0};
const calc = overrides => oldEmbersCommand({...base, ...overrides});

test('odd half-trigger rounds signed HP and stack subtraction separately', () => {
  for (const damageType of ['FIXED', 'PASSIVE']) {
    const r = calc({damageType});
    assert.equal(r.triggerAmount, 1.5); assert.equal(r.hpChangeRequest, -4);
    assert.equal(r.stacksConsumed, 2); assert.equal(r.remainingStacks, 8);
    assert.equal(r.finalDamage, null); assert.equal(r.status, 'UNVERIFIED');
  }
});
test('resource exhaustion caps the selected argument before HP multiplication', () => {
  const r = calc({castDamage:100, remainingStacks:2});
  assert.equal(r.hpChangeRequest, -6); assert.equal(r.remainingStacks, 0);
});
test('effect-level immunity, caps and HP-zero skip do not cancel later stack command', () => {
  for (const [overrides, expected] of [[{immueChangeHp:1},0], [{beChangeHpLimit:2},-2], [{targetHpIsZero:true},null]]) {
    const r = calc(overrides); assert.equal(r.hpChangeRequest, expected); assert.equal(r.stacksConsumed,3);
  }
});
test('command exclusions and internal Pure category do not consume stacks', () => {
  for (const overrides of [{hasState66314:true},{hasState62317:true},{triggerEligible:false},{damageType:'PURE'},{damageType:'HP_REMOVE'}]) {
    const r = calc(overrides); assert.equal(r.hpChangeRequest,null); assert.equal(r.stacksConsumed,0);
  }
});
test('unknown state is rejected instead of silently made neutral', () => {
  assert.throws(() => oldEmbersCommand({}), /Missing/);
  assert.throws(() => calc({build:'android'}), /Unsupported/);
  assert.throws(() => calc({remainingStacks:1.5}), /integer/);
  assert.throws(() => calc({realDamage:3}), /unknown/);
});
