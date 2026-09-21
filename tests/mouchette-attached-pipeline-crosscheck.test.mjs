import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/mouchette-attached-pipeline-crosscheck.json',import.meta.url)));
test('catalog-driven attached pipeline exactly reproduces the prior pursuit component',()=>{
  assert.equal(report.status,'EXACT_CASE_STUDY_COMPONENT_MATCH');assert.deepEqual(report.result.baseArguments,[78,3]);assert.deepEqual(report.result.hits,[4489,4489,4489]);assert.equal(report.result.modeledHpLost,13467);assert.equal(report.result.priorPursuitTotal,13467);assert.equal(report.result.strikeDamagePropertyAfter,25);assert.equal(report.result.commandRowsCompleted,true);
});
