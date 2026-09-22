import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync('research/evidence/pc-res151-replay-adapter-compatibility.json','utf8'));

test('resource 151 replay adapter support is limited to an exact dependency carry-forward',()=>{
  assert.equal(report.kind,'MORIMENS_PC_REPLAY_ADAPTER_BUILD_COMPATIBILITY');
  assert.equal(report.beforeBuild,'pc-res150-build51');assert.equal(report.afterBuild,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD');
  assert.deepEqual(report.clientModuleDependencies.map(row=>row.name),['BattleConst.lua','BattleUtilServer.lua','BattleCmdServer.lua','BattleUnitBase.lua','BattlePropertyServer.lua','BEActiveDamage.lua']);
  assert.ok(report.clientModuleDependencies.every(row=>row.status==='IDENTICAL'));
  assert.deepEqual(report.configDependencies,['Skill','Cmd','State','BattleApi','Constant']);
  assert.equal(report.sourceEvidence.resource150Runtime.length,5);
  assert.ok(report.limitations.some(value=>value.includes('general simulator')));
  assert.ok(report.limitations.some(value=>value.includes('no gameplay agreement')));
});
