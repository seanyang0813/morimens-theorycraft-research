import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(readFileSync('research/evidence/pc-res151-prepared-block-compatibility.json','utf8'));

test('resource 151 prepared Defend support combines direct Block runtime with exact energy and catalog evidence',()=>{
  assert.equal(report.kind,'MORIMENS_PC_PREPARED_BLOCK_BUILD_COMPATIBILITY');assert.equal(report.build,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_BY_DIRECT_RUNTIME_AND_EXACT_COMPOSITION');assert.equal(report.operation,'run-prepared-snapshot-block-skill');
  assert.deepEqual(report.directRuntime,{calculation:{fixtures:256,exactMatches:256,mismatches:0},storage:{fixtures:160,exactMatches:160,mismatches:0},fixtures:416,mismatches:0});
  assert.equal(report.composedEvidence.catalogSemanticChanges,0);assert.equal(report.composedEvidence.ultimateEnergyFixtures,516);assert.equal(report.composedEvidence.ultimateEnergyMismatches,0);
  for(const name of ['BattleConst','BattleUtilServer','BattleCmdServer','BattlePropertyServer'])assert.equal(report.sourceHashes[`current${name}`],sha(readFileSync(`research/observations/current-res151-build51/modules/${name}.lua`)));
  assert.ok(report.limitations.some(value=>value.includes('No gameplay, prediction or holdout credit')));
});
