import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-skill-phase-modules.json',import.meta.url)));

test('current skill-phase comparison isolates changed command modules',()=>{
  assert.equal(report.baselineBuild,'pc-res144-build51');
  assert.equal(report.currentBuild,'pc-res150-build51');
  assert.deepEqual(report.modules.filter(row=>row.status!=='IDENTICAL').map(row=>row.name),['BattleCmdServer.lua','BattleCmdParser.lua']);
  for(const name of ['BEGenerateTargets.lua','BECreateSkillPhase.lua','BattleCmdTargetsExp.lua','BattleEffectServer.lua','BattleEffectMgrServer.lua'])assert.equal(report.modules.find(row=>row.name===name).status,'IDENTICAL');
});
