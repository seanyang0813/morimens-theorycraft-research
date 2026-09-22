import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/wheel-state-crosswalk-audit.json',import.meta.url)));

test('Wheel state crosswalk is mechanics-only and fails closed on ambiguous joins',()=>{
  assert.equal(report.analysisTrack,'mechanics');
  assert.equal(report.status,'STATIC_CATALOG_CROSSWALK');
  assert.deepEqual(report.summary,{
    wheelCount:146,wheelIconAssetCount:146,clientWeaponRowCount:181,
    uniqueMatches:141,missingMatches:1,ambiguousMatches:4,
    uniqueMatchesWithInitialState:141,uniqueMatchesWithStateParameters:141,
  });
  assert.equal(report.caseStudyBoundary.length,4);
  assert.ok(report.caseStudyBoundary.every(row=>row.matchStatus==='UNIQUE' && Number.isInteger(row.initialStateId) && row.parameterSlotCount>0));
  assert.deepEqual(report.initialStateGraph,{
    resolvedInitialStates:141,initialStatesWithDirectProperties:63,
    triggerCommandReferences:229,uniqueTriggerCommands:190,unresolvedTriggerCommands:0,
    initialStateTriggerCountHistogram:{0:4,1:75,2:38,3:18,4:6},
    judgementExpressionsPresent:104,
  });
  assert.ok(report.limitations.some(row=>row.includes('no cheese')));
});
