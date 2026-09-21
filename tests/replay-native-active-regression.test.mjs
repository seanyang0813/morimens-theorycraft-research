import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateSnapshotActiveDamage} from '../engine/battle-property-snapshot-damage.mjs';

const evidence=JSON.parse(readFileSync('research/evidence/replay-003-active-branches.json','utf8'));

test('sanitized native replay branches reproduce observed Mouchette cast damage',()=>{
  assert.equal(evidence.retrospective,true);assert.equal(evidence.holdout,false);assert.equal(evidence.recordedCombatBuild,null);
  const results=evidence.cases.map(row=>calculateSnapshotActiveDamage(row.scenario).preHitDamage);
  assert.deepEqual(results,[751,2028]);assert.deepEqual(results,evidence.cases.map(row=>row.observedCastDamage));
});

test('native replay branch evidence contains no replay or player identifier',()=>{
  const text=JSON.stringify(evidence);assert.doesNotMatch(text,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.equal(evidence.rngProvenance.includes('not recovered original RNG draws'),true);
});
