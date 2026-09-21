import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url));
const report=JSON.parse(read('research/evidence/current-catalog-gameplay-consistency.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('current-catalog gameplay report is a retrospective verification-track join without publication credit',()=>{
  assert.equal(report.analysisTrack,'verification');
  assert.equal(report.status,'RETROSPECTIVE_CURRENT_CATALOG_ENGINE_VERSION_UNCONFIRMED');
  assert.equal(report.publicationCredit,false);
  assert.equal(report.sourceHashes.replayBatchRecovery,sha(read('research/evidence/replay-batch-recovery.json')));
  assert.equal(report.sourceHashes.replayCatalogBuildAttribution,sha(read('research/evidence/replay-catalog-build-attribution.json')));
  assert.deepEqual(report.replays.map(row=>row.observationId),['replay-batch-02','replay-batch-10']);
  assert.deepEqual(report.totals,{
    auditedReplays:2,completeHitSnapshots:79,retrospectiveActiveCandidates:13,
    deterministicExactChecks:0,deterministicMismatches:0,
    exactRngBranchConsistencyChecks:13,rngBranchMismatches:0,
  });
  assert.ok(report.replays.every(row=>row.currentExclusiveCatalogRows>0&&row.unmatchedCatalogRows===0));
  assert.match(report.limitations.at(-1),/No holdout/);
});
