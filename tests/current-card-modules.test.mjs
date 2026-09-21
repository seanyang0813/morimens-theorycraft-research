import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-card-modules.json',import.meta.url)));

test('current card-path module comparison isolates the changed player module',()=>{
  assert.equal(report.baselineBuild,'pc-res144-build51');
  assert.equal(report.currentBuild,'pc-res150-build51');
  assert.equal(report.modules.length,6);
  assert.deepEqual(report.modules.filter(row=>row.status!=='IDENTICAL').map(row=>row.name),['BattleUnitPlayer.lua']);
  assert.equal(report.modules.find(row=>row.name==='BattleUnitBase.lua').status,'IDENTICAL');
  assert.equal(report.modules.find(row=>row.name==='BEBeforeUseCard.lua').status,'IDENTICAL');
});
