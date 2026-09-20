import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {passivePreHit} from '../engine/passive-prehit.mjs';
const suite = JSON.parse(readFileSync(new URL('./synthetic/original-passive-runtime.json', import.meta.url)));
test('Passive pre-hit matches original effect and base rounding methods', () => {
  assert.equal(suite.kind, 'SYNTHETIC_ORIGINAL_RUNTIME');
  assert.equal(suite.fixtures.length, 1052);
  for (const fixture of suite.fixtures) {
    const result = passivePreHit({build: suite.build, ...fixture.input});
    assert.equal(result.preHitDamage, fixture.expected, fixture.id);
    assert.equal(result.finalDamage, null);
    assert.equal(result.status, 'UNVERIFIED');
  }
});
test('Unresolved Passive inputs cannot silently become neutral', () => {
  const input = {build:suite.build, ...suite.fixtures[0].input};
  for (const k of Object.keys(input)) {
    const missing = {...input}; delete missing[k];
    assert.throws(() => passivePreHit(missing));
  }
  assert.throws(() => passivePreHit({...input, build:'android'}));
  assert.throws(() => passivePreHit({...input, passive1:NaN}));
  assert.throws(() => passivePreHit({...input, unexpected:0}));
});
