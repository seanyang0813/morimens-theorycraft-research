import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(readFileSync('research/evidence/pc-res151-ulti-energy-compatibility.json','utf8'));

test('resource 151 ultimate-energy support has a complete exact dependency boundary',()=>{
  assert.equal(report.kind,'MORIMENS_PC_ULTI_ENERGY_BUILD_COMPATIBILITY');
  assert.equal(report.beforeBuild,'pc-res150-build51');assert.equal(report.afterBuild,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_BY_EXACT_DEPENDENCY_CARRYFORWARD');assert.equal(report.operation,'run-ulti-energy-effect');
  assert.deepEqual(report.modules.map(row=>row.name),['BattleConst.lua','BattleUtilServer.lua','BattleCmdServer.lua','BattlePropertyServer.lua','BattleEffectServer.lua','BEGainUltiEnergy.lua','BattleUnitAwaker.lua']);
  assert.ok(report.modules.every(row=>row.status==='IDENTICAL'&&row.before.sha256===row.after.sha256));
  for(const row of report.modules){
    assert.equal(row.before.sha256,sha(readFileSync(`research/observations/current-res150-build51/modules/${row.name}`)));
    assert.equal(row.after.sha256,sha(readFileSync(`research/observations/current-res151-build51/modules/${row.name}`)));
  }
  assert.equal(report.resource150Runtime.fixtures,516);assert.equal(report.resource150Runtime.mismatches,0);
  assert.deepEqual(Object.fromEntries(Object.entries(report.resource150Runtime.domains).map(([name,row])=>[name,row.fixtures])),{calculation:144,effect:120,gainStorage:252});
  assert.ok(report.limitations.some(value=>value.includes('No prediction or holdout credit')));
});
