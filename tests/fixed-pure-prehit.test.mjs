import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixedPurePreHit} from '../engine/fixed-pure-prehit.mjs';

for (const category of ['Fixed', 'Pure']) {
  const data = JSON.parse(fs.readFileSync(new URL('./synthetic/original-' + category.toLowerCase() + '-runtime.json', import.meta.url), 'utf8'));
  test(category + ' pre-hit matches original runtime (' + data.fixtures.length + ' cases)', () => {
    for (const build of ['pc-res144-build51','pc-res150-build51','pc-res151-build51']) {
      for (const row of data.fixtures) {
        const input = {...row.input, category: category.toUpperCase(), build};
        // Pure has no dimension modifier; the original oracle varied it to test independence.
        if (category === 'Pure') delete input.dimensionFixPer;
        const result = fixedPurePreHit(input);
        assert.equal(result.preHitDamage, row.expected, `${build}: ${row.id}`);
        assert.equal(result.finalDamage, null);
        assert.equal(result.evidenceFixture,build==='pc-res144-build51'?`tests/synthetic/original-${category.toLowerCase()}-runtime.json`:'research/evidence/pc-res151-fixed-pure-runtime.json');
      }
    }
  });
}
test('Pure rejects unrelated multipliers and incomplete inputs', () => {
  const input = {build: 'pc-res144-build51', category: 'PURE', targetDead: false, baseDamage: 2.2};
  assert.equal(fixedPurePreHit(input).preHitDamage, 3);
  assert.throws(() => fixedPurePreHit({...input, dimensionFixPer: 100}));
  assert.throws(() => fixedPurePreHit({...input, baseDamage: NaN}));
  assert.throws(() => fixedPurePreHit({...input, build: 'android'}));
  assert.throws(() => fixedPurePreHit({...input, category: 'FIXED'}));
});
