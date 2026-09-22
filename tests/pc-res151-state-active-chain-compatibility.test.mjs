import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(readFileSync('research/evidence/pc-res151-state-active-chain-compatibility.json','utf8'));

test('resource 151 ordered state-to-Active support stays inside the singular and schema-1/4 boundaries',()=>{
  assert.equal(report.kind,'MORIMENS_PC_STATE_ACTIVE_CHAIN_COMPATIBILITY');assert.equal(report.build,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_BY_EXACT_COMPONENT_COMPOSITION');assert.equal(report.operation,'run-prepared-state-active-chain');
  assert.equal(report.composedEvidence.directStateMutationFixtures,432);assert.equal(report.composedEvidence.directStateMutationMismatches,0);
  assert.deepEqual(report.composedEvidence.supportedActiveSchemas,[1,4]);assert.equal(report.composedEvidence.installedExampleActions,5);assert.deepEqual(report.composedEvidence.installedExampleSchemas,[1]);
  assert.equal(report.sourceHashes.chainEngine,sha(readFileSync('engine/prepared-state-active-chain.mjs')));
  assert.ok(report.limitations.some(value=>value.includes('No gameplay, prediction or holdout credit')));
});
