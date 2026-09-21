import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('sanitized 42-replay Active audit stays retrospective and track isolated',()=>{
  const text=readFileSync('research/evidence/replay-corpus-active-audit.json','utf8');
  const report=JSON.parse(text);
  assert.equal(report.kind,'MORIMENS_SANITIZED_REPLAY_CORPUS_ACTIVE_AUDIT');
  assert.equal(report.analysisTrack,'verification');
  assert.equal(report.status,'RETROSPECTIVE_CONSISTENCY_ONLY');
  assert.equal(report.publicationCredit,false);
  assert.equal(report.identifiersPublished,false);
  assert.equal(report.rawArtifactsPublished,false);
  assert.deepEqual(report.totals,{
    replays:42,
    completeHitSnapshots:1804,
    retrospectiveActiveCandidates:428,
    deterministicExactChecks:269,
    exactRngBranchConsistencyChecks:159,
    deterministicMismatches:0,
    rngBranchMismatches:0
  });
  assert.equal(report.replays.length,42);
  assert.ok(report.replays.every(row=>/^replay-batch-\d{2}$/.test(row.observationId)&&row.deterministicMismatches===0&&row.rngBranchMismatches===0));
  assert.match(report.trackBoundary,/does not establish a cheese strategy/i);
  assert.match(report.trackBoundary,/optimal theorycraft sequence/i);
  assert.doesNotMatch(text,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});
