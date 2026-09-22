import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/wheel-initial-property-audit.json',import.meta.url)));
test('initial Wheel property audit covers every observed direct expression without publishing rows',()=>{
  assert.equal(report.analysisTrack,'mechanics');
  assert.equal(report.status,'OBSERVED_GRAMMAR_COVERED');
  assert.deepEqual(report.summary,{uniqueCrosswalkedWheels:141,ownerTargetRows:141,initialStatesWithDirectProperties:63,directPropertyEntries:100,uniquePropertyNames:33,unsupportedExpressions:0});
  assert.deepEqual(report.expressionClasses,{StateArg1:73,StateArg2:12,StateArg3:9,StateArg4:1,explicitAttackScalingWithCeil:1,explicitPhysiqueScaling:2,numericLiteral:2});
  assert.ok(report.limitations.some(value=>value.includes('not connected execution')));
});
