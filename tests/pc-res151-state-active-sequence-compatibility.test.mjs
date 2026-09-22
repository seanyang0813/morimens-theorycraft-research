import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(readFileSync('research/evidence/pc-res151-state-active-sequence-compatibility.json','utf8'));

test('resource 151 state-to-Active support binds direct mutation runtime and the exact Active boundary',()=>{
  assert.equal(report.kind,'MORIMENS_PC_STATE_ACTIVE_SEQUENCE_COMPATIBILITY');assert.equal(report.build,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_BY_DIRECT_RUNTIME_AND_EXACT_COMPOSITION');assert.equal(report.operation,'run-prepared-state-active-sequence');
  assert.deepEqual(report.directRuntime,{fixtures:432,exactMatches:432,mismatches:0});
  assert.equal(report.composedEvidence.catalogSemanticChanges,0);assert.equal(report.composedEvidence.activeClientModuleDependencies,6);assert.equal(report.composedEvidence.activeConfigDependencies,5);
  for(const name of ['BattleConst','BattleUtilServer','BattleCmdServer','BattleStateServer','BattlePropertyServer'])assert.equal(report.sourceHashes[`current${name}`],sha(readFileSync(`research/observations/current-res151-build51/modules/${name}.lua`)));
  assert.ok(report.limitations.some(value=>value.includes('No gameplay, prediction or holdout credit')));
});
