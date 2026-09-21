import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-generated-card-modules.json',import.meta.url)));

test('current generated-card modules are byte-identical to the tested baseline',()=>{
  assert.equal(report.schemaVersion,1);assert.equal(report.kind,'MORIMENS_PC_GENERATED_CARD_MODULE_COMPARISON');assert.equal(report.baselineBuild,'pc-res144-build51');assert.equal(report.currentBuild,'pc-res150-build51');assert.equal(report.status,'IDENTICAL');
  assert.deepEqual(report.modules.map(row=>row.name),['BECreateCard.lua','BattleCardMgrServer.lua','BattleCardServer.lua']);assert.ok(report.modules.every(row=>row.status==='IDENTICAL'&&row.baseline.sha256===row.current.sha256&&row.baseline.size===row.current.size));
});
