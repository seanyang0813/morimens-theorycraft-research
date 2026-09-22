import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/wheel-refinement-runtime-audit.json',import.meta.url)));

test('Wheel refinement parameter arithmetic matches the original runtime',()=>{
  assert.equal(report.analysisTrack,'mechanics');
  assert.equal(report.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(report.uniqueExpressions,63);
  assert.equal(report.dynamicExpressionsComparedToOriginalRuntime,58);
  assert.equal(report.uniqueNumericLiterals,5);
  assert.deepEqual(report.refinementLevels,[0,1,2,3]);
  assert.equal(report.fixtures,232);
  assert.equal(report.mismatches,0);
  assert.ok(report.limitations.some(value=>value.includes('no theorycraft recommendation')));
  assert.equal('expressions' in report,false);
});
