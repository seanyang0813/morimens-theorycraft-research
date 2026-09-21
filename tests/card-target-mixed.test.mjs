import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeTargetDamage} from '../engine/active-target.mjs';

const data=JSON.parse(readFileSync(new URL('./synthetic/original-card-target-mixed.json',import.meta.url)));
for(const fixture of data.fixtures){
  assert.equal(activeTargetDamage(fixture.showDamage,fixture.input).preHitDamage,fixture.expected);
}
