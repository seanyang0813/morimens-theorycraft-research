import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));

test('resource 151 is identified separately with an exact tracked-module carry-forward',()=>{
  const build=read('research/evidence/pc-res144-to-res151-combat-build.json');
  const carry=read('research/evidence/pc-res150-to-res151-combat-carryforward.json');
  const baseline=read('research/evidence/current-session-replay-baseline-002.json');
  assert.equal(build.currentBuild,'pc-res151-build51');assert.equal(build.currentVersion.resVersion,151);
  assert.equal(carry.status,'TRACKED_COMBAT_MODULES_IDENTICAL');assert.equal(carry.moduleCount,15);
  assert.ok(carry.modules.every(row=>row.status==='IDENTICAL'));
  assert.equal(baseline.build.id,'pc-res151-build51');assert.equal(baseline.status,'COMMITTED_PRE_BATTLE_BASELINE');
  assert.equal(baseline.privateBaselineCommitment.identifiersPublished,false);
});
